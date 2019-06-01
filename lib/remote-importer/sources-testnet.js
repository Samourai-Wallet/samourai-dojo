/*!
 * lib/remote-importer/sources-testnet.js
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
const InsightWrapper = require('./insight-wrapper')
const BtcComWrapper = require('./btccom-wrapper')


/**
 * Remote data sources for testnet polled round-robin to spread load
 */
class SourcesTestnet extends Sources {

  /**
   * Constructor
   */
  constructor() {
    super()
    this.sources = []
    this.index = 0
    this.sourceBech32 = null
    this.isBitcoindActive = false
    // Initializes external sources
    this._initSources()
  }

  /**
   * Initialize the external data sources
   */
  _initSources() {
    if (keys.explorers.bitcoind == 'active') {
      // If local bitcoind option is activated
      // we'll use the local node as our unique source
      this.sourceBech32 = new BitcoindWrapper()
      this.sources.push(this.sourceBech32)
      this.isBitcoindActive = true
    } else {
      // Otherwise, we use a set of insight servers + btc.com for bech32 addresses
      this.sourceBech32 = new BtcComWrapper(keys.explorers.btccom)
      for (let url of keys.explorers.insight)
        this.sources.push(new InsightWrapper(url))
      this.isBitcoindActive = false
    }
  }

  /**
   * Get the next source index
   * @returns {integer} returns the next source index
   */
  nextIndex() {
    this.index++
    if (this.index >= this.sources.length)
      this.index = 0
    return this.index
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
    let source = ''

    const isBech32 = addrHelper.isBech32(address)
    
    const ret = {
      address,
      txids: [],
      ntx: 0
    }

    try {
      source = isBech32 ? this.sourceBech32 : this.sources[this.nextIndex()]
      const result = await source.getAddress(address, filterAddr)
      
      if (result.ntx)
        ret.ntx = result.ntx
      else if (result.txids)
        ret.ntx = result.txids.length

      if (result.txids)
        ret.txids = result.txids
      
      return ret

    } catch(e) {
      Logger.error(e, `SourcesTestnet.getAddress() : ${address} from ${source.base}`)
      if (!isBech32 && this.sources.length > 1) {
        // Try again with another source
        return this.getAddress(address, filterAddr)
      } else {
        return ret
      }
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
      if (this.isBitcoindActive) {
        const source = this.sources[0]
        const results = await source.getAddresses(addresses, filterAddr)
        for (let r of results) {
          // Filter addresses with too many txs
          if (!filterAddr || (r.ntx <= keys.addrFilterThreshold))
            ret.push(r)
        }
      } else {
        const lists = util.splitList(addresses, this.sources.length)
        await util.seriesCall(lists, async list => {
          const results = await Promise.all(list.map(a => {
            return this.getAddress(a, filterAddr)
          }))
        
          for (let r of results) {
            // Filter addresses with too many txs
            if (!filterAddr || (r.ntx <= keys.addrFilterThreshold))
              ret.push(r)
          }
        })
      }
    } catch (e) {
      Logger.error(e, `SourcesTestnet.getAddresses() : Addr list = ${addresses}`)
    } finally {
      return ret
    }
  }

}

module.exports = SourcesTestnet
