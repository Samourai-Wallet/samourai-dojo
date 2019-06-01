/*!
 * lib/remote-importer/oxt-wrapper.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const rp = require('request-promise-native')
const Logger = require('../logger')
const network = require('../bitcoin/network')
const keys = require('../../keys')[network.key]
const Wrapper = require('./wrapper')


/**
 * Wrapper for the oxt.me block explorer APIs
 */
class OxtWrapper extends Wrapper {

  /**
   * Constructor
   */
  constructor(url) {
    super(url, keys.explorers.socks5Proxy)    
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
    if (keys.explorers.socks5Proxy != null)
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
    // Try to retrieve more txs than the 1000 managed by the backend
    const uri = `/addresses/${address}/txids?count=${keys.addrFilterThreshold + 1}`
    const result = await this._get(uri)
    
    const ret = {
      address: address,
      ntx: result.count,
      txids: []
    }

    // Check if we should filter this address
    if (filterAddr && ret.ntx > keys.addrFilterThreshold) {
      Logger.info(` import of ${ret.address} rejected (too many transactions - ${ret.ntx})`)
      return ret
    }

    ret.txids = result.data.map(t => t.txid)
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
    const ret = []

    // Send a batch request for all the addresses
    // For each address, try to retrieve more txs than the 1000 managed by the backend
    const strAddr = addresses.join(',')
    const uri = `/addresses/multi/txids?count=${keys.addrFilterThreshold + 1}&addresses=${strAddr}`
    const results = await this._get(uri)

    for (let r of results.data) {
      const retAddr = {
        address: r.address,
        ntx: r.txids.length,
        txids: []
      }

      // Check if we should filter this address
      if (filterAddr && retAddr.ntx > keys.addrFilterThreshold) {
        Logger.info(` import of ${retAddr.address} rejected (too many transactions - ${retAddr.ntx})`)
      } else {
        retAddr.txids = r.txids
      }

      ret.push(retAddr)
    }

    return ret
  }

}

module.exports = OxtWrapper
