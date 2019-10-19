/*!
 * lib/remote-importer/insight-wrapper.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const rp = require('request-promise-native')
const Logger = require('../logger')
const network = require('../bitcoin/network')
const keys = require('../../keys')[network.key]
const Wrapper = require('./wrapper')


/**
 * Wrapper for the Insight block explorer APIs
 */
class InsightWrapper extends Wrapper {

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
   * Retrieve information for a given address
   * @param {string} address - bitcoin address
   * @param {boolean} filterAddr - True if an upper bound should be used
   *     for #transactions associated to the address, False otherwise
   * @returns {Promise} returns an object
   *  { address: <bitcoin_address>, txids: <txids>, ntx: <total_nb_txs>}
   */
  async getAddress(address, filterAddr) {
    const uri = `/addr/${address}`
    // Param filterAddr isn't used for insight
    const result = await this._get(uri)

    const ret = {
      address: result.addrStr,
      txids: [],
      ntx: result.txApperances
    }

    // Check if we should filter this address
    if (filterAddr && ret.ntx > keys.addrFilterThreshold) {
      Logger.info(` import of ${ret.address} rejected (too many transactions - ${ret.ntx})`)
      return ret
    }

    ret.txids = result.transactions
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
    // Not implemented for this api
    throw "Not implemented"
  }

}

module.exports = InsightWrapper
