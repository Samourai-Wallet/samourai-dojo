/*!
 * lib/auth/authentication-manager.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const passport = require('passport')
const network = require('../bitcoin/network')
const keys = require('../../keys/')[network.key]
const errors = require('../errors')
const Logger = require('../logger')


/**
 * A singleton managing the authentication to the API
 */
class AuthenticationManager {

  /**
   * Constructor
   */
  constructor() {
    this.activeStrategyName = ''
    this.activeStrategy = null
    // Configure the authentication strategy
    this._configureStrategy()
  }

  /**
   * Configure the active strategy
   */
  _configureStrategy() {
    if (keys.auth.activeStrategy) {
      this.activeStrategyName = keys.auth.activeStrategy

      try {
        const configuratorName = keys.auth.strategies[this.activeStrategyName].configurator
        const Configurator= require(`./${configuratorName}`)

        if (Configurator) {
          this.activeStrategy = new Configurator()
          this.activeStrategy.configure()
          Logger.info(`Authentication strategy ${this.activeStrategyName} successfully configured`)
        }

      } catch(e) {
        Logger.error(e, errors.auth.INVALID_CONF)
      }
    }
  }

  /**
   * Authenticate a user
   * @param {Object} options
   */
  authenticate(options) {
    return passport.authenticate(this.activeStrategyName, options)
  }

  /**
   * Serialize user's information
   * @param {Object} req - http request object
   * @param {Object} res - http response object
   * @param {function} next - callback
   */
  serialize(req, res, next) {
    if (req.user == null)
      req.user = {}

    req.user['authenticated'] = true
    next()
  }

}


module.exports = new AuthenticationManager()
