/*!
 * lib/remote-importer\esplora-wrapper.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const rp = require('request-promise-native')
const addrHelper = require('../bitcoin/addresses-helper')
const util = require('../util')
const Logger = require('../logger')
const network = require('../bitcoin/network')
const keys = require('../../keys')[network.key]
const Wrapper = require('./wrapper')


/**
 * Wrapper for the esplora block explorer APIs
 */
class EsploraWrapper extends Wrapper {

  /**
   * Constructor
   */
  constructor(url) {
    super(url, keys.indexer.socks5Proxy)
  }

  /**
   * Send a GET request to the API
   * @param {string} route
   * @returns {Promise}
   */
  async _get(route) {
    const params = {
      url: `${this.base}${route}`,
      method: 'GET',
      json: true,
      timeout: 15000
    }
    
    // Sets socks proxy agent if required
    if (keys.indexer.socks5Proxy != null)
      params['agent'] = this.socksProxyAgent

    return rp(params)
  }

  /**
   * Get a page of transactions related to a given address
   * @param {string} address - bitcoin address
   * @param {string} lastSeenTxid - last seen txid
   *  (see https://github.com/Blockstream/esplora/blob/master/API.md)
   * @returns {Promise}
   */
  async _getTxsForAddress(address, lastSeenTxid) {
    let uri = `/api/address/${address}/txs`
    if (lastSeenTxid)
      uri = uri + `/chain/${lastSeenTxid}`

    const results = await this._get(uri)
    return results.map(tx => tx.txid)
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

    let lastSeenTxid = null

    while (true) {
      const txids = await this._getTxsForAddress(address, lastSeenTxid)

      if (txids.length == 0)
        // we have all the transactions
        return ret

      ret.txids = ret.txids.concat(txids)
      ret.ntx += ret.txids.length

      if (txids.length < EsploraWrapper.NB_TXS_PER_PAGE) {
        // we have all the transactions
        return ret
      } else if (filterAddr && ret.ntx > keys.addrFilterThreshold) {
        // we have too many transactions
        Logger.info(` import of ${ret.address} rejected (too many transactions - ${ret.ntx})`)
        ret.txids = []
        ret.ntx = 0
        return ret
      } else {
        // we need a new iteration
        lastSeenTxid = txids[txids.length-1]
      }
    }
  }

  /**
   * Retrieve information for a given list of addresses
   * @param {string[]} addresses - array of bitcoin addresses
   * @param {boolean} filterAddr - True if an upper bound should be used
   *     for #transactions associated to the address, False otherwise
   * @returns {Promise} returns an array of objects
   *  { address: <bitcoin_address>, txids: <txids>, ntx: <total_nb_txs>}
   */
  async getAddresses(addresses, filterAddr) {
    const ret = []

    for (let a of addresses) {
      const retAddr = await this.getAddress(a, filterAddr)
      ret.push(retAddr)
    }

    return ret
  }

}

// Esplora returns a max of 25 txs per page
EsploraWrapper.NB_TXS_PER_PAGE = 25

module.exports = EsploraWrapper
