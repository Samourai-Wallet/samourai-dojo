/*!
 * test/lib/bitcoin/addresses-helper.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */

'use strict'

const assert = require('assert')
const bitcoin = require('bitcoinjs-lib')
const btcMessage = require('bitcoinjs-message')
const network = require('../../../lib/bitcoin/network')
const activeNet = network.network
const addrHelper = require('../../../lib/bitcoin/addresses-helper')


/**
 * Test vectors
 */

const ZPUB = 'zpub6rFR7y4Q2AijBEqTUquhVz398htDFrtymD9xYYfG1m4wAcvPhXNfE3EfH1r1ADqtfSdVCToUG868RvUUkgDKf31mGDtKsAYz2oz2AGutZYs'

const VECTOR_1 = [
  [
    '0330d54fd0dd420a6e5f8d3624f5f3482cae350f79d5f0753bf5beef9c2d91af3c',
    'my6RhGaMEf8v9yyQKqiuUYniJLfyU4gzqe',
    '2N8ShdHvtvhbbrWPBQkgTqvNtP5Bp33veEi',
    'tb1qcr8te4kr609gcawutmrza0j4xv80jy8zmfp6l0'
  ],
  [
    '03e775fd51f0dfb8cd865d9ff1cca2a158cf651fe997fdc9fee9c1d3b5e995ea77',
    'munoNuscNJfEbrQyEQt1CmYDeNtQseT378',
    '2N6erLsHUv6mpaiHS6UVy3EEtNU1mtgF6Bq',
    'tb1qnjg0jd8228aq7egyzacy8cys3knf9xvrn9d67m'
  ],
  [
    '03025324888e429ab8e3dbaf1f7802648b9cd01e9b418485c5fa4c1b9b5700e1a6',
    'mmBsCKnjnyGQbHanuXgRRocN43Tmb1TLJG',
    '2N6HZAqLDHQGHhb1sFRYkdZMFEijiXD7Yvx',
    'tb1q8c6fshw2dlwun7ekn9qwf37cu2rn755ut76fzv'
  ]
]

const VECTOR_2 = [
  ['0330d54fd0dd420a6e5f8d3624f5f3482cae350f79d5f0753bf5beef9c2d91af3c', true],
  ['0239c7029670faa4882bbdf6599127a6e3b39519c3d02bb5825d9db424d647d553', true],
  ['046655feed4d214c261e0a6b554395596f1f1476a77d999560e5a8df9b8a1a3515217e88dd05e938efdd71b2cce322bf01da96cd42087b236e8f5043157a9c068e', false]
]

const VECTOR_3 = [
  ['tb1qcr8te4kr609gcawutmrza0j4xv80jy8zmfp6l0', true],
  ['my6RhGaMEf8v9yyQKqiuUYniJLfyU4gzqe', false],
  ['2N8ShdHvtvhbbrWPBQkgTqvNtP5Bp33veEi', false]
]

const VECTOR_4 = [
  ['tb1qcr8te4kr609gcawutmrza0j4xv80jy8zmfp6l0', 'c0cebcd6c3d3ca8c75dc5ec62ebe55330ef910e2'],
  ['tb1qnjg0jd8228aq7egyzacy8cys3knf9xvrn9d67m', '9c90f934ea51fa0f6504177043e0908da6929983'],
  ['tb1q8c6fshw2dlwun7ekn9qwf37cu2rn755ut76fzv', '3e34985dca6fddc9fb369940e4c7d8e2873f529c']
]

// privkey, pubkey, [[msg, sig, expected result]]
const VECTOR_5 = [
  [
    '9eedbdda033d9e34bc5d197011347a1cd69ca10b4b3db5a08e97176c3650b814',
    '03fc9f2d8cd6e576e50ca3bc76e64186788075def0eef1f5d8c8dda803c4fcd999',
    [
      [
        'this is a message to be signed',
        '207438b235b471b1fdc143924eb2c44e8de7aa870c776402ded6dd414816c6b43c49524df636d8cd3353ce5a15ef18f385fc7a68866f09d6df41a8635c234684f2',
        true
      ],
      [
        'this is a message to be signed',
        '207438b235b471b1fdc143924eb2c44e8de7aa870c776402ded6dd414816c6b43c49524df636d8cd3353ce5a15ef18f385fc7a68866f09d6df41a8635c234684f3',
        false
      ]
    ]
  ]
]


describe('AddressesHelper', function() {

  describe('p2pkhAddress()', function() {
    it('should successfully derive P2PKH addresses from pubkeys', function() {
      for (const v of VECTOR_1) {
        const pkb = Buffer.from(v[0], 'hex')
        const addr = addrHelper.p2pkhAddress(pkb)
        assert(addr == v[1])
      }
    })
  })

  describe('p2wpkhP2shAddress()', function() {
    it('should successfully derive P2WPKH-P2SH addresses from pubkeys', function() {
      for (const v of VECTOR_1) {
        const pkb = Buffer.from(v[0], 'hex')
        const addr = addrHelper.p2wpkhP2shAddress(pkb)
        assert(addr == v[2])
      }
    })
  })

  describe('p2wpkhAddress()', function() {
    it('should successfully derive bech32 addresses from pubkeys', function() {
      for (const v of VECTOR_1) {
        const pkb = Buffer.from(v[0], 'hex')
        const addr = addrHelper.p2wpkhAddress(pkb)
        assert(addr == v[3])
      }
    })
  })

  describe('isSupportedPubKey()', function() {
    it('should successfully detect a compressed pubkey', function() {
      for (const v of VECTOR_2) {
        assert(addrHelper.isSupportedPubKey(v[0]) == v[1])
      }
    })
  })

  describe('isBech32()', function() {
    it('should successfully detect a bech32 address', function() {
      for (const v of VECTOR_3) {
        assert(addrHelper.isBech32(v[0]) == v[1])
      }
    })
  })

  describe('getScriptHashFromBech32()', function() {
    it('should successfully extract the script hash from a bech32 address', function() {
      for (const v of VECTOR_4) {
        assert(addrHelper.getScriptHashFromBech32(v[0]) == v[1])
      }
    })
  })

  describe('verifySignature()', function() {
    it('should successfully verify signatures', function() {
      const prefix = activeNet.messagePrefix

      for (const tc of VECTOR_5) {
        const privKey = Buffer.from(tc[0], 'hex')
        const pubKey = Buffer.from(tc[1], 'hex')
        const address = addrHelper.p2pkhAddress(pubKey)

        for (const stc of tc[2]) {
          const msg = stc[0]
          const targetSig = Buffer.from(stc[1], 'hex')
          const expectedResult = stc[2]

          const sig = btcMessage.sign(msg, prefix, privKey, true)

          // Check that library returns valid result
          assert((sig.compare(targetSig) == 0) == expectedResult)

          // Check method
          const result = addrHelper.verifySignature(msg, address, sig)
          assert(result)
        }
      }
    })
  })

})
