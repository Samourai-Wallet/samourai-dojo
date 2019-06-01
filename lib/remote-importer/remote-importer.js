/*!
 * lib/remote-importer/remote-importer.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const _ = require('lodash')
const Logger = require('../logger')
const errors = require('../errors')
const util = require('../util')
const db = require('../db/mysql-db-wrapper')
const rpcTxns = require('../bitcoind-rpc/transactions')
const hdaHelper = require('../bitcoin/hd-accounts-helper')
const network = require('../bitcoin/network')
const keys = require('../../keys')[network.key]
const gap = keys.gap

let Sources

if (network.key == 'bitcoin') {
  Sources = require('./sources-mainnet')
} else {
  Sources = require('./sources-testnet')
}


/**
 * A singleton providing tools 
 * for importing HD and loose addresses from remote sources
 */
class RemoteImporter {

  /**
   * Constructor
   */
  constructor() {
    // Guard against overlapping imports
    this.importing = {}
    this.sources = new Sources()
  }

  /**
   * Clear the guard
   * @param {string} xpub - HDAccount
   */
  clearGuard(xpub) {
    if (this.importing[xpub])
      delete this.importing[xpub]
  }

  /**
   * Process the relations between a list of transactions
   * @param {object[]} txs - array of transaction objects
   * @returns {object} returns a object with 3 mappings
   *    {txMap: {], txChildren: {}, txParents: {}}
   */
  _processTxsRelations(txs) {
    const txMap = {}
    const txChildren = {}
    const txParents = {}

    for (let tx of txs) {
      let txid = tx.txid

      // Populate txMap
      txMap[txid] = tx

      // Create parent-child transaction associations
      if (!txChildren[txid])
        txChildren[txid] = []

      if (!txParents[txid])
        txParents[txid] = []
      
      for (let i in tx.inputs) {
        const input = tx.inputs[i]
        let prev = input.outpoint.txid
        if (!txMap[prev]) continue

        if (txParents[txid].indexOf(prev) == -1)
          txParents[txid].push(prev)

        if (!txChildren[prev])
          txChildren[prev] = []

        if (txChildren[prev].indexOf(txid) == -1)
          txChildren[prev].push(txid)
      }
    }

    return {
      txMap: txMap,
      txChildren: txChildren,
      txParents: txParents
    }
  }

  /**
   * Import a list of transactions associated to a list of addresses
   * @param {object[]} addresses - array of addresses objects
   * @param {object[]} txns - array of transaction objects
   * @returns {Promise} 
   */
  async _importTransactions(addresses, txns) {
    const addrIdMap = await db.getAddressesIds(addresses)

    // The transactions array must be topologically ordered, such that 
    // entries earlier in the array MUST NOT depend upon any entry later 
    // in the array.
    const txMaps = this._processTxsRelations(txns)
    const txOrdered = util.topologicalOrdering(txMaps.txParents, txMaps.txChildren)
    const aTxs = []

    for (let txid of txOrdered)
      if (txMaps.txMap[txid])
        aTxs.push(txMaps.txMap[txid])

    return util.seriesCall(aTxs, tx => this.addTransaction(tx, addrIdMap))
  }

