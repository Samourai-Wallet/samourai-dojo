/*!
 * tracker/tracker-rest-api.js
 * Copyright (c) 2016-2019, Samourai Wallet (CC BY-NC-ND 4.0 License).
 */
'use strict'

const qs = require('querystring')
const validator = require('validator')
const bodyParser = require('body-parser')
const Logger = require('../lib/logger')
const errors = require('../lib/errors')
const authMgr = require('../lib/auth/authorizations-manager')
const HttpServer = require('../lib/http-server/http-server')
const network = require('../lib/bitcoin/network')
const keys = require('../keys')[network.key]


/**
 * Tracker API endpoints
 */
class TrackerRestApi {

  /**
   * Constructor
   * @param {pushtx.HttpServer} httpServer - HTTP server
   * @param {tracker.Tracker} tracker - tracker
   */
  constructor(httpServer, tracker) {
    this.httpServer = httpServer
    this.tracker = tracker

    const urlencodedParser = bodyParser.urlencoded({ extended: true })

    // Establish routes. Proxy server strips /pushtx
    this.httpServer.app.get(
      `/${keys.prefixes.support}/rescan`,
      authMgr.checkHasAdminProfile.bind(authMgr),
      this.getBlocksRescan.bind(this),
      HttpServer.sendAuthError
    )
  }

  /**
   * Rescan a range of blocks
   */
  async getBlocksRescan(req, res) {
    // Check request arguments
    if (!req.query)
      return HttpServer.sendError(res, errors.body.INVDATA)

    if (!req.query.fromHeight || !validator.isInt(req.query.fromHeight))
      return HttpServer.sendError(res, errors.body.INVDATA)

    if (req.query.toHeight && !validator.isInt(req.query.toHeight))
      return HttpServer.sendError(res, errors.body.INVDATA)

    // Retrieve the request arguments
    const fromHeight = parseInt(req.query.fromHeight)
    const toHeight = req.query.toHeight ? parseInt(req.query.toHeight) : fromHeight

    if (req.query.toHeight && (toHeight < fromHeight))
      return HttpServer.sendError(res, errors.body.INVDATA)

    try {
      await this.tracker.blockchainProcessor.rescanBlocks(fromHeight, toHeight)
      const ret = {
        status: 'Rescan complete',
        fromHeight: fromHeight,
        toHeight: toHeight
      }
      HttpServer.sendRawData(res, JSON.stringify(ret, null, 2))
    } catch(e) {
      return HttpServer.sendError(res, e)
    }
  }

}

module.exports = TrackerRestApi
