/*!
 * lib/auth/localapikey-strategy-configurator.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const passport = require('passport')
const Strategy = require('passport-localapikey-update').Strategy
const network = require('../bitcoin/network')
const keys = require('../../keys/')[network.key]
const errors = require('../errors')
const Logger = require('../logger')
const authorzMgr = require('./authorizations-manager')


/**
 * A Passport configurator for a local API key strategy
 */
class LocalApiKeyStrategyConfigurator {

  /**
   * Constructor
   */
  constructor() {}

  /**
   * Configure the strategy
   */
  configure() {
    const strategy = new Strategy({apiKeyField: 'apikey'}, this.authenticate)
    passport.use(LocalApiKeyStrategyConfigurator.NAME, strategy)
  }

  /**
   * Authentication
   * @param {object} req - http request object
   * @param {string} apiKey - api key received
   * @param {function} done - callback
   */
  authenticate(apiKey, done) {
    const _adminKey = keys.auth.strategies[LocalApiKeyStrategyConfigurator.NAME].adminKey
    const _apiKeys = keys.auth.strategies[LocalApiKeyStrategyConfigurator.NAME].apiKeys

    if (apiKey == _adminKey) {
      // Check if received key is a valid api key
      Logger.info('Successful authentication with an admin key')
      return done(null, {'profile': authorzMgr.TOKEN_PROFILE_ADMIN})
    } else if (_apiKeys.indexOf(apiKey) >= 0) {
      // Check if received key is a valid api key
      Logger.info('Successful authentication with an api key')
      return done(null, {'profile': authorzMgr.TOKEN_PROFILE_API})
    } else {
      Logger.error(null, `Authentication failure (apikey=${apiKey})`)
      return done('Invalid API key', false)
    }
  }

}

LocalApiKeyStrategyConfigurator.NAME = 'localApiKey'

module.exports = LocalApiKeyStrategyConfigurator
