/*!
 * accounts/transactions-fees-rest-api.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const validator = require('validator')
const Logger = require('../lib/logger')
const errors = require('../lib/errors')
const rpcTxns = require('../lib/bitcoind-rpc/transactions')
const authMgr = require('../lib/auth/authorizations-manager')
const HttpServer = require('../lib/http-server/http-server')
const walletService = require('../lib/wallet/wallet-service')
const network = require('../lib/bitcoin/network')
const apiHelper = require('./api-helper')
const keys = require('../keys')[network.key]

const debugApi = !!(process.argv.indexOf('api-debug') > -1)


/**
 * Transactions API endpoints
 */
class TransactionsRestApi {

  /**
   * Constructor
   * @param {pushtx.HttpServer} httpServer - HTTP server
   */
  constructor(httpServer) {
    this.httpServer = httpServer

    // Establish routes
    this.httpServer.app.get(
      '/tx/:txid',
      authMgr.checkAuthentication.bind(authMgr),
      this.validateArgsGetTransaction.bind(this),
      this.getTransaction.bind(this),
      HttpServer.sendAuthError
    )

    this.httpServer.app.get(
      '/txs',
      authMgr.checkAuthentication.bind(authMgr),
      apiHelper.validateEntitiesParams.bind(apiHelper),
      this.validateArgsGetTransactions.bind(this),
      this.getTransactions.bind(this),
      HttpServer.sendAuthError
    )
  }

  /**
   * Retrieve the transaction for a given tiid
   * @param {object} req - http request object
   * @param {object} res - http response object
   */
  async getTransaction(req, res) {
    try {
      const tx = await rpcTxns.getTransaction(req.params.txid, req.query.fees)
      const ret = JSON.stringify(tx, null, 2)
      HttpServer.sendRawData(res, ret)
    } catch(e) {
      HttpServer.sendError(res, e)
    } finally {
      const strParams = `${req.query.fees ? req.query.fees : ''}`
      debugApi && Logger.info(`Completed GET /tx/${req.params.txid} ${strParams}`)
    }
  }


  /**
   * Retrieve a page of transactions related to a wallet
   * @param {object} req - http request object
   * @param {object} res - http response object
   */
  async getTransactions(req, res) {
    try {
      // Check request params
      if (!apiHelper.checkEntitiesParams(req.query))
        return HttpServer.sendError(res, errors.multiaddr.NOACT)

      // Parse params
      const active = apiHelper.parseEntities(req.query.active)
      const page = req.query.page != null ? parseInt(req.query.page) : 0
      const count = req.query.count != null ? parseInt(req.query.count) : keys.multiaddr.transactions

      const result = await walletService.getWalletTransactions(active, page, count)
      const ret = JSON.stringify(result, null, 2)
      HttpServer.sendRawData(res, ret)

    } catch(e) {
      HttpServer.sendError(res, e)

    } finally {
      const strParams =
        `${req.query.active} \
        ${req.query.page ? req.query.page : ''} \
        ${req.query.count ? req.query.count : ''}`

      debugApi && Logger.info(`Completed GET /txs ${strParams}`)
    }
  }

  /**
   * Validate arguments of /tx requests
   * @param {object} req - http request object
   * @param {object} res - http response object
   * @param {function} next - next express middleware
   */
  validateArgsGetTransaction(req, res, next) {
    const isValidTxid = validator.isHash(req.params.txid, 'sha256')

    const isValidFees =
      !req.query.fees
      || validator.isAlphanumeric(req.query.fees)

    if (!(isValidTxid && isValidFees)) {
      HttpServer.sendError(res, errors.body.INVDATA)
      Logger.error(
        req.params,
        'HeadersRestApi.validateArgsGetTransaction() : Invalid arguments'
      )
      Logger.error(req.query, '')
    } else {
      next()
    }
  }

  /**
   * Validate arguments of /txs requests
   * @param {object} req - http request object
   * @param {object} res - http response object
   * @param {function} next - next express middleware
   */
  validateArgsGetTransactions(req, res, next) {
    const isValidPage =
      !req.query.page
      || validator.isInt(req.query.page)

    const isValidCount =
      !req.query.count
      || validator.isInt(req.query.count)

    if (!(isValidPage && isValidCount)) {
      HttpServer.sendError(res, errors.body.INVDATA)
      Logger.error(
        req.query,
        'HeadersRestApi.validateArgsGetTransactions() : Invalid arguments'
      )
    } else {
      next()
    }
  }
}

module.exports = TransactionsRestApi
