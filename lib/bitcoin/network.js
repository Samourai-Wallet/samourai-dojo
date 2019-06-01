/*!
 * lib/bitcoin/network.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const bitcoin = require('bitcoinjs-lib')


/**
 * A set of keywords encoding for testnet
 */
const TESTNET_KEY = [
  'testnet',
  'testing',
  'test'
]


/**
 * A singleton determining which network to run: bitcoin or testnet
 */
class Network {

  /**
   * Constructor
   */
  constructor() {
    this.key = 'bitcoin'
    this.network = bitcoin.networks.bitcoin

    for (let kw of TESTNET_KEY) {
      // Calling like 'node file.js arg1 arg2'
      if (process.argv.indexOf(kw) > 1) {
        this.key = 'testnet'
        this.network = bitcoin.networks.testnet
        break
      }
    }
  }

}

module.exports = new Network()
