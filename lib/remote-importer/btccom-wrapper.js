/*!
 * lib/remote-importer\btccom-wrapper.js
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
 * Wrapper for the btc.com block explorer APIs
 */
class BtcComWrapper extends Wrapper {

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
   * Get a page of transactions related to a given address
   * @param {string} address - bitcoin address
   * @param {integer} page - page index
   * @returns {Promise}
   */
  async _getTxsForAddress(address, page) {
    const uri = `/address/${address}/tx?page=${page}&verbose=1`
    const results = await this._get(uri)
    return results.data.list.map(tx => tx.hash)
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
    // Extracts the scripthash from the bech32 address
    // (btc.com api manages scripthashes, not bech32 addresses)
    const scripthash = addrHelper.getScriptHashFromBech32(address)

    const uri = `/address/${scripthash}`
    const result = await this._get(uri)

    const ret = {
      address: address,
      ntx: result.data.tx_count,
      txids: []
    }

    // Check if we should filter this address
    if (filterAddr && ret.ntx > keys.addrFilterThreshold) {
      Logger.info(` import of ${ret.address} rejected (too many transactions - ${ret.ntx})`)
      return ret
    }

    const nbPagesApi = Math.ceil(ret.ntx / BtcComWrapper.NB_TXS_PER_PAGE)
    const nbPages = Math.min(20, nbPagesApi)

    const aPages = new Array(nbPages)
    const listPages = Array.from(aPages, (val, idx) => idx + 1)

    const results = await util.seriesCall(listPages, idx => {
      return this._getTxsForAddress(scripthash, idx)
    })

    for (let txids of results)
      ret.txids = ret.txids.concat(txids)

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

// BTC.COM acepts a max of 50txs per page
BtcComWrapper.NB_TXS_PER_PAGE = 50

module.exports = BtcComWrapper
