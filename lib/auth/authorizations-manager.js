/*!
 * lib/auth/authorizations-manager.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const validator = require('validator')
const jwt = require('jsonwebtoken')
const network = require('../bitcoin/network')
const keys = require('../../keys/')[network.key]
const errors = require('../errors')
const Logger = require('../logger')


/**
 * A singleton managing authorizations the API
 */
class AuthorizationsManager {

  /**
   * Constructor
   */
  constructor() {
    try {
      // Constants
      this.ISS = 'Samourai Wallet backend'
      this.TOKEN_TYPE_ACCESS = 'access-token'
      this.TOKEN_TYPE_REFRESH = 'refresh-token'
      this.TOKEN_PROFILE_API = 'api'
      this.TOKEN_PROFILE_ADMIN = 'admin'

      this.authActive = (keys.auth.activeStrategy != null)
      this._secret = keys.auth.jwt.secret
      this.isMandatory = keys.auth.mandatory
      this.accessTokenExpires = keys.auth.jwt.accessToken.expires
      this.refreshTokenExpires = keys.auth.jwt.refreshToken.expires
    } catch(e) {
      this._secret = null
      Logger.error(e, errors.auth.INVALID_CONF)
    }
  }


  /**
   * Middleware generating authorization token
   * @param {Object} req - http request object
   * @param {Object} res - http response object
   * @param {function} next - callback
   */
  generateAuthorizations(req, res, next) {
    if (!(req.user && req.user.authenticated))
      return next(errors.auth.TECH_ISSUE)

    // Generates an access token
    const accessToken = this._generateAccessToken(req.user)

    // Generates a refresh token
    const refreshToken = this._generateRefreshToken(req.user)

    // Stores the tokens in the request
    req.authorizations = {
      access_token: accessToken,
      refresh_token: refreshToken
    }

    next()
  }

  /**
   * Middleware refreshing authorizations
   * @param {Object} req - http request object
   * @param {Object} res - http response object
   * @param {function} next - callback
   */
  refreshAuthorizations(req, res, next) {
    // Check if authentication is activated
    if (!this.authActive)
      return next()

    // Authentication is activated
    // A refresh token is required
    const refreshToken = this._extractRefreshToken(req)
    if (!refreshToken)
      return next(errors.auth.MISSING_JWT)

    try {
      const decodedRefrehToken = this._verifyRefreshToken(refreshToken)
      if (req.user == null)
        req.user = {}
      req.user['profile'] = decodedRefrehToken['prf']
    } catch(e) {
      Logger.error(e, `${errors.auth.INVALID_JWT}: ${refreshToken}`)
      return next(errors.auth.INVALID_JWT)
    }

    // Generates a new access token
    const accessToken = this._generateAccessToken(req.user)

    // Stores the access token in the request
    req.authorizations = {
      access_token: accessToken
    }

    next()
  }

  /**
   * Middleware revoking authorizations
   * @param {Object} req - http request object
   * @param {Object} res - http response object
   * @param {function} next - callback
   */
  revokeAuthorizations(req, res, next) {
    // Nothing to do (for now)
  }

  /**
   * Middleware checking if user is authenticated
   * @param {Object} req - http request object
   * @param {Object} res - http response object
   * @param {function} next - callback
   * @returns {boolean} returns true if user is authenticated, false otherwise
   */
  checkAuthentication(req, res, next) {
    // Check if authentication is activated
    if (!this.authActive)
      return next()

    // Authentication is activated
    // A JSON web token is required
    const token = this._extractAccessToken(req)

    if (this.isMandatory || token) {
      try {
        const decodedToken = this.isAuthenticated(token)
        req.authorizations = {decoded_access_token: decodedToken}
        next()
      } catch (e) {
        return next(e)
      }
    } else {
      next()
    }
  }

