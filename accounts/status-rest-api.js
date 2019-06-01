/*!
 * accounts/status-rest-api.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const Logger = require('../lib/logger')
const network = require('../lib/bitcoin/network')
const keys = require('../keys')[network.key]
const authMgr = require('../lib/auth/authorizations-manager')
const HttpServer = require('../lib/http-server/http-server')
const status = require('./status')

const debugApi = !!(process.argv.indexOf('api-debug') > -1)


/**
 * Status API endpoints
 */
class StatusRestApi {

  /**
   * Constructor
   * @param {pushtx.HttpServer} httpServer - HTTP server
   */
  constructor(httpServer) {
    this.httpServer = httpServer

    // Establish routes
    this.httpServer.app.get(
      `/${keys.prefixes.status}/`,
      authMgr.checkHasAdminProfile.bind(authMgr),
      this.getStatus.bind(this),
      HttpServer.sendAuthError
    )
  }

  /**
   * Return information about the api
   * @param {object} req - http request object
   * @param {object} res - http response object
   */
  async getStatus(req, res) {
    try {
      const currStatus = await status.getCurrent()
      HttpServer.sendRawData(res, JSON.stringify(currStatus, null, 2))
    } catch(e) {
      HttpServer.sendError(res, e)
    } finally {
      debugApi && Logger.info(`Completed GET /status`)
    }
  }

}

module.exports = StatusRestApi
