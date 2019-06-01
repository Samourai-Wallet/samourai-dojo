/*!
 * lib/bitcoin/hd-accounts-service.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const _ = require('lodash')
const errors = require('../errors')
const Logger = require('../logger')
const db = require('../db/mysql-db-wrapper')
const network = require('../bitcoin/network')
const gap = require('../../keys/')[network.key].gap
const remote = require('../remote-importer/remote-importer')
const hdaHelper = require('./hd-accounts-helper')
const addrHelper = require('./addresses-helper')


/**
 * A singleton providing a HD Accounts service
 */
class HDAccountsService {

  /**
   * Constructor
   */
  constructor() {}


  /**
   * Create a new hd account in db
   * @param {string} xpub - xpub
   * @param {int} scheme - derivation scheme
   * @returns {Promise} returns true if success, false otherwise
   */
  async createHdAccount(xpub, scheme) {
    try {
      await this.newHdAccount(xpub, scheme)
      return true
    } catch(e) {
      const isInvalidXpub = (e == errors.xpub.INVALID || e == errors.xpub.PRIVKEY)
      const isLockedXpub = (e == errors.xpub.LOCKED)
      const err = (isInvalidXpub || isLockedXpub) ? e : errors.xpub.CREATE
      Logger.error(e, 'HdAccountsService.createHdAccount()' + err)
      return Promise.reject(err)
    }
  }


  /**
   * Restore a hd account in db
   * @param {string} xpub - xpub
   * @param {int} scheme - derivation scheme
   * @param {bool} forceOverride - force override of scheme even if hd account is locked
   * @returns {Promise}
   */
  async restoreHdAccount(xpub, scheme, forceOverride) {
    let isLocked

    // Check if hd accounts exists in db and is locked
    try {
      const account = await db.getHDAccount(xpub)
      const info = hdaHelper.classify(account.hdType)
      isLocked = info.locked
    } catch(e) {}

    // Override derivation scheme if needed
    await this.derivationOverrideCheck(xpub, scheme, forceOverride)

    // Import the hd account
    await remote.importHDAccount(xpub, scheme)

    // Lock the hd account if needed
    if (isLocked)
      return this.lockHdAccount(xpub, true)
  }

  /**
   * Lock a hd account
   * @param {string} xpub - xpub
   * @param {boolean} lock - true for locking, false for unlocking
   * @returns {Promise} returns the derivation type as a string
   */
  async lockHdAccount(xpub, lock) {
    try {
      const account = await db.getHDAccount(xpub)

      const hdType = account.hdType
      const info = hdaHelper.classify(hdType)

      if (info.locked === lock)
        return hdaHelper.typeString(hdType)

      await db.setLockHDAccountType(xpub, lock)

      const type = hdaHelper.makeType(hdType, lock)
      return hdaHelper.typeString(type)

    } catch(e) {
      const err = (e == errors.db.ERROR_NO_HD_ACCOUNT) ? errors.get.UNKNXPUB : errors.generic.DB
      return Promise.reject(err)
    }
  }

  /**
   * Delete a hd account
   * @param {string} xpub - xpub
   * @returns {Promise}
   */
  async deleteHdAccount(xpub) {
    try {
      await db.deleteHDAccount(xpub)
    } catch(e) {
      const err = (e == errors.db.ERROR_NO_HD_ACCOUNT) ? errors.get.UNKNXPUB : errors.generic.DB
      return Promise.reject(err)
    }
  }

