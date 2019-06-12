/*!
 * accounts/api-helper.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const bitcoin = require('bitcoinjs-lib')
const validator = require('validator')
const Logger = require('../lib/logger')
const errors = require('../lib/errors')
const WalletEntities = require('../lib/wallet/wallet-entities')
const network = require('../lib/bitcoin/network')
const activeNet = network.network
const hdaHelper = require('../lib/bitcoin/hd-accounts-helper')
const addrHelper = require('../lib/bitcoin/addresses-helper')
const HttpServer = require('../lib/http-server/http-server')


/**
 * A singleton providing util methods used by the API
 */
class ApiHelper {

  /**
   * Parse a string and extract (x|y|z|t|u|v)pubs, addresses and pubkeys
   * @param {string} str - list of entities separated by '|'
   * @returns {object} returns a WalletEntities object
   */
  parseEntities(str) {
    const ret = new WalletEntities()

    if (typeof str !== 'string')
      return ret

    for (let item of str.split('|')) {
      try {

        if (hdaHelper.isValid(item) && !ret.hasXPub(item)) {
          const xpub = hdaHelper.xlatXPUB(item)

          if (hdaHelper.isYpub(item))
            ret.addHdAccount(xpub, item, false)
          else if (hdaHelper.isZpub(item))
            ret.addHdAccount(xpub, false, item)
          else
            ret.addHdAccount(item, false, false)

        } else if (addrHelper.isSupportedPubKey(item) && !ret.hasPubKey(item)) {
          // Derive pubkey as 3 addresses (P1PKH, P2WPKH/P2SH, BECH32)
          const bufItem = Buffer.from(item, 'hex')

          const funcs = [
            addrHelper.p2pkhAddress,
            addrHelper.p2wpkhP2shAddress,
            addrHelper.p2wpkhAddress
          ]

          for (let f of funcs) {
            const addr = f(bufItem)
            if (ret.hasAddress(addr))
              ret.updatePubKey(addr, item)
            else
              ret.addAddress(addr, item)
          }

        } else if (bitcoin.address.toOutputScript(item, activeNet) && !ret.hasAddress(item)) {

          // Bech32 addresses are managed in lower case
          if (addrHelper.isBech32(item))
            item = item.toLowerCase()
          ret.addAddress(item, false)
        }
      } catch(e) {}
    }

    return ret
  }

  /**
   * Check entities passed as url params
   * @param {object} params - request query or body object
   * @returns {boolean} return true if conditions are met, false otherwise
   */
  checkEntitiesParams(params) {
    return params.active
      || params.new
      || params.pubkey
      || params.bip49
      || params.bip84
  }

  /**
   * Parse the entities passed as arguments of an url
   * @param {object} params - request query or body object
   * @returns {object} return a mapping object
   *    {active:..., legacy:..., pubkey:..., bip49:..., bip84:...}
   */
  parseEntitiesParams(params) {
    return {
      active: this.parseEntities(params.active),
      legacy: this.parseEntities(params.new),
      pubkey: this.parseEntities(params.pubkey),
      bip49: this.parseEntities(params.bip49),
      bip84: this.parseEntities(params.bip84)
    }
  }

  /**
   * Express middleware validating if entities params are well formed
   * @param {object} req - http request object
   * @param {object} res - http response object
   * @param {function} next - next express middleware
   */
  validateEntitiesParams(req, res, next) {
    const params = this.checkEntitiesParams(req.query) ? req.query : req.body

    let isValid = true

    if (params.active && !this.subValidateEntitiesParams(params.active))
      isValid &= false

    if (params.new && !this.subValidateEntitiesParams(params.new))
      isValid &= false

    if (params.pubkey && !this.subValidateEntitiesParams(params.pubkey))
      isValid &= false

    if (params.bip49 && !this.subValidateEntitiesParams(params.bip49))
      isValid &= false

    if (params.bip84 && !this.subValidateEntitiesParams(params.bip84))
      isValid &= false

    if (isValid) {
      next()
    } else {
      HttpServer.sendError(res, errors.body.INVDATA)
      Logger.error(
        params,
        `ApiHelper.validateEntitiesParams() : Invalid arguments`
      )
    }
  }

  /**
   * Validate a request argument
   * @param {string} arg - request argument
   */
  subValidateEntitiesParams(arg) {
    for (let item of arg.split('|')) {
      const isValid = validator.isAlphanumeric(item)
      if (!isValid)
        return false
    }
    return true
  }

}

module.exports = new ApiHelper()
