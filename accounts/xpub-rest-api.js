/*!
 * accounts/xpub-rest-api.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const validator = require('validator')
const bodyParser = require('body-parser')
const errors = require('../lib/errors')
const network = require('../lib/bitcoin/network')
const Logger = require('../lib/logger')
const db = require('../lib/db/mysql-db-wrapper')
const hdaHelper = require('../lib/bitcoin/hd-accounts-helper')
const hdaService = require('../lib/bitcoin/hd-accounts-service')
const RpcClient = require('../lib/bitcoind-rpc/rpc-client')
const HdAccountInfo = require('../lib/wallet/hd-account-info')
const authMgr = require('../lib/auth/authorizations-manager')
const HttpServer = require('../lib/http-server/http-server')

const debugApi = !!(process.argv.indexOf('api-debug') > -1)
const gap = require('../keys/')[network.key].gap


/**
 * XPub API endpoints
 */
class XPubRestApi {

  /**
   * Constructor
   * @param {pushtx.HttpServer} httpServer - HTTP server
   */
  constructor(httpServer) {
    this.httpServer = httpServer

    // Initialize the rpc client
    this.rpcClient = new RpcClient()

    // Establish routes
    const urlencodedParser = bodyParser.urlencoded({ extended: true })

    this.httpServer.app.post(
      '/xpub/',
      urlencodedParser,
      authMgr.checkAuthentication.bind(authMgr),
      this.validateArgsPostXpub.bind(this),
      this.postXpub.bind(this),
      HttpServer.sendAuthError
    )

    this.httpServer.app.get(
      '/xpub/:xpub',
      authMgr.checkAuthentication.bind(authMgr),
      this.validateArgsGetXpub.bind(this),
      this.getXpub.bind(this),
      HttpServer.sendAuthError
    )

    this.httpServer.app.post(
      '/xpub/:xpub/lock',
      urlencodedParser,
      authMgr.checkAuthentication.bind(authMgr),
      this.validateArgsPostLockXpub.bind(this),
      this.postLockXpub.bind(this),
      HttpServer.sendAuthError
    )

    this.httpServer.app.delete(
      '/xpub/:xpub',
      urlencodedParser,
      authMgr.checkAuthentication.bind(authMgr),
      this.validateArgsDeleteXpub.bind(this),
      this.deleteXpub.bind(this),
      HttpServer.sendAuthError
    )
  }


  /**
   * Handle xPub POST request
   * @param {object} req - http request object
   * @param {object} res - http response object
   */
  async postXpub(req, res) {
    try {
      let xpub

      // Check request arguments
      if (!req.body)
        return HttpServer.sendError(res, errors.body.NODATA)

      if (!req.body.xpub)
        return HttpServer.sendError(res, errors.body.NOXPUB)

      if (!req.body.type)
        return HttpServer.sendError(res, errors.body.NOTYPE)

      // Extracts arguments
      const argXpub = req.body.xpub
      const argSegwit = req.body.segwit
      const argAction = req.body.type
      const argForceOverride = req.body.force

      // Translate xpub if needed
      try {
        const ret = this.xlatHdAccount(argXpub, true)
        xpub = ret.xpub
      } catch(e) {
        return HttpServer.sendError(res, e)
      }

      // Define the derivation scheme
      let scheme = hdaHelper.BIP44

      if (argSegwit) {
        const segwit = argSegwit.toLowerCase()
        if (segwit == 'bip49')
          scheme = hdaHelper.BIP49
        else if (segwit == 'bip84')
          scheme = hdaHelper.BIP84
        else
          return HttpServer.sendError(res, errors.xpub.SEGWIT)
      }

      // Define default forceOverride if needed
      const forceOverride = argForceOverride ? argForceOverride : false

      // Process action
      if (argAction == 'new') {
        // New hd account
        try {
          await hdaService.createHdAccount(xpub, scheme)
          HttpServer.sendOk(res)
        } catch(e) {
          HttpServer.sendError(res, e)
        }
      } else if (argAction == 'restore') {
        // Restore hd account
        try {
          await hdaService.restoreHdAccount(xpub, scheme, forceOverride)
          HttpServer.sendOk(res)
        } catch(e) {
          HttpServer.sendError(res, e)
        }
      } else {
        // Unknown action
        return HttpServer.sendError(res, errors.body.INVTYPE)
      }

    } catch(e) {
      return HttpServer.sendError(res, errors.generic.GEN)

    } finally {
      debugApi && Logger.info(`API : Completed POST /xpub ${req.body.xpub}`)
    }
  }

