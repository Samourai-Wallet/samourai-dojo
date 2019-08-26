/*!
 * lib/bitcoin/parallel-address-derivation.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const bitcoin = require('bitcoinjs-lib')
const errors = require('../errors')
const activeNet = require('./network').network
const addrHelper = require('./addresses-helper')

/**
 * Constants duplicated from HDAccountsHelper
 */
const BIP44  = 0
const BIP49  = 1
const BIP84  = 2


/**
 * Derives an address for an hd account
 * @param {int} chain - chain to be derived
 *    must have a value on [0,1] for BIP44/BIP49/BIP84 derivation
 * @param {bip32} chainNode - Parent bip32 used for derivation
 * @param {int} index - index to be derived
 * @param {int} type - type of derivation
 * @returns {Promise - object} returns an object {address: '...', chain: <int>, index: <int>}
 */
const deriveAddress = async function(chain, chainNode, index, type) {
  // Derive M/chain/index
  const indexNode = chainNode.derive(index)

  const addr = {
    chain: chain,
    index: index
  }

  switch (type) {
    case BIP44:
      addr.address = bitcoin.payments.p2pkh({ pubkey: indexNode.publicKey, network: activeNet }).address
      break
    case BIP49:
      addr.address = addrHelper.p2wpkhP2shAddress(indexNode.publicKey)
      break
    case BIP84:
      addr.address = addrHelper.p2wpkhAddress(indexNode.publicKey)
      break
  }

  return addr
}

/**
 * Receive message from parent process
 */
process.on('message', async (msg) => {
  try {
    const xpub = msg.xpub
    const chain = msg.chain
    const indices = msg.indices
    const type = msg.type

    // Parse input as an HD Node. Throws if invalid
    const node = bitcoin.bip32.fromBase58(xpub, activeNet)

    // Check and see if this is a private key
    if (!node.isNeutered())
      throw errors.xpub.PRIVKEY

    const chainNode = node.derive(chain)

    const promises = indices.map(index => {
      return deriveAddress(chain, chainNode, index, type)
    })

    const addresses = await Promise.all(promises)

    // Send response to parent process
    process.send({
      status: 'ok',
      addresses: addresses
    })

  } catch(e) {
    process.send({
      status: 'error',
      addresses: [],
      error: e
    })
  }

})