  /**
   * Create a new xpub in db
   * @param {string} xpub - xpub
   * @param {string} scheme - derivation scheme
   * @returns {Promise}
   */
  async newHdAccount(xpub, scheme) {
    // Get the HDNode bitcoinjs object.
    // Throws if xpub is actually a private key
    const HDNode = hdaHelper.getNode(xpub)

    if (HDNode === null)
      throw errors.xpub.INVALID

    await this.derivationOverrideCheck(xpub, scheme)
    await db.ensureHDAccountId(xpub, scheme)

    let segwit = ''

    if (scheme == hdaHelper.BIP49)
      segwit = ' SegWit (BIP49)'
    else if (scheme == hdaHelper.BIP84)
      segwit = ' SegWit (BIP84)'
    
    Logger.info(`Created HD Account: ${xpub}${segwit}`)

    const externalPrm = hdaHelper.deriveAddresses(xpub, 0, _.range(gap.external), scheme)
    const internalPrm = hdaHelper.deriveAddresses(xpub, 1, _.range(gap.internal), scheme)

    const external = await externalPrm
    const internal = await internalPrm

    const addresses = _.flatten([external, internal])

    return db.addAddressesToHDAccount(xpub, addresses)
  }

  /**
   * Rescan the blockchain for a hd account
   * @param {string} xpub - xpub
   * @param {integer} gapLimit - (optional) gap limit for derivation
   * @param {integer} startIndex - (optional) rescan shall start from this index   
   * @returns {Promise}
   */
  async rescan(xpub, gapLimit, startIndex) {
    // Force rescan
    remote.clearGuard(xpub)

    try {
      const account = await db.getHDAccount(xpub)
      await remote.importHDAccount(xpub, account.hdType, gapLimit, startIndex)
    } catch(e) {
      return Promise.reject(e)
    } 
  }

  /**
   * Check if we try to override an existing xpub
   * Delete the old xpub from db if it's the case
   * @param {string} xpub - xpub
   * @param {string} scheme - derivation scheme
   * @param {boolean} forceOverride - force override of scheme even if hd account is locked
   *  (default = false)
   * @returns {Promise}
   */
  async derivationOverrideCheck(xpub, scheme, forceOverride) {
    let account

    // Nothing to do here if hd account doesn't exist in db
    try {
      account = await db.getHDAccount(xpub)
    } catch(e) {
      return Promise.resolve()
    }

    try {
      const info = hdaHelper.classify(account.hdType)
      // If this account is already known in the database,
      // check for a derivation scheme mismatch
      if (info.type != scheme) {
        if (info.locked && !forceOverride) {
          Logger.info(`Attempted override on locked account: ${xpub}`)
          return Promise.reject(errors.xpub.LOCKED)
        } else {
          Logger.info(`Derivation scheme override: ${xpub}`)
          return db.deleteHDAccount(xpub)
        }
      }
    } catch(e) {
      Logger.error(e, 'HDAccountsService.derivationOverrideCheck()')
      return Promise.reject(e)
    }
  }

  /**
   * Verify that a given message has been signed
   * with the first external key of a known xpub/ypub/zpub
   *
   * @param {string} xpub - xpub
   * @param {string} address - address used to sign the message
   * @param {string} sig - signature of the message
   * @param {string} msg - signed message
   * @param {integer} scheme - derivation scheme to be used for the xpub
   * @returns {Promise} returns the xpub if signature is valid, otherwise returns an error
   */
  async verifyXpubSignature(xpub, address, sig, msg, scheme) {
    // Derive addresses (P2PKH addresse used for signature + expected address)
    const sigAddressRecord = await hdaHelper.deriveAddresses(xpub, 1, [0], hdaHelper.BIP44)
    const sigAddress = sigAddressRecord[0].address

    const expectedAddressRecord = await hdaHelper.deriveAddresses(xpub, 1, [0], scheme)
    const expectedAddress = expectedAddressRecord[0].address

    try {
      // Check that xpub exists in db
      await db.getHDAccountId(xpub)
      // Check the signature
      if (!addrHelper.verifySignature(msg, sigAddress, sig))
        return Promise.reject(errors.sig.INVSIG)
      // Check that adresses match
      if (address != expectedAddress)
        return Promise.reject(errors.sig.INVADDR)
      // Return the corresponding xpub
      return xpub
    } catch(err) {
      const ret = (err == errors.db.ERROR_NO_HD_ACCOUNT) ? errors.get.UNKNXPUB : errors.generic.DB
      return Promise.reject(ret)
    }
  }

}

module.exports = new HDAccountsService()
