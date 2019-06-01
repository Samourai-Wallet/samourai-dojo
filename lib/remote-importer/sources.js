/*!
 * lib/remote-importer/sources.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'


/**
 * Abstract class defining a list of blockchain explorer providing a remote API
 */
class Sources {

  /**
   * Constructor
   */
  constructor() {}

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
   * Retrieve information for a list of addresses
   * @param {string[]} addresses - array of bitcoin address
   * @param {boolean} filterAddr - True if an upper bound should be used
   *    for #transactions associated to the address, False otherwise
   * @returns {Promise} returns an object
   *    { address: <bitcoin_address>, txids: <txids>, ntx: <total_nb_txs>}
   */
  async getAddresses(addresses, filterAddr) {}

}

module.exports = Sources
