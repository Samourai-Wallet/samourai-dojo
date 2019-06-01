/*!
 * lib/auth/auth-rest-api.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const bodyParser = require('body-parser')
const passport = require('passport')
const network = require('../bitcoin/network')
const keys = require('../../keys/')[network.key]
const HttpServer = require('../http-server/http-server')
const authentMgr = require('./authentication-manager')
const authorzMgr = require('./authorizations-manager')


/**
 * Auth API endpoints
 */
class AuthRestApi {

  /**
   * Constructor
   * @param {pushtx.HttpServer} httpServer - HTTP server
   */
  constructor(httpServer) {
    this.httpServer = httpServer

    // Initialize passport
    this.httpServer.app.use(passport.initialize())

    // Check if authentication is activated
    if (keys.auth.activeStrategy == null)
      return

    // Establish routes
    const urlencodedParser = bodyParser.urlencoded({ extended: true })

    this.httpServer.app.post(
      '/auth/login',
      urlencodedParser,
      authentMgr.authenticate({session: false}),
      authentMgr.serialize,
      authorzMgr.generateAuthorizations.bind(authorzMgr),
      this.login.bind(this),
      HttpServer.sendAuthError
    )

    this.httpServer.app.post(
      '/auth/logout',
      urlencodedParser,
      authorzMgr.revokeAuthorizations.bind(authorzMgr),
      this.logout.bind(this),
      HttpServer.sendAuthError
    )

    this.httpServer.app.post(
      '/auth/refresh',
      urlencodedParser,
      authorzMgr.refreshAuthorizations.bind(authorzMgr),
      this.refresh.bind(this),
      HttpServer.sendAuthError
    )
  }

  /**
   * Login
   * @param {object} req - http request object
   * @param {object} res - http response object
   */
  login(req, res) {
    try {
      const result = {authorizations: req.authorizations}
      const ret = JSON.stringify(result, null, 2)
      HttpServer.sendRawData(res, ret)
    } catch(e) {
      HttpServer.sendError(res, e)
    }
  }

  /**
   * Refresh
   * @param {object} req - http request object
   * @param {object} res - http response object
   */
  refresh(req, res) {
    try {
      const result = {authorizations: req.authorizations}
      const ret = JSON.stringify(result, null, 2)
      HttpServer.sendRawData(res, ret)
    } catch(e) {
      HttpServer.sendError(res, e)
    }
  }

  /**
   * Logout
   * @param {object} req - http request object
   * @param {object} res - http response object
   */
  logout(req, res) {
    HttpServer.sendOk(res)
  }

}

module.exports = AuthRestApi
