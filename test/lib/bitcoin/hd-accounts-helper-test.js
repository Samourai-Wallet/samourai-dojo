/*!
 * test/lib/bitcoin/hd-accounts-helper.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */

'use strict'

const assert = require('assert')
const bitcoin = require('bitcoinjs-lib')
const network = require('../../../lib/bitcoin/network')
const hdaHelper = require('../../../lib/bitcoin/hd-accounts-helper')


/**
 * Test vectors
 */

const XPUB = 'tpubDDDAe7GgFT4fzEzKwWVA4BWo8fiJXQeGEYDTexzo2w6CK1iDoLPYkpEisXo623ieF79GQ3xpcEVN1vcQhX2sysyL8o1XqzBmQb9JReTxQ7w'
const YPUB = 'upub5ELkCsSF68UnAZE7zF9CDztvHeBJiAAhwa4VxEFzZ1CfQRbpy93mkBbUZsqYVpoeEHFwY3fGh9bfftH79ZwbhjUEUBAxQj551TMxVyny4UX'
const ZPUB = 'vpub5ZB1WY7AEp2G1rREpbvpS5zRTcKkenACrgaijd9sw1aYTXR4DoDLNFFcb5o8VjTZdvNkHXFq9oxDZAtfsGMcVy9qLWsNzdtZHBRbtXe87LB'

const BIP44_VECTORS = [
  [0, 0, 'mmZ5FRccGAkwfKme4JkrsmurnimDLdfmNL'],
  [0, 1, 'n3yomLicyrSULiNWFKHsK8erntSpJZEPV6'],
  [0, 2, 'mvVYLwjmMuYVWbuTyB9UE6LWah9tevLrrE'],
  [0, 3, 'n1CrG3NpdTiFWh8KgsnAGUgn6aEF8xvYY2'],
  [0, 4, 'mw3JvPz3wdUVrmTD6WugHgahk97QWnD61L'],

  [1, 0, 'miYMfmg3F3QpBJ48oVzvSi4NVgi93ykJ1L'],
  [1, 1, 'mvEnHm9ZFcdnBa5wNfiJ6yVViex8wReDJJ'],
  [1, 2, 'muSWDErhMRUHb6nSQqnVLp3TctqsKjKY4G'],
  [1, 3, 'mhxsuiLirgVeRT9Nb9iUVrmCTgNDc1tcNa'],
  [1, 4, 'mtj8CDwFPa4cfyK9cgfSCaXvDxdszgFFVU']
]

const BIP49_VECTORS = [
  [0, 0, '2NCmqrb5eXMYZUxdnY4Dr8h3FKqH6JmWCco'],
  [0, 1, '2NCxTGKxDsv9gyC2wjBev85WHP1GN8LCKfR'],
  [0, 2, '2N7vmdwgKjVxkivSou6F8Zaj37SxH7jASaC'],
  [0, 3, '2NBeYshMWNj5jiMBuk9mfywY2853QKgDJ9k'],
  [0, 4, '2MutR6UcnThCUmFJVUrT2z265pNGQcj6DV3'],

  [1, 0, '2MvSusqGmAB5MNz66dVLndV8AVKBvhidCdS'],
  [1, 1, '2MxCqx15GTdW8wDXAVSsxnmHTjoqQLEEzQt'],
  [1, 2, '2N7megh7h2CiCcGWcXax266BtjxZy5Hovrf'],
  [1, 3, '2N8CrDFMsFA7Gs9phdA7xpm3RrDgvk719ro'],
  [1, 4, '2Msi1iNCJcxsxX5ENiVzzqWw8GuCJG8zfmV']
]

