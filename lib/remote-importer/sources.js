/*!
 * lib/remote-importer/sources.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const network = require('../bitcoin/network')
const Logger = require('../logger')
const keys = require('../../keys')[network.key]


/**
 * Base class defining data source for imports/rescans of HD accounts and addresses
 */
class Sources {

  /**
   * Constructor
   */
  constructor() {
    this.source = null
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
      address,
      txids: [],
      ntx: 0
    }

    try {
      const result = await this.source.getAddress(address, filterAddr)
      
      if (result.ntx)
        ret.ntx = result.ntx
      else if (result.txids)
        ret.ntx = result.txids.length

      if (result.txids)
        ret.txids = result.txids

    } catch(e) {
      Logger.error(null, `Sources.getAddress() : ${address} from ${this.source.base}`)
    } finally {
      return ret
    }
  }

  /**
   * Retrieve information for a list of addresses
   * @param {string[]} addresses - array of bitcoin address
   * @param {boolean} filterAddr - True if an upper bound should be used
   *    for #transactions associated to the address, False otherwise
   * @returns {Promise} returns an object
   *    { address: <bitcoin_address>, txids: <txids>, ntx: <total_nb_txs>}
   */
  async getAddresses(addresses, filterAddr) {
    const ret = []

    try {
      const results = await this.source.getAddresses(addresses, filterAddr)

      for (let r of results) {
        // Filter addresses with too many txs
        if (!filterAddr || (r.ntx <= keys.addrFilterThreshold))
          ret.push(r)
      }

    } catch(e) {
      Logger.error(e, `Sources.getAddresses() : ${addresses} from ${this.source.base}`)
    } finally {
      return ret
    }
  }

}

module.exports = Sources
