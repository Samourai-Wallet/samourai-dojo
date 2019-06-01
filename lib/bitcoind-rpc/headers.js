/*!
 * lib/bitcoind-rpc/headers.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const LRU = require('lru-cache')
const errors = require('../errors')
const RpcClient = require('./rpc-client')


/**
 * A singleton providing information about block headers 
 */
class Headers {

  /**
   * Constructor
   */
  constructor() {
    // Cache
    this.headers = LRU({
      // Maximum number of headers to store in cache
      max: 2016,
      // Function used to compute length of item
      length: (n, key) => 1,
      // Maximum age for items in the cache. Items do not expire
      maxAge: Infinity
    })

    // Initialize the rpc client
    this.rpcClient = new RpcClient()
  }

  /**
   * Get the block header for a given hash
   * @param {string} hash - block hash
   * @returns {Promise}
   */
  async getHeader(hash) {
    if (this.headers.has(hash))
      return this.headers.get(hash)
    
    try {
      const header = await this.rpcClient.getblockheader(hash, true)
      const fmtHeader = JSON.stringify(header, null, 2)
      this.headers.set(hash, fmtHeader)
      return fmtHeader
    } catch(e) {
      return Promise.reject(errors.generic.GEN)
    }
  }
  
}

module.exports = new Headers()