  /**
   * Import an HD account from remote sources
   * @param {string} xpub - HD Account
   * @param {string} type - type of HD Account
   * @param {integer} gapLimit - (optional) gap limit for derivation
   * @param {integer} startIndex - (optional) rescan shall start from this index
   */
  async importHDAccount(xpub, type, gapLimit, startIndex) {
    if (!hdaHelper.isValid(xpub))
      return Promise.reject(errors.xpub.INVALID)

    if (this.importing[xpub]) {
      Logger.info(` Import overlap for ${xpub}`)
      return Promise.reject(errors.xpub.OVERLAP)
    }

    this.importing[xpub] = true

    const ts = hdaHelper.typeString(type)
    Logger.info(`Importing ${xpub} ${ts}`)

    const t0 = Date.now()
    const chains = [0,1]

    let gaps = [gap.external, gap.internal]
    // Allow custom higher gap limits
    // for local scans relying on bitcoind
    if (gapLimit && keys.explorers.bitcoind)
      gaps = [gapLimit, gapLimit]

    startIndex = (startIndex == null) ? -1 : startIndex - 1

    const addrIdMap = {}
    let txns = []
    let addresses = []

    try {
      const results = await util.seriesCall(chains,  chain => {
        return this.xpubScan(xpub, chain, startIndex, startIndex, gaps[chain], type)
      })

      // Accumulate addresses and transactions from all chains
      for (let result of results) {
        txns = txns.concat(result.transactions)
        addresses = addresses.concat(result.addresses)
      }

      // Store the hdaccount and the addresses into the database
      await db.ensureHDAccountId(xpub, type)
      await db.addAddressesToHDAccount(xpub, addresses)

      // Store the transaction into the database
      const aAddresses = addresses.map(a => a.address)
      await this._importTransactions(aAddresses, txns)

    } catch(e) {
      Logger.error(e, `RemoteImporter.importHDAccount() : xpub ${xpub}`)
    } finally {
      Logger.info(` xpub import done in ${((Date.now() - t0)/1000).toFixed(1)}s`)
      delete this.importing[xpub]
      return true
    }
  }

  /**
   * Recursive scan of xpub addresses & transactions
   *
   * 0. HD chain       c on [0,1]
   *    Gap limit      G
   *    Last derived   d = -1
   *    Last used      u = -1
   * 1. Derive addresses M/c/{A}, with A on [d+1, u+G], set d = u + G
   * 2. Look up transactions T for M/c/{A} from remote
   * 3. If |T| = 0, go to 5
   * 4. Set u = highest chain index of used address, go to 1
   * 5. Store all in database
   *
   * @returns {object} returns 
   *  {
   *    addresses: [{address, chain, index}],
   *    transactions: [{
   *      txid, 
   *      version, 
   *      locktime,
   *      created,  // if known
   *      block: 'abcdef',  // if confirmed
   *      outputs: [{index, amount, script, address}],
   *      inputs: [{index,outpoint:{txid,index},seq}]
   *    }],
   *  }
   */
  async xpubScan(xpub, c, d, u, G, type, txids) {
    txids = txids || {}

    const ret  = {
      addresses: [],
      transactions: [],
    }

    // Check that next derived isn't after last used + gap limit
    if (d + 1 > u + G) return ret

    // Derive the required number of new addresses
    const A = _.range(d + 1, u + G + 1)
    ret.addresses = await hdaHelper.deriveAddresses(xpub, c, A, type)

    // Update derived index
    d = u + G
    Logger.info(` derived M/${c}/${A.join(',')}`)

    const addrMap = {}
    for (let a of ret.addresses)
      addrMap[a.address] = a

    const aAddresses = ret.addresses.map(a => a.address)

    try {
      const results = await this.sources.getAddresses(aAddresses)

      let gotTransactions = false
      const scanTx = []

      for (let r of results) {
        if (r.ntx == 0) continue

        // Address is used. Update used parameter
        u = Math.max(u, addrMap[r.address].index)
        gotTransactions = true
        // TODO: Handle pathological case of many address transactions
        while (r.txids.length > 0) {
          let txid = r.txids.pop()
          if (!txids[txid])
            scanTx.push(txid)
        }
      }

      Logger.info(` Got ${scanTx.length} transactions`)

      await util.seriesCall(scanTx, async txid => {
        try {
          const tx = await rpcTxns.getTransaction(txid, false)
          if (tx == null) {
            Logger.info(`   got null for ${txid}`)
            return null
          }
          ret.transactions.push(tx)
          txids[tx.txid] = true
        } catch(e) {
          Logger.error(e, `RemoteImporter.xpubScan() : rawTransaction error, txid ${txid}`)
        }
      })

      if (gotTransactions) {
        // We must go deeper
        const result = await this.xpubScan(xpub, c, d, u, G, type, txids)
        // Accumulate results from further down the rabbit hole
        for (let a of result.addresses)
          ret.addresses.push(a)
        for (let t of result.transactions)
          ret.transactions.push(t)
      }

    } catch(e) {
      Logger.error(e, `RemoteImporter.xpubScan() : xpub ${xpub} ${c} ${d} ${u} ${G}`)
    } finally {
      // Push everything up the rabbit hole
      return ret
    }
  }

