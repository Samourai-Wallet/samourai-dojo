/*!
 * lib/remote-importer/wrapper.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const SocksProxyAgent = require('socks-proxy-agent')
const network = require('../bitcoin/network')
const keys = require('../../keys')[network.key]


/**
 * Abstract class defining a wrapper for a remote API
 */
class Wrapper {

  /**
   * Constructor
   */
  constructor(url, socks5Proxy) {
    this.base = url
    this.socksProxyAgent = socks5Proxy ? new SocksProxyAgent(socks5Proxy) : null
  }

  /**
   * Retrieve information for a given address
   * @param {string} address - bitcoin address
   * @param {boolean} filterAddr - True if an upper bound should be used
   *     for #transactions associated to the address, False otherwise
   * @returns {Promise} returns an object
   *  { address: <bitcoin_address>, txids: <txids>, ntx: <total_nb_txs>}
   */
  async getAddress(address, filterAddr) {}

  /**
   * Retrieve information for a given list of addresses
   * @param {string} addresses - array of bitcoin addresses
   * @param {boolean} filterAddr - True if an upper bound should be used
   *     for #transactions associated to the address, False otherwise
   * @returns {Promise} returns an array of objects
   *  { address: <bitcoin_address>, txids: <txids>, ntx: <total_nb_txs>}
   */
  async getAddresses(addresses, filterAddr) {}

}

module.exports = Wrapper
