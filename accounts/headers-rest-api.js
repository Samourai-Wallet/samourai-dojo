/*!
 * accounts/headers-fees-rest-api.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const validator = require('validator')
const Logger = require('../lib/logger')
const errors = require('../lib/errors')
const rpcHeaders = require('../lib/bitcoind-rpc/headers')
const authMgr = require('../lib/auth/authorizations-manager')
const HttpServer = require('../lib/http-server/http-server')
const apiHelper = require('./api-helper')

const debugApi = !!(process.argv.indexOf('api-debug') > -1)


/**
 * Headers API endpoints
 */
class HeadersRestApi {

  /**
   * Constructor
   * @param {pushtx.HttpServer} httpServer - HTTP server
   */
  constructor(httpServer) {
    this.httpServer = httpServer

    // Establish routes
    this.httpServer.app.get(
      '/header/:hash',
      authMgr.checkAuthentication.bind(authMgr),
      this.validateArgsGetHeader.bind(this),
      this.getHeader.bind(this),
      HttpServer.sendAuthError
    )
  }

  /**
   * Retrieve the block header for a given hash
   * @param {object} req - http request object
   * @param {object} res - http response object
   */
  async getHeader(req, res) {
    try {
      const header = await rpcHeaders.getHeader(req.params.hash)
      HttpServer.sendRawData(res, header)
    } catch(e) {
      HttpServer.sendError(res, e)
    } finally {
      debugApi && Logger.info(`API : Completed GET /header/${req.params.hash}`)
    }
  }

  /**
   * Validate request arguments
   * @param {object} req - http request object
   * @param {object} res - http response object
   * @param {function} next - next express middleware
   */
  validateArgsGetHeader(req, res, next) {
    const isValidHash = validator.isHash(req.params.hash, 'sha256')

    if (!isValidHash) {
      HttpServer.sendError(res, errors.body.INVDATA)
      Logger.error(
        req.params.hash,
        'API : HeadersRestApi.validateArgsGetHeader() : Invalid hash'
      )
    } else {
      next()
    }
  }

}

module.exports = HeadersRestApi