  /**
   * Handle xPub GET request
   * @param {object} req - http request object
   * @param {object} res - http response object
   */
  async getXpub(req, res) {
    try {
      let xpub

      // Extracts arguments
      const argXpub = req.params.xpub

      // Translate xpub if needed
      try {
        const ret = this.xlatHdAccount(argXpub)
        xpub = ret.xpub
      } catch(e) {
        return HttpServer.sendError(res, e)
      }

      const hdaInfo = new HdAccountInfo(xpub)

      const info = await hdaInfo.loadInfo()
      if (!info)
        return Promise.reject()

      const ret = {
        balance: hdaInfo.finalBalance,
        unused: {
          external: hdaInfo.accountIndex,
          internal: hdaInfo.changeIndex,
        },
        derivation: hdaInfo.derivation,
        created: hdaInfo.created
      }

      HttpServer.sendOkData(res, ret)

    } catch(e) {
      Logger.error(e, 'API : XpubRestApi.getXpub()')
      HttpServer.sendError(res, e)

    } finally {
      debugApi && Logger.info(`API : Completed GET /xpub/${req.params.xpub}`)
    }
  }

  /**
   * Handle Lock XPub POST request
   * @param {object} req - http request object
   * @param {object} res - http response object
   */
  async postLockXpub(req, res) {
    try {
      let xpub, scheme

      // Check request arguments
      if (!req.body)
        return HttpServer.sendError(res, errors.body.NODATA)

      if (!req.body.address)
        return HttpServer.sendError(res, errors.body.NOADDR)

      if (!req.body.signature)
        return HttpServer.sendError(res, errors.body.NOSIG)

      if (!req.body.message)
        return HttpServer.sendError(res, errors.body.NOMSG)

      if (!(req.body.message == 'lock' || req.body.message == 'unlock'))
        return HttpServer.sendError(res, errors.sig.INVMSG)

      // Extract arguments
      const argXpub = req.params.xpub
      const argAddr = req.body.address
      const argSig = req.body.signature
      const argMsg = req.body.message
      
      // Translate xpub if needed
      try {
        const ret = this.xlatHdAccount(argXpub)
        xpub = ret.xpub
        scheme = ret.scheme
      } catch(e) {
        return HttpServer.sendError(res, e)
      }

      try {
        // Check the signature and process the request
        await hdaService.verifyXpubSignature(xpub, argAddr, argSig, argMsg, scheme)
        const lock = (argMsg == 'unlock') ? false : true
        const ret = await hdaService.lockHdAccount(xpub, lock)
        HttpServer.sendOkData(res, {derivation: ret})
      } catch(e) {
        HttpServer.sendError(res, errors.generic.GEN)
      }

    } finally {
      debugApi && Logger.info(`API : Completed POST /xpub/${req.params.xpub}/lock`)
    }
  }

  /**
   * Handle XPub DELETE request
   * @param {object} req - http request object
   * @param {object} res - http response object
   */
  async deleteXpub(req, res) {
    try {
      let xpub, scheme

      // Check request arguments
      if (!req.body)
        return HttpServer.sendError(res, errors.body.NODATA)

      if (!req.body.address)
        return HttpServer.sendError(res, errors.body.NOADDR)

      if (!req.body.signature)
        return HttpServer.sendError(res, errors.body.NOSIG)

      // Extract arguments
      const argXpub = req.params.xpub
      const argAddr = req.body.address
      const argSig = req.body.signature
      
      // Translate xpub if needed
      try {
        const ret = this.xlatHdAccount(argXpub)
        xpub = ret.xpub
        scheme = ret.scheme
      } catch(e) {
        return HttpServer.sendError(res, e)
      }

      try {
        // Check the signature and process the request
        await hdaService.verifyXpubSignature(xpub, argAddr, argSig, argXpub, scheme)
        await hdaService.deleteHdAccount(xpub)
        HttpServer.sendOk(res)
      } catch(e) {
        HttpServer.sendError(res, e)
      }

    } catch(e) {
      HttpServer.sendError(res, errors.generic.GEN)

    } finally {
      debugApi && Logger.info(`API : Completed DELETE /xpub/${req.params.xpub}`)
    }
  }