const BIP84_VECTORS = [
  [0, 0, 'tb1qggmkgcrk5zdwm8wlh2nzqv5k7xunv3tqk6w9p0'],
  [0, 1, 'tb1q7enwpjlzuc3taq69mkpyqmkwn8d5mtrvmvzl9m'],
  [0, 2, 'tb1q53zh56awxvk824msyxhfjtlwg4fwd3s2s5wygh'],
  [0, 3, 'tb1q6l6lm298eq5qkwntl42lv2x0vw6yny50ugnuef'],
  [0, 4, 'tb1q4fre2as0az62am5eaj30tupv92crqd8yjpu67w'],

  [1, 0, 'tb1qyykyu2y9lx6qt2y6j3nur88ssnpuapnug9zuv4'],
  [1, 1, 'tb1q59awztrl7dfn7l38a8uvgrkstrw4lf4fwmz2kt'],
  [1, 2, 'tb1qnza9973gp8f7rm9k9yc327zwdvz9wl9sa3yvp7'],
  [1, 3, 'tb1qrttk0uzx656uupg9w8f39ec6e6c8wwcts4fanj'],
  [1, 4, 'tb1qjrnw8u2pvspm6hq3aa83ff93wevq2zyxqczewy']
]

const HD_TYPES_VECTORS = [
  // unlocked
  [0, hdaHelper.BIP44, false],
  [1, hdaHelper.BIP49, false],
  [2, hdaHelper.BIP84, false],
  // locked
  [128, hdaHelper.BIP44, true],
  [129, hdaHelper.BIP49, true],
  [130, hdaHelper.BIP84, true],
]


describe('HdAccountsHelper', function() {
  
  describe('isXpub()', function() {
    it('should successfully detect a XPUB', function() {
      assert(hdaHelper.isXpub(XPUB))
      assert(!hdaHelper.isXpub(YPUB))
      assert(!hdaHelper.isXpub(ZPUB))
    })

    it('should successfully detect a YPUB', function() {
      assert(!hdaHelper.isYpub(XPUB))
      assert(hdaHelper.isYpub(YPUB))
      assert(!hdaHelper.isYpub(ZPUB))
    })

    it('should successfully detect a ZPUB', function() {
      assert(!hdaHelper.isZpub(XPUB))
      assert(!hdaHelper.isZpub(YPUB))
      assert(hdaHelper.isZpub(ZPUB))
    })
  })


  describe('isValid()', function() {
    it('should successfully validate a valid XPUB', function() {
      assert(hdaHelper.isValid(XPUB))
    })

    it('should successfully validate a valid YPUB', function() {
      assert(hdaHelper.isValid(YPUB))
    })

    it('should successfully validate a valid ZPUB', function() {
      assert(hdaHelper.isValid(ZPUB))
    })
  })


  describe('classify()', function() {
    it('should successfully classify the code stored in db', function() {
      for (const v of HD_TYPES_VECTORS) {
        const ret = hdaHelper.classify(v[0])
        assert(ret.type == v[1])
        assert(ret.locked == v[2])
      }      
    })
  })


  describe('makeType()', function() {
    it('should successfully compute the code stored in db', function() {
      for (const v of HD_TYPES_VECTORS) {
        const ret = hdaHelper.makeType(v[1], v[2])
        assert(ret == v[0])
      }      
    })
  })


  describe('deriveAddresses()', () => {
    it('should successfully derive addresses with BIP44', async () => {
      for (const v of BIP44_VECTORS) {
        const addresses = await hdaHelper.deriveAddresses(XPUB, v[0], [v[1]], hdaHelper.BIP44)
        assert(addresses[0].address == v[2])
      }
    })

    it('should successfully derive addresses with BIP49', async () => {
      for (const v of BIP49_VECTORS) {
        const addresses = await hdaHelper.deriveAddresses(XPUB, v[0], [v[1]], hdaHelper.BIP49)
        assert(addresses[0].address == v[2])
      }
    })

    it('should successfully derive addresses with BIP84', async () => {
      for (const v of BIP84_VECTORS) {
        const addresses = await hdaHelper.deriveAddresses(XPUB, v[0], [v[1]], hdaHelper.BIP84)
        assert(addresses[0].address == v[2])
      }
    })
  })


  describe('xlatXPUB()', function() {
    it('should successfully translate XPUB in YPUB', function() {
      const xpubXlated = hdaHelper.xlatXPUB(XPUB)
      assert(xpubXlated == XPUB)
    })

    it('should successfully translate YPUB in XPUB', function() {
      const ypubXlated = hdaHelper.xlatXPUB(YPUB)
      assert(ypubXlated == XPUB)
    })

    it('should successfully translate ZPUB in XPUB', function() {
      const zpubXlated = hdaHelper.xlatXPUB(ZPUB)
      assert(zpubXlated == XPUB)
    })
  })

})
