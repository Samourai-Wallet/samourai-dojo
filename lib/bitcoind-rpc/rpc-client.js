/*!
 * lib/bitcoind_rpc/rpc-client.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const rpc = require('bitcoind-rpc-client')
const network = require('../bitcoin/network')
const keys = require('../../keys')[network.key]
const util = require('../util')
const Logger = require('../logger')


/**
 * Wrapper for bitcoind rpc client
 */
class RpcClient {

  /**
   * Constructor
   */
  constructor() {
    // Initiliaze the rpc client
    this.client = new rpc({
      host: keys.bitcoind.rpc.host,
      port: keys.bitcoind.rpc.port
    })

    this.client.set('user', keys.bitcoind.rpc.user)
    this.client.set('pass', keys.bitcoind.rpc.pass)

    // Initialize a proxy postprocessing api calls
    return new Proxy(this, {
      get: function(target, name, receiver) {
        const origMethod = target.client[name]
        
        return async function(...args) {
          const result = await origMethod.apply(target.client, args)
          
          if (Array.isArray(result)) {
            return result
          } else if (result.result) {
            return result.result
          } else if (result.error) {
            throw result.error
          } else {
            throw 'A problem was met with a request sent to bitcoind RPC API'
          }
        }
      }
    })
  }

  /**
   * Check if an error returned by bitcoin-rpc-client
   * is a connection error.
   * @param {string} err - error message
   * @returns {boolean} returns true if message related to a connection error
   */
  static isConnectionError(err) {
    if (typeof err != 'string')
      return false

    const isTimeoutError = (err.indexOf('connect ETIMEDOUT') != -1)
    const isConnRejected = (err.indexOf('Connection Rejected') != -1)

    return (isTimeoutError || isConnRejected)
  }

  /**
   * Check if the rpc api is ready to process requests
   * @returns {Promise}
   */
  static async waitForBitcoindRpcApi() {
    let client = new RpcClient()

    try {
      await client.getblockchaininfo()
    } catch(e) {
      client = null
      Logger.info('Bitcoind RPC : API is still unreachable. New attempt in 20s.')
      return util.delay(20000).then(() => {
        return RpcClient.waitForBitcoindRpcApi()
      })
    }
  }

}

module.exports = RpcClient
