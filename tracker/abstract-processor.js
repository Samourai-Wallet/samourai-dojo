/*!
 * tracker/abstract-processor.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const RpcClient = require('../lib/bitcoind-rpc/rpc-client')


/**
 * An abstract class for tracker processors
 */
class AbstractProcessor {

  /**
   * Constructor
   * @param {object} notifSock - ZMQ socket used for notifications
   */
  constructor(notifSock) {
    // RPC client
    this.client = new RpcClient()
    // ZeroMQ socket for notifications sent to others components
    this.notifSock = notifSock
  }

  /**
   * Notify a new transaction
   * @param {object} tx - bitcoin transaction
   */
  notifyTx(tx) {
    // Real-time client updates for this transaction.
    // Any address input or output present in transaction 
    // is a potential client to notify.
    if (this.notifSock)
      this.notifSock.send(['transaction', JSON.stringify(tx)])
  }

  /**
   * Notify a new block
   * @param {string} header - block header
   */
  notifyBlock(header) {
    // Notify clients of the block
    if (this.notifSock)
      this.notifSock.send(['block', JSON.stringify(header)])
  }

}

module.exports = AbstractProcessor
