/*!
 * lib/remote-importer/bitcoind-wrapper.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const bitcoin = require('bitcoinjs-lib')
const RpcClient = require('../bitcoind-rpc/rpc-client')
const Logger = require('../logger')
const network = require('../bitcoin/network')
const activeNet = network.network
const keys = require('../../keys')[network.key]
const Wrapper = require('./wrapper')

/**
 * Wrapper for a local bitcoind RPC API
 */
class BitcoindWrapper extends Wrapper {

  /**
   * Constructor
   */
  constructor() {
    super(null, null)
    // RPC client
    this.client = new RpcClient()
  }

  /**
   * Send a request to the RPC API
   * @param {array} descriptors - array of output descriptors
   *  expected by scantxoutset()
   * @returns {Promise}
   */
  async _get(descriptors) {
    return this.client.cmd('scantxoutset', 'start', descriptors)
  }

  /**
   * Translate a scriptPubKey into an address
   * @param {string} scriptPubKey - ScriptPubKey in hex format
   * @returns {string} returns the bitcoin address corresponding to the scriptPubKey
   */
  _xlatScriptPubKey(scriptPubKey) {
    const bScriptPubKey = Buffer.from(scriptPubKey, 'hex')
    return bitcoin.address.fromOutputScript(bScriptPubKey, activeNet)
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

    const descriptor = `addr(${address})`
    const results = await this._get([descriptor])

    for (let r of results.unspents) {
      ret.txids.push(r.txid)
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

    // Send a batch request for all the addresses
    const descriptors = addresses.map(a => `addr(${a})`)

    const results = await this._get(descriptors)

    for (let r of results.unspents) {
      const addr = this._xlatScriptPubKey(r.scriptPubKey)

      if (!ret[addr]) {
        ret[addr] = {
          address: addr,
          ntx: 0,
          txids: []
        }
      }

      ret[addr].txids.push(r.txid)
      ret[addr].ntx++
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

module.exports = BitcoindWrapper
