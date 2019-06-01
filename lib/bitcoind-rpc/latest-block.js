/*!
 * lib/bitcoind_rpc/latest-block.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const zmq = require('zeromq')
const Logger = require('../logger')
const util = require('../util')
const network = require('../bitcoin/network')
const keys = require('../../keys')[network.key]
const RpcClient = require('./rpc-client')


/**
 * A singleton providing information about the latest block
 */
class LatestBlock {

  /**
   * Constructor
   */
  constructor() {
    this.height = null
    this.hash = null
    this.time = null
    this.diff = null

    // Initialize the rpc client
    this.rpcClient = new RpcClient()
    
    // Gets the latest block from bitcoind
    this.rpcClient.getbestblockhash().then(hash => this.onBlockHash(hash))

    // Initializes zmq socket
    this.sock = zmq.socket('sub')
    this.sock.connect(keys.bitcoind.zmqBlk)
    this.sock.subscribe('hashblock')

    this.sock.on('message', (topic, msg) => {
      switch(topic.toString()) {
        case 'hashblock':
          this.onBlockHash(msg.toString('hex'))
          break
        default:
          Logger.info(topic.toString())
      }
    })
  }

  /**
   * Retrieve and store information for a given block
   * @param {string} hash - txid of the block
   * @returns {Promise}
   */
  async onBlockHash(hash) {
    const header = await this.rpcClient.getblockheader(hash)

    this.height = header.height
    this.hash = hash
    this.time = header.mediantime
    this.diff = header.difficulty

    Logger.info(`Block ${this.height} ${this.hash}`)
  }

}

module.exports = new LatestBlock()
