/**
 * test/a-init-network.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const assert = require('assert')
const bitcoin = require('bitcoinjs-lib')
const network = require('../lib/bitcoin/network')
network.key = 'testnet'
network.network = bitcoin.networks.testnet
const hdaHelper = require('../lib/bitcoin/hd-accounts-helper')
const addrHelper = require('../lib/bitcoin/addresses-helper')


/**
 * Force testnet for all the unit tests
 */
describe('InitTest', function() {
  
  describe('initTests()', function() {

    it('should successfully initialize testnet', function() {
      assert(true)
    })

  })

})
