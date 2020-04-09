/*!
 * tracker/tracker.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const zmq = require('zeromq')
const network = require('../lib/bitcoin/network')
const keys = require('../keys')[network.key]
const BlockchainProcessor = require('./blockchain-processor')
const MempoolProcessor = require('./mempool-processor')


/**
 * A class implementing a process tracking the blockchain
 */
class Tracker {

  /**
   * Constructor
   */
  constructor() {
    // Notification socket for client events
    this.notifSock = zmq.socket('pub')
    this.notifSock.bindSync(`tcp://127.0.0.1:${keys.ports.tracker}`)

    // Initialize the blockchain processor
    // and the mempool buffer
    this.blockchainProcessor = new BlockchainProcessor(this.notifSock)
    this.mempoolProcessor = new MempoolProcessor(this.notifSock)
  }

  /**
   * Start the tracker
   * @returns {Promise}
   */
  async start() {
    this.startupTimeout = setTimeout(async function() {
      await this.blockchainProcessor.start()
      await this.mempoolProcessor.start()
    }.bind(this), 1500)
  }

  /**
   * Stop the tracker
   */
  async stop() {
    clearTimeout(this.startupTimeout)
    await this.blockchainProcessor.stop()
    await this.mempoolProcessor.stop()
  }

}

module.exports = Tracker
