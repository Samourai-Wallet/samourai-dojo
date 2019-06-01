/*!
 * lib/wallet/wallet-entities.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'


/**
 * A class storing entities (xpubs, addresses, pubkeys) 
 * defining a (full|partial) wallet
 */
class WalletEntities {

  /**
   * Constructor
   */
  constructor() {
    this.pubkeys = []
    this.addrs = []
    this.xpubs = []
    this.ypubs = []
    this.zpubs = []
  }

  /**
   * Add a new hd account 
   * with its translation as an xpub
   * @param {string} xpub - xpub or tpub
   * @param {string} ypub - ypub or upub or false
   * @param {string} zpub - zpub or vpub or false
   */
  addHdAccount(xpub, ypub, zpub) {
    this.xpubs.push(xpub)
    this.ypubs.push(ypub)
    this.zpubs.push(zpub)
  }

  /**
   * Add a new address/pubkey
   * @param {string} address - bitcoin address
   * @param {string} pubkey - pubkey associated to the address or false
   */
  addAddress(address, pubkey) {
    this.addrs.push(address)
    this.pubkeys.push(pubkey)
  }

  /**
   * Update the pubkey associated to a given address
   * @param {string} address - bitcoin address
   * @param {string} pubkey - public key
   */
  updatePubKey(address, pubkey) {
    const idxAddr = this.addrs.indexOf(address)
    if (idxAddr > -1)
      this.pubkeys[idxAddr] = pubkey
  }

  /**
   * Checks if a xpub is already listed
   * @param {string} xpub
   * @returns {boolean} returns true if the xpub is already listed, false otherwise
   */
  hasXPub(xpub) {
    return (this.xpubs.indexOf(xpub) > -1)
  }

  /**
   * Checks if an address is already listed
   * @param {string} address - bitcoin address
   * @returns {boolean} returns true if the address is already listed, false otherwise
   */
  hasAddress(address) {
    return (this.addrs.indexOf(address) > -1)
  }

  /**
   * Checks if a pubkey is already listed
   * @param {string} pubkey - public key
   * @returns {boolean} returns true if the pubkey is already listed, false otherwise
   */
  hasPubKey(pubkey) {
    return (this.pubkeys.indexOf(pubkey) > -1)
  }

}

module.exports = WalletEntities