  /**
   * Middleware checking if user is authenticated and has admin profile
   * @param {Object} req - http request object
   * @param {Object} res - http response object
   * @param {function} next - callback
   * @returns {boolean} returns true if user is authenticated and has admin profile, false otherwise
   */
  checkHasAdminProfile(req, res, next) {
    // Check if authentication is activated
    if (!this.authActive)
      return next()

    // Authentication is activated
    // A JSON web token is required
    const token = this._extractAccessToken(req)

    try {
      const decodedToken = this.isAuthenticated(token)
      if (decodedToken['prf'] == this.TOKEN_PROFILE_ADMIN) {
        req.authorizations = {decoded_access_token: decodedToken}
        next()
      } else {
        return next(errors.auth.INVALID_PRF)
      }
    } catch (e) {
      return next(e)
    }
  }

  /**
   * Check if user is authenticated 
   * (i.e. we have received a valid json web token)
   * @param {string} token - json web token
   * @returns {boolean} returns the decoded token if valid
   * throws an exception otherwise
   */
  isAuthenticated(token) {
    if (!token) {
      Logger.error(null, `${errors.auth.MISSING_JWT}`)
      throw errors.auth.MISSING_JWT
    }

    try {
      return this._verifyAccessToken(token)
    } catch(e) {
      //Logger.error(e, `${errors.auth.INVALID_JWT}: ${token}`)
      throw errors.auth.INVALID_JWT
    }
  }

  /**
   * Generate an access token
   * @param {Object} user - user's information
   * @returns {Object} returns a json web token
   */
  _generateAccessToken(user) {
    // Builds claims
    const claims = {
      'iss': this.ISS,
      'type': this.TOKEN_TYPE_ACCESS,
      'prf': user['profile']
    }

    // Builds and signs the access token
    return jwt.sign(
      claims,
      this._secret,
      {expiresIn: this.accessTokenExpires}
    )
  }

  /**
   * Extract the access token from the http request
   * @param {Object} req - http request object
   * @returns {Object} returns the json web token
   */
  _extractAccessToken(req) {
    const token = this._extractBearerAuthorizationHeader(req)
    if (token)
      return token

    if (req.body && req.body.at && validator.isJWT(req.body.at))
      return req.body.at

    if (req.query && req.query.at && validator.isJWT(req.query.at))
      return req.query.at

    return null
  }

  /**
   * Verify an access token
   * @param {Object} token - json web token
   * @returns {Object} payload of the json web token
   */
  _verifyAccessToken(token) {
    const payload = jwt.verify(token, this._secret, {})

    if (payload['type'] != this.TOKEN_TYPE_ACCESS)
      throw errors.auth.INVALID_JWT

    return payload
  }

  /**
   * Generate an refresh token
   * @param {Object} user - user's information
   * @returns {Object} returns a json web token
   */
  _generateRefreshToken(user) {
    // Builds claims
    const claims = {
      'iss': this.ISS,
      'type': this.TOKEN_TYPE_REFRESH,
      'prf': user['profile']
    }
    // Builds and signs the access token
    return jwt.sign(
      claims,
      this._secret,
      {expiresIn: this.refreshTokenExpires}
    )
  }

  /**
   * Extract the refresh token from the http request
   * @param {Object} req - http request object
   * @returns {Object} returns the json web token
   */
  _extractRefreshToken(req) {
    const token = this._extractBearerAuthorizationHeader(req)
    if (token)
      return token

    if (req.body && req.body.rt && validator.isJWT(req.body.rt))
      return req.body.rt

    if (req.query && req.query.rt && validator.isJWT(req.query.rt))
      return req.query.rt

    return null
  }

  /**
   * Verify a refresh token
   * @param {Object} token - json web token
   * @returns {Object} payload of the json web token
   */
  _verifyRefreshToken(token) {
    const payload = jwt.verify(token, this._secret, {})

    if (payload['type'] != this.TOKEN_TYPE_REFRESH)
      throw errors.auth.INVALID_JWT

    return payload
  }

  /**
   * Extract a bearer JWT auth token
   * from the Authorization HTTP header
   * Returns null if it doesn't exist or is an onvalid JWT
   * @param {Object} req - http request object
   * @returns {Object} returns the json web token
   */
  _extractBearerAuthorizationHeader(req) {
    if (req.get('Authorization')) {
      const authHeader = req.get('Authorization')
      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        if (validator.isJWT(token))
          return token
      }        
    }
    return null
  }
}

module.exports = new AuthorizationsManager()