  /**
   * Import a list of addresses
   * @param {string[]} candidates - addresses to be imported
   * @param {boolean} filterAddr - True if addresses should be filtered, False otherwise
   */
  async importAddresses(candidates, filterAddr) {
    const t0 = Date.now()
    const txns = []
    const addresses = []
    const imported = []

    for (let address of candidates) {
      if (!this.importing[address]) {
        addresses.push(address)
        this.importing[address] = true
      } else {
        Logger.info(`Note: Import overlap for ${address}. Skipping`)
      }
    }

    if (addresses.length == 0)
      return true

    Logger.info(`Importing ${addresses.join(',')}`)
    
    try {
      const scanTx = []
      const results = await this.sources.getAddresses(addresses, filterAddr)

      for (let r of results) {
        // Mark the address as imported
        imported.push(r.address)
        if (r.ntx == 0) continue
        // TODO: Handle pathological case of many address transactions
        while (r.txids.length > 0) {
          let txid = r.txids.pop()
          if (scanTx.indexOf(txid) == -1)
            scanTx.push(txid)
        }
      }

      Logger.info(` Got ${scanTx.length} transactions`)

      // Get transaction s data from bitcoind
      await util.seriesCall(scanTx, async txid => {
        const tx = await rpcTxns.getTransaction(txid, false)
        if (tx == null) {
          Logger.info(`   got null for ${txid}`)
          return null
        }
        txns.push(tx)
      })

      // Import addresses and transactions into the database
      await db.addAddresses(imported)
      await this._importTransactions(addresses, txns)

    } catch(e) {
      Logger.error(e, `RemoteImporter.importAddresses() : ${candidates.join(',')}`)

    } finally {
      const dt = Date.now() - t0
      const ts = (dt/1000).toFixed(1)
      const N = addresses.length

      if (N > 0)
        Logger.info(` Imported ${N} addresses in ${ts}s (${(dt/N).toFixed(0)} ms/addr)`)
      
      for (let address of addresses)
        delete this.importing[address]

      return true
    }
  }

  /**
   * Add a transaction to the database.
   * @param {object} tx - transaction object
   * @params {Promise}
   */
  async addTransaction(tx, addrIdMap) {
    const outputs = []

    try {
      // Store the transaction into the database
      await db.addTransaction(tx)

      // Confirm the transaction
      if (tx.block) {
        const block = await db.getBlockByHash(tx.block.hash)
        if (block)
          await db.confirmTransactions([tx.txid], block.blockID)
      }

      // Retrieve the database id for the transaction
      let txnID = await db.ensureTransactionId(tx.txid)

      // Process the outputs
      for (let output of tx.outputs) {
        if (addrIdMap[output.address]) {
          outputs.push({
            txnID,
            addrID: addrIdMap[output.address],
            outIndex: output.n,
            outAmount: output.value,
            outScript: output.scriptpubkey,
          })
        }
      }

      await db.addOutputs(outputs)

      // Process the inputs
      // Get any outputs spent by the inputs of this transaction, add those
      // database outIDs to the corresponding transaction inputs, and store.
      const res = await db.getOutputIds(tx.inputs.map(input => input.outpoint))

      const spent = {}
      const inputs = []

      for (let r of res)
        spent[`${r.txnTxid}-${r.outIndex}`] = r.outID

      for (let input of tx.inputs) {
        let key = `${input.outpoint.txid}-${input.outpoint.vout}`
        if (spent[key]) {
          inputs.push({
            outID: spent[key],
            txnID,
            inIndex: input.n,
            inSequence: input.seq
          })
        }
      }

      await db.addInputs(inputs)

    } catch(e) {
      Logger.error(e, `RemoteImporter.addTransaction() : xpub ${tx.txid}`)
      Logger.error(null, JSON.stringify(tx,null,2))
    }
  }

}

module.exports = new RemoteImporter()
