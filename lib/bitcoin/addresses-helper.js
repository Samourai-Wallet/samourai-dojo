/*!
 * lib/bitcoin/addresses-helper.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const bitcoin = require('bitcoinjs-lib')
const btcMessage = require('bitcoinjs-message')
const activeNet = require('./network').network


/**
 * A singleton providing Addresses helper functions
 */
class AddressesHelper {

  /**
   * Derives a P2PKH from a public key
   * @param {Buffer} pubKeyBuffer - Buffer storing a public key
   * @returns {string} return the derived address
   */
  p2pkhAddress(pubKeyBuffer) {
    const pubKeyHash = bitcoin.crypto.hash160(pubKeyBuffer)
    return bitcoin.address.toBase58Check(pubKeyHash, activeNet.pubKeyHash)
  }

  /**
   * Derives a P2WPKH-P2SH from a public key
   * @param {Buffer} pubKeyBuffer - Buffer storing a public key
   * @returns {string} return the derived address
   */
  p2wpkhP2shAddress(pubKeyBuffer) {
    const pubKeyHash = bitcoin.crypto.hash160(pubKeyBuffer)
    const witnessProgram = bitcoin.script.witnessPubKeyHash.output.encode(pubKeyHash)
    const scriptPubKey = bitcoin.crypto.hash160(witnessProgram)
    const outputScript = bitcoin.script.scriptHash.output.encode(scriptPubKey)
    return bitcoin.address.fromOutputScript(outputScript, activeNet)
  }

  /**
   * Derives a P2WPKH from a public key
   * @param {Buffer} pubKeyBuffer - Buffer storing a public key
   * @returns {string} return the derived address
   */
  p2wpkhAddress(pubKeyBuffer) {
    const pubKeyHash = bitcoin.crypto.hash160(pubKeyBuffer)
    const outputScript = bitcoin.script.witnessPubKeyHash.output.encode(pubKeyHash)
    return bitcoin.address.fromOutputScript(outputScript, activeNet).toLowerCase()
  }

  /**
   * Verify the signature of a given message
   * @param {string} msg - signed message
   * @param {string} address - address used to sign the message
   * @param {string} sig - signature of the message
   * @returns {boolean} retuns true if signature is valid, otherwise false
   */
  verifySignature(msg, address, sig) {
    try {
      const prefix = activeNet.messagePrefix
      return btcMessage.verify(msg, prefix, address, sig)
    } catch(e) {
      return false
    }
  }

  /**
   * Checks if a string seems like a supported pubkey
   * @param {string} str - string
   * @returns {boolean} return true if str is a supported pubkey format, false otherwise
   */
  isSupportedPubKey(str) {
    return (str.length == 66 && (str.startsWith('02') || str.startsWith('03')))
  }

  /**
   * Check if string is a Bech32 address
   * @param {string} str - string to be checked
   * @returns {boolean} return true if str is a Bech32 address, false otherwise
   */
  isBech32(str) {
    try {
      bitcoin.address.fromBech32(str)
      return true
    } catch(e) {
      return false
    }
  }

  /**
   * Get the script hash associated to a Bech32 address
   * @param {string} str - bech32 address
   * @returns {string} script hash in hex format
   */
  getScriptHashFromBech32(str) {
    try {
      return bitcoin.address.fromBech32(str).data.toString('hex')
    } catch(e) {
      Logger.error(e, 'AddressesHelper.getScriptHashFromBech32()')
      return null
    }
  }

}

module.exports = new AddressesHelper()
