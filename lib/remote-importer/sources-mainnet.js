/*!
 * lib/remote-importer/sources.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const addrHelper = require('../bitcoin/addresses-helper')
const network = require('../bitcoin/network')
const util = require('../util')
const Logger = require('../logger')
const keys = require('../../keys')[network.key]
const Sources = require('./sources')
const BitcoindWrapper = require('./bitcoind-wrapper')
const OxtWrapper = require('./oxt-wrapper')


/**
 * Remote data sources for mainnet
 */
class SourcesMainnet extends Sources {

  /**
   * Constructor
   */
  constructor() {
    super()
    // Initializes external source
    this.source = null
    this._initSource()
  }

  /**
   * Initialize the external data source
   */
  _initSource() {
    if (keys.explorers.bitcoind == 'active') {
      // If local bitcoind option is activated
      // we'll use the local node as our unique source
      this.source = new BitcoindWrapper()
      Logger.info('Activated Bitcoind as the data source for imports')
    } else {
      // Otherwise, we'll use the rest api provided by OXT
      this.source = new OxtWrapper(keys.explorers.oxt)
      Logger.info('Activated OXT API as the data source for imports')
    }
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
      //Logger.error(e, `SourcesMainnet.getAddress() : ${address} from ${this.source.base}`)
      Logger.error(null, `SourcesMainnet.getAddress() : ${address} from ${this.source.base}`)
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
      //Logger.error(e, `SourcesMainnet.getAddresses() : ${addresses} from ${this.source.base}`)
      Logger.error(null, `SourcesMainnet.getAddresses() : ${addresses} from ${this.source.base}`)
    } finally {
      return ret
    }
  }

}

module.exports = SourcesMainnet
