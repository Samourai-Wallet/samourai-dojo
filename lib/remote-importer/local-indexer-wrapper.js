/*!
 * lib/remote-importer/local-indexer-wrapper.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const bitcoin = require('bitcoinjs-lib')
const Logger = require('../logger')
const network = require('../bitcoin/network')
const activeNet = network.network
const keys = require('../../keys')[network.key]
const RpcClient = require('../indexer-rpc/rpc-client')
const Wrapper = require('./wrapper')


/**
 * Wrapper for a local indexer
 * Currently supports indexers
 * providing a RPC API compliant 
 * with a subset of the electrum protocol
 */
class LocalIndexerWrapper extends Wrapper {

  /**
   * Constructor
   */
  constructor() {
    super(null, null)
    // RPC client
    this.client = new RpcClient()
  }

  /**
   * Translate a bitcoin address into a script hash
   * (@see https://electrumx.readthedocs.io/en/latest/protocol-basics.html#script-hashes)
   * @param {string} address - bitcoin address
   * @returns {string} returns the script hash associated to the address
   */
  _getScriptHash(address) {
    const bScriptPubKey = bitcoin.address.toOutputScript(address, activeNet)
    const bScriptHash = bitcoin.crypto.sha256(bScriptPubKey)
    return bScriptHash.reverse().toString('hex')
  }

  /**
   * Retrieve information for a given address
   * @param {string} address - bitcoin address
   * @param {boolean} filterAddr - True if an upper bound should be used
   *     for #transactions associated to the address, False otherwise
   * @returns {Promise} returns an object
   *  { address: <bitcoin_address>, txids: <txids>, ntx: <total_nb_txs>}
   */
  async getAddress(address, filterAddr) {
    const ret = {
      address: address,
      ntx: 0,
      txids: []
    }

    const scriptHash = this._getScriptHash(address)

    const results = await this.client.sendRequest(
      LocalIndexerWrapper.GET_HISTORY_RPC_CMD,
      scriptHash
    )

    for (let r of results.txs) {
      ret.txids.push(r.tx_hash)
      ret.ntx++
    }

    if (filterAddr && ret.ntx > keys.addrFilterThreshold) {
      Logger.info(`Importer : Import of ${address} rejected (too many transactions - ${ret.ntx})`)
      return {
        address: address,
        ntx: 0,
        txids: []
      }
    }
    
    return ret
  }

  /**
   * Retrieve information for a given list of addresses
   * @param {string} addresses - array of bitcoin addresses
   * @param {boolean} filterAddr - True if an upper bound should be used
   *     for #transactions associated to the address, False otherwise
   * @returns {Promise} returns an array of objects
   *  { address: <bitcoin_address>, txids: <txids>, ntx: <total_nb_txs>}
   */
  async getAddresses(addresses, filterAddr) {
    const ret = {}

    // Build an array of script hashes
    const scriptHashes = addresses.map(a => this._getScriptHash(a))

    // Build an array of commands
    const commands = scriptHashes.map(s => {
      return {
        method: LocalIndexerWrapper.GET_HISTORY_RPC_CMD,
        params: [s]
      }
    })

    // Send the requests
    const results = (keys.indexer.localIndexer.batchRequests == 'active')
      ? await this.client.sendBatch(commands)
      : await this.client.sendRequests(commands)

    for (let r of results) {
      const addr = addresses[r.idxAddr]
      const txids = r.txs.map(t => t.tx_hash)

      ret[addr] = {
        address: addr,
        ntx: txids.length,
        txids: txids
      }
    }

    const aRet = Object.values(ret)

    for (let i in aRet) {
      if (filterAddr && aRet[i].ntx > keys.addrFilterThreshold) {
        Logger.info(`Importer : Import of ${aRet[i].address} rejected (too many transactions - ${aRet[i].ntx})`)
        aRet.splice(i, 1)
      }
    }

    return aRet
  }

}

/**
 * Get history RPC command (Electrum protocol)
 */
LocalIndexerWrapper.GET_HISTORY_RPC_CMD = 'blockchain.scripthash.get_history'


module.exports = LocalIndexerWrapper
