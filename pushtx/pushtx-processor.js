/*!
 * pushtx/pushtx-processor.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const bitcoin = require('bitcoinjs-lib')
const zmq = require('zeromq')
const Logger = require('../lib/logger')
const errors = require('../lib/errors')
const RpcClient = require('../lib/bitcoind-rpc/rpc-client')
const network = require('../lib/bitcoin/network')
const keys = require('../keys')[network.key]
const status = require('./status')


/**
 * A singleton providing a wrapper 
 * for pushing transactions with the local bitcoind
 */
class PushTxProcessor {

  /**
   * Constructor
   */
  constructor() {
    this.notifSock = null
    // Initialize the rpc client
    this.rpcClient = new RpcClient()
  }

  /**
   * Initialize the sockets for notifications
   */
  initNotifications(config) {
    // Notification socket for the tracker
    this.notifSock = zmq.socket('pub')
    this.notifSock.bindSync(config.uriSocket)
  }

  /**
   * Push transactions to the Bitcoin network
   * @param {string} rawtx - raw bitcoin transaction in hex format
   * @returns {string} returns the txid of the transaction
   */
  async pushTx(rawtx) {
    let value = 0

    // Attempt to parse incoming TX hex as a bitcoin Transaction
    try {
      const tx = bitcoin.Transaction.fromHex(rawtx)
      for (let output of tx.outs)
        value += output.value
      Logger.info('PushTx : Push for ' + (value / 1e8).toFixed(8) + ' BTC')
    } catch(e) {
      throw errors.tx.PARSE
    }

    // At this point, the raw hex parses as a legitimate transaction.
    // Attempt to send via RPC to the bitcoind instance
    try {
      const txid = await this.rpcClient.sendrawtransaction(rawtx)
      Logger.info('PushTx : Pushed!')
      // Update the stats
      status.updateStats(value)
      // Notify the tracker
      this.notifSock.send(['pushtx', rawtx])
      return txid
    } catch(err) {
      Logger.info('PushTx : Push failed')
      throw err
    }
  }

}

module.exports = new PushTxProcessor()