  /**
   * Translate a ypub/zpub into a xpub
   * @param {string} origXpub - original hd account
   * @param {boolean} trace - flag indicating if we shoudl trace the conversion in our logs
   * @returns {object} returns an object {xpub: <translated_xpub>, scheme: <derivation_scheme>}
   *  or raises an exception
   */
  xlatHdAccount(origXpub, trace) {
    try {
      // Translate xpub if needed
      let xpub = origXpub
      let scheme = hdaHelper.BIP44

      const isYpub = hdaHelper.isYpub(origXpub)
      const isZpub = hdaHelper.isZpub(origXpub)

      if (isYpub || isZpub) {
        xpub = hdaHelper.xlatXPUB(origXpub)
        scheme = isYpub ? hdaHelper.BIP49 : hdaHelper.BIP84
        if (trace) {
          Logger.info('API : Converted: ' + origXpub)
          Logger.info('API : Resulting xpub: ' + xpub)
        }
      }

      if (!hdaHelper.isValid(xpub))
        throw errors.xpub.INVALID

      return {
        xpub: xpub,
        scheme: scheme
      }

    } catch(e) {
      const err = (e == errors.xpub.PRIVKEY) ? e : errors.xpub.INVALID
      throw err
    }
  }

  /**
   * Validate arguments of postXpub requests
   * @param {object} req - http request object
   * @param {object} res - http response object
   * @param {function} next - next express middleware
   */
  validateArgsPostXpub(req, res, next) {
    const isValidXpub = validator.isAlphanumeric(req.body.xpub)

    const isValidSegwit = 
      !req.body.segwit
      || validator.isAlphanumeric(req.body.segwit)

    const isValidType = 
      !req.body.type
      || validator.isAlphanumeric(req.body.type)

    const isValidForce = 
      !req.body.force
      || validator.isAlphanumeric(req.body.force)

    if (!(isValidXpub && isValidSegwit && isValidType && isValidForce)) {
      HttpServer.sendError(res, errors.body.INVDATA)
      Logger.error(
        req.body,
        'API : XpubRestApi.validateArgsPostXpub() : Invalid arguments'
      )
    } else {
      next()
    }
  }

  /**
   * Validate arguments of getXpub requests
   * @param {object} req - http request object
   * @param {object} res - http response object
   * @param {function} next - next express middleware
   */
  validateArgsGetXpub(req, res, next) {
    const isValidXpub = validator.isAlphanumeric(req.params.xpub)

    if (!isValidXpub) {
      HttpServer.sendError(res, errors.body.INVDATA)
      Logger.error(
        req.params.xpub,
        'API : XpubRestApi.validateArgsGetXpub() : Invalid arguments'
      )
    } else {
      next()
    }
  }

  /**
   * Validate arguments of postLockXpub requests
   * @param {object} req - http request object
   * @param {object} res - http response object
   * @param {function} next - next express middleware
   */
  validateArgsPostLockXpub(req, res, next) {
    const isValidXpub = validator.isAlphanumeric(req.params.xpub)
    const isValidAddr = validator.isAlphanumeric(req.body.address)
    const isValidSig = validator.isBase64(req.body.signature)
    const isValidMsg = validator.isAlphanumeric(req.body.message)

    if (!(isValidXpub && isValidAddr && isValidSig && isValidMsg)) {
      HttpServer.sendError(res, errors.body.INVDATA)
      Logger.error(
        req.params,
        'API : XpubRestApi.validateArgsPostLockXpub() : Invalid arguments'
      )
      Logger.error(req.body, '')
    } else {
      next()
    }
  }

  /**
   * Validate arguments of deleteXpub requests
   * @param {object} req - http request object
   * @param {object} res - http response object
   * @param {function} next - next express middleware
   */
  validateArgsDeleteXpub(req, res, next) {
    const isValidXpub = validator.isAlphanumeric(req.params.xpub)
    const isValidAddr = validator.isAlphanumeric(req.body.address)
    const isValidSig = validator.isBase64(req.body.signature)

    if (!(isValidXpub && isValidAddr && isValidSig)) {
      HttpServer.sendError(res, errors.body.INVDATA)
      Logger.error(
        req.params,
        'API : XpubRestApi.validateArgsDeleteXpub() : Invalid arguments'
      )
      Logger.error(req.body, '')
    } else {
      next()
    }
  }

}

module.exports = XPubRestApi
