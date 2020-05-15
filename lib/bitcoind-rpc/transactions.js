/*!
 * lib/bitcoind-rpc/transactions.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const _ = require('lodash')
const LRU = require('lru-cache')
const errors = require('../errors')
const Logger = require('../logger')
const util = require('../util')
const RpcClient = require('./rpc-client')
const rpcLatestBlock = require('./latest-block')


/**
 * A singleton providing information about transactions
 */
class Transactions {

  /**
   * Constructor
   */
  constructor() {
    // Caches
    this.prevCache = LRU({
      // Maximum number of transactions to store
      max: 100000,
      // Function used to compute length of item
      length: (n, key) => 1,
      // Maximum age for items in the cache. Items do not expire
      maxAge: Infinity
    })


    // Initialize the rpc client
    this.rpcClient = new RpcClient()
  }

  /**
   * Get the transactions for a given array of txids
   * @param {string[]} txids - txids of the transaction to be retrieved
   * @param {boolean} fees - true if fees must be computed, false otherwise
   * @returns {Promise} return an array of transactions (object[])
   */
  async getTransactions(txids, fees) {
    try {
      const rpcCalls = txids.map(txid => {
        return {
          'method': 'getrawtransaction',
          'params': [txid, true]
        }
      })

      const txs = await this.rpcClient.batch(rpcCalls)

      return await util.seriesCall(txs, async tx => {
        if (tx.result == null) {
          Logger.info(`Bitcoind RPC :  got null for ${txids[tx.id]}`)
          return null
        } else {
          return this._prepareTxResult(tx.result, fees)
        }
      })

    } catch(e) {
      Logger.error(e, 'Bitcoind RPC : Transaction.getTransactions()')
      return Promise.reject(errors.generic.GEN)
    }
  }

  /**
   * Get the transaction for a given txid
   * @param {string} txid - txid of the transaction to be retrieved
   * @param {boolean} fees - true if fees must be computed, false otherwise
   * @returns {Promise}
   */
  async getTransaction(txid, fees) {
    try {
      const tx = await this.rpcClient.getrawtransaction(txid, true)
      return this._prepareTxResult(tx)
    } catch(e) {
      Logger.error(e, 'Bitcoind RPC : Transaction.getTransaction()')
      return Promise.reject(errors.generic.GEN)
    }
  }

  /**
   * Formats a transaction object returned by the RPC API
   * @param {object} tx - transaction
   * @param {boolean} fees - true if fees must be computed, false otherwise
   * @returns {Promise} return an array of inputs (object[])
   */
  async _prepareTxResult(tx, fees) {
    const ret = {
      txid: tx.txid,
      size: tx.size,
      vsize: tx.vsize,
      version: tx.version,
      locktime: tx.locktime,
      inputs: [],
      outputs: []
    }

    if (!ret.vsize)
      delete ret.vsize

    if (tx.time)
      ret.created = tx.time

    // Process block informations
    if (tx.blockhash && tx.confirmations && tx.blocktime) {
      ret.block = {
        height: rpcLatestBlock.height - tx.confirmations + 1,
        hash: tx.blockhash,
        time: tx.blocktime
      }
    }

    let inAmount = 0
    let outAmount = 0

    // Process the inputs
    ret.inputs = await this._getInputs(tx, fees)
    inAmount = ret.inputs.reduce((prev, cur) => prev + cur.outpoint.value, 0)

    // Process the outputs
    ret.outputs = await this._getOutputs(tx)
    outAmount = ret.outputs.reduce((prev, cur) => prev + cur.value, 0)

    // Process the fees (if needed)
    if (fees) {
      ret.fees = inAmount - outAmount
      if (ret.fees > 0 && ret.size)
        ret.feerate = Math.round(ret.fees / ret.size)
      if (ret.fees > 0 && ret.vsize)
        ret.vfeerate = Math.round(ret.fees / ret.vsize)
    }

    return ret
  }


  /**
   * Extract information about the inputs of a transaction
   * @param {object} tx - transaction
   * @param {boolean} fees - true if fees must be computed, false otherwise
   * @returns {Promise} return an array of inputs (object[])
   */
  async _getInputs(tx, fees) {
    const inputs = []
    let n = 0

    await util.seriesCall(tx.vin, async input => {
      const txin = {
        n,
        seq: input.sequence,
      }

      if (input.coinbase) {
        txin.coinbase = input.coinbase
      } else {
        txin.outpoint = {
          txid: input.txid,
          vout: input.vout
        }
        txin.sig = input.scriptSig.hex
      }

      if (input.txinwitness)
        txin.witness = input.txinwitness

      if (fees && txin.outpoint) {
        const inTxid = txin.outpoint.txid
        let ptx

        if (this.prevCache.has(inTxid)) {
          ptx = this.prevCache.get(inTxid)
        } else {
          ptx = await this.rpcClient.getrawtransaction(inTxid, true)
          if (ptx.blockhash && ptx.confirmations && ptx.blocktime) {
            ptx.height = rpcLatestBlock.height - ptx.confirmations + 1
            this.prevCache.set(inTxid, ptx)
          }
        }

        const outpoint = ptx.vout[txin.outpoint.vout]
        txin.outpoint.value = Math.round(outpoint.value * 1e8)
        txin.outpoint.scriptpubkey = outpoint.scriptPubKey.hex
        inputs.push(txin)
        n++

      } else {
        inputs.push(txin)
        n++
      }
    })
    
    return inputs
  }

  /**
   * Extract information about the outputs of a transaction
   * @param {object} tx - transaction
   * @returns {Promise} return an array of outputs (object[])
   */
  async _getOutputs(tx) {
    const outputs = []
    let n = 0

    for (let output of tx.vout) {
      const pk = output.scriptPubKey
      const amount = Math.round(output.value * 1e8)

      let o = {
        n,
        value: amount,
        scriptpubkey: pk.hex,
        type: pk.type
      }

      if (pk.addresses) {
        if (pk.addresses.length == 1)
          o.address = pk.addresses[0]
        else
          o.addresses = pk.addresses
      }

      outputs.push(o)
      n++
    }

    return outputs
  }

}

module.exports = new Transactions()
