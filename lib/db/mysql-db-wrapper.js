/*!
 * lib/db.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const mysql = require('mysql')
const path = require('path')
const Logger = require('../logger')
const util = require('../util')
const errors = require('../errors')
const hdaHelper = require('../bitcoin/hd-accounts-helper')
const network = require('../bitcoin/network')
const keys = require('../../keys/')[network.key]
const keysDb = keys.db
const debug = !!(process.argv.indexOf('db-debug') > -1)
const queryDebug = !!(process.argv.indexOf('dbquery-debug') > -1)


/**
 * Subqueries used by getAddrAndXpubsNbTransactions()
 */
const SUBQUERY_TXIDS_ADDR = '( \
  SELECT `transactions`.`txnTxid` AS txnTxid \
  FROM `outputs` \
  INNER JOIN `transactions` ON `transactions`.`txnID` = `outputs`.`txnID` \
  INNER JOIN `addresses` ON `addresses`.`addrID` = `outputs`.`addrID` \
  WHERE `addresses`.`addrAddress` IN (?) \
) UNION ( \
  SELECT `transactions`.`txnTxid` AS txnTxid \
  FROM `inputs` \
  INNER JOIN `transactions` ON `transactions`.`txnID` = `inputs`.`txnID` \
  INNER JOIN `outputs` ON `outputs`.`outID` = `inputs`.`outID` \
  INNER JOIN `addresses` ON `addresses`.`addrID` = `outputs`.`addrID` \
  WHERE `addresses`.`addrAddress` IN (?) \
)'

const SUBQUERY_TXIDS_XPUBS = '( \
  SELECT `transactions`.`txnTxid` AS txnTxid \
  FROM `outputs` \
  INNER JOIN `transactions` ON `transactions`.`txnID` = `outputs`.`txnID` \
  INNER JOIN `hd_addresses` ON `hd_addresses`.`addrID` = `outputs`.`addrID` \
  INNER JOIN `hd` ON `hd`.`hdID` = `hd_addresses`.`hdID` \
  WHERE `hd`.`hdXpub` IN (?) \
) UNION ( \
  SELECT `transactions`.`txnTxid` AS txnTxid \
  FROM `inputs` \
  INNER JOIN `transactions` ON `transactions`.`txnID` = `inputs`.`txnID` \
  INNER JOIN `outputs` ON `outputs`.`outID` = `inputs`.`outID` \
  INNER JOIN `hd_addresses` ON `hd_addresses`.`addrID` = `outputs`.`addrID` \
  INNER JOIN `hd` ON `hd`.`hdID` = `hd_addresses`.`hdID` \
  WHERE `hd`.`hdXpub` IN (?) \
)'

/**
 * Subqueries used by getTxsByAddrAndXpubs()
 */
const SUBQUERY_TXS_ADDR = '(\
  SELECT \
    `transactions`.`txnID` AS `txnID`, \
    `transactions`.`txnTxid` AS `txnTxid`, \
    `transactions`.`txnVersion` AS `txnVersion`, \
    `transactions`.`txnLocktime` AS `txnLocktime`, \
    `blocks`.`blockHeight` AS `blockHeight`, \
    LEAST(`transactions`.`txnCreated`, IFNULL(`blocks`.`blockTime`, 32503680000)) AS `time` \
  FROM `transactions` \
  INNER JOIN `outputs` ON `outputs`.`txnID` = `transactions`.`txnID` \
  INNER JOIN `addresses` ON `addresses`.`addrID` = `outputs`.`addrID` \
  LEFT JOIN `blocks` ON `transactions`.`blockID` = `blocks`.`blockID` \
  WHERE `addresses`.`addrAddress` IN (?) \
) UNION DISTINCT (\
  SELECT \
    `transactions`.`txnID` AS `txnID`, \
    `transactions`.`txnTxid` AS `txnTxid`, \
    `transactions`.`txnVersion` AS `txnVersion`, \
    `transactions`.`txnLocktime` AS `txnLocktime`, \
    `blocks`.`blockHeight` AS `blockHeight`, \
    LEAST(`transactions`.`txnCreated`, IFNULL(`blocks`.`blockTime`, 32503680000)) AS `time` \
  FROM `transactions` \
  INNER JOIN `inputs` ON `inputs`.`txnID` = `transactions`.`txnID` \
  INNER JOIN `outputs` ON `outputs`.`outID` = `inputs`.`outID` \
  INNER JOIN `addresses` ON `addresses`.`addrID` = `outputs`.`addrID` \
  LEFT JOIN `blocks` ON `transactions`.`blockID` = `blocks`.`blockID` \
  WHERE `addresses`.`addrAddress` IN (?) \
)'

const SUBQUERY_TXS_XPUB = '(\
  SELECT \
    `transactions`.`txnID` AS `txnID`, \
    `transactions`.`txnTxid` AS `txnTxid`, \
    `transactions`.`txnVersion` AS `txnVersion`, \
    `transactions`.`txnLocktime` AS `txnLocktime`, \
    `blocks`.`blockHeight` AS `blockHeight`, \
    LEAST(`transactions`.`txnCreated`, IFNULL(`blocks`.`blockTime`, 32503680000)) AS `time` \
  FROM `transactions` \
  INNER JOIN `outputs` ON `outputs`.`txnID` = `transactions`.`txnID` \
  INNER JOIN `addresses` ON `addresses`.`addrID` = `outputs`.`addrID` \
  INNER JOIN `hd_addresses` ON `hd_addresses`.`addrID` = `addresses`.`addrID` \
  INNER JOIN `hd` ON `hd`.`hdID` = `hd_addresses`.`hdID` \
  LEFT JOIN `blocks` ON `transactions`.`blockID` = `blocks`.`blockID` \
  WHERE `hd`.`hdXpub` IN (?) \
) UNION DISTINCT (\
  SELECT \
    `transactions`.`txnID` AS `txnID`, \
    `transactions`.`txnTxid` AS `txnTxid`, \
    `transactions`.`txnVersion` AS `txnVersion`, \
    `transactions`.`txnLocktime` AS `txnLocktime`, \
    `blocks`.`blockHeight` AS `blockHeight`, \
    LEAST(`transactions`.`txnCreated`, IFNULL(`blocks`.`blockTime`, 32503680000)) AS `time` \
  FROM `transactions` \
  INNER JOIN `inputs` ON `inputs`.`txnID` = `transactions`.`txnID` \
  INNER JOIN `outputs` ON `outputs`.`outID` = `inputs`.`outID` \
  INNER JOIN `addresses` ON `addresses`.`addrID` = `outputs`.`addrID` \
  INNER JOIN `hd_addresses` ON `hd_addresses`.`addrID` = `addresses`.`addrID` \
  INNER JOIN `hd` ON `hd`.`hdID` = `hd_addresses`.`hdID` \
  LEFT JOIN `blocks` ON `transactions`.`blockID` = `blocks`.`blockID` \
  WHERE `hd`.`hdXpub` IN (?) \
)'

const SUBQUERY_UTXOS_ADDR = '(\
  SELECT \
    `transactions`.`txnID` AS `txnID`, \
    null AS `outIndex`, \
    null AS `outAmount`, \
    null AS `outAddress`, \
    `inputs`.`inIndex` AS `inIndex`, \
    `inputs`.`inSequence` AS `inSequence`, \
    `prevTx`.`txnTxid` AS `inOutTxid`, \
    `outputs`.`outIndex` AS `inOutIndex`, \
    `outputs`.`outAmount` AS `inOutAmount`, \
    `addresses`.`addrAddress` AS `inOutAddress`, \
    null AS `hdAddrChain`, \
    null AS `hdAddrIndex`, \
    null AS `hdXpub` \
  FROM `transactions` \
  INNER JOIN `inputs` ON `inputs`.`txnID` = `transactions`.`txnID` \
  INNER JOIN `outputs` ON `outputs`.`outID` = `inputs`.`outID` \
  INNER JOIN `transactions` AS `prevTx` ON `prevTx`.`txnID` = `outputs`.`txnID` \
  INNER JOIN `addresses` ON `addresses`.`addrID` = `outputs`.`addrID` \
  WHERE \
    `transactions`.`txnID` IN (?) AND \
    `addresses`.`addrAddress` IN (?) \
) UNION ( \
  SELECT \
    `transactions`.`txnID` AS `txnID`, \
    `outputs`.`outIndex` AS `outIndex`, \
    `outputs`.`outAmount` AS `outAmount`, \
    `addresses`.`addrAddress` AS `outAddress`, \
    null AS `inIndex`, \
    null AS `inSequence`, \
    null AS `inOutTxid`, \
    null AS `inOutIndex`, \
    null AS `inOutAmount`, \
    null AS `inOutAddress`, \
    null AS `hdAddrChain`, \
    null AS `hdAddrIndex`, \
    null AS `hdXpub` \
  FROM `transactions` \
  INNER JOIN `outputs` ON `outputs`.`txnID` = `transactions`.`txnID` \
  INNER JOIN `addresses` ON `addresses`.`addrID` = `outputs`.`addrID` \
  WHERE \
    `transactions`.`txnID` IN (?) AND \
    `addresses`.`addrAddress` IN (?) \
)'

const SUBQUERY_UTXOS_XPUB = '(\
  SELECT \
    `transactions`.`txnID` AS `txnID`, \
    null AS `outIndex`, \
    null AS `outAmount`, \
    null AS `outAddress`, \
    `inputs`.`inIndex` AS `inIndex`, \
    `inputs`.`inSequence` AS `inSequence`, \
    `prevTx`.`txnTxid` AS `inOutTxid`, \
    `outputs`.`outIndex` AS `inOutIndex`, \
    `outputs`.`outAmount` AS `inOutAmount`, \
    `addresses`.`addrAddress` AS `inOutAddress`, \
    `hd_addresses`.`hdAddrChain` AS `hdAddrChain`, \
    `hd_addresses`.`hdAddrIndex` AS `hdAddrIndex`, \
    `hd`.`hdXpub` AS `hdXpub` \
  FROM `transactions` \
  INNER JOIN `inputs` ON `inputs`.`txnID` = `transactions`.`txnID` \
  INNER JOIN `outputs` ON `outputs`.`outID` = `inputs`.`outID` \
  INNER JOIN `transactions` AS `prevTx` ON `prevTx`.`txnID` = `outputs`.`txnID` \
  INNER JOIN `addresses` ON `addresses`.`addrID` = `outputs`.`addrID` \
  INNER JOIN `hd_addresses` ON `hd_addresses`.`addrID` = `addresses`.`addrID` \
  INNER JOIN `hd` ON `hd`.`hdID` = `hd_addresses`.`hdID` \
  WHERE \
    `transactions`.`txnID` IN (?) AND \
    `hd`.`hdXpub` IN (?) \
) UNION ( \
  SELECT \
    `transactions`.`txnID` AS `txnID`, \
    `outputs`.`outIndex` AS `outIndex`, \
    `outputs`.`outAmount` AS `outAmount`, \
    `addresses`.`addrAddress` AS `outAddress`, \
    null AS `inIndex`, \
    null AS `inSequence`, \
    null AS `inOutTxid`, \
    null AS `inOutIndex`, \
    null AS `inOutAmount`, \
    null AS `inOutAddress`, \
    `hd_addresses`.`hdAddrChain` AS `hdAddrChain`, \
    `hd_addresses`.`hdAddrIndex` AS `hdAddrIndex`, \
    `hd`.`hdXpub` AS `hdXpub` \
  FROM `transactions` \
  INNER JOIN `outputs` ON `outputs`.`txnID` = `transactions`.`txnID` \
  INNER JOIN `addresses` ON `addresses`.`addrID` = `outputs`.`addrID` \
  INNER JOIN `hd_addresses` ON `hd_addresses`.`addrID` = `addresses`.`addrID` \
  INNER JOIN `hd` ON `hd`.`hdID` = `hd_addresses`.`hdID` \
  WHERE \
    `transactions`.`txnID` IN (?) AND \
    `hd`.`hdXpub` IN (?) \
)'

const SUBQUERY_GET_TX_OUTS = 'SELECT \
    `transactions`.`txnID`, \
    `transactions`.`txnTxid`, \
    `transactions`.`txnCreated`, \
    `transactions`.`txnVersion`, \
    `transactions`.`txnLocktime`, \
    `blocks`.`blockHeight`, \
    `blocks`.`blockTime`, \
    `outputs`.`outID`, \
    `outputs`.`outIndex`, \
    `outputs`.`outAmount`, \
    `outputs`.`outScript`, \
    `addresses`.`addrAddress`, \
    `hd_addresses`.`hdAddrChain`, \
    `hd_addresses`.`hdAddrIndex`, \
    `hd`.`hdXpub` \
  FROM `transactions` \
  INNER JOIN `outputs` ON `transactions`.`txnID` = `outputs`.`txnID` \
  INNER JOIN `addresses` ON `outputs`.`addrID` = `addresses`.`addrID` \
  LEFT JOIN `hd_addresses` ON `outputs`.`addrID` = `hd_addresses`.`addrID` \
  LEFT JOIN `hd` ON `hd_addresses`.`hdID` = `hd`.`hdID` \
  LEFT JOIN `blocks` ON `transactions`.`blockID` = `blocks`.`blockID` \
  WHERE `transactions`.`txnTxid` = ? \
  ORDER BY `outputs`.`outIndex` ASC'

const SUBQUERY_GET_TX_INS = 'SELECT \
    `t_in`.`txnTxid`, \
    `t_in`.`txnCreated`, \
    `t_in`.`txnVersion`, \
    `t_in`.`txnLocktime`, \
    `blocks`.`blockHeight`, \
    `blocks`.`blockTime`, \
    `t_out`.`txnTxid` AS `prevOutTxid`, \
    `inputs`.`inIndex`, \
    `inputs`.`inSequence`, \
    `inputs`.`outID`, \
    `outputs`.`outIndex`, \
    `outputs`.`outAmount`, \
    `outputs`.`outScript`, \
    `addresses`.`addrAddress`, \
    `hd_addresses`.`hdAddrChain`, \
    `hd_addresses`.`hdAddrIndex`, \
    `hd`.`hdXpub` \
  FROM `inputs` \
  INNER JOIN `outputs` ON `outputs`.`outID` = `inputs`.`outID` \
  INNER JOIN `transactions` AS `t_in` ON `t_in`.`txnID` = `inputs`.`txnID` \
  INNER JOIN `transactions` AS `t_out` ON `t_out`.`txnID` = `outputs`.`txnID` \
  INNER JOIN `addresses` ON `outputs`.`addrID` = `addresses`.`addrID` \
  LEFT JOIN `hd_addresses` ON `outputs`.`addrID` = `hd_addresses`.`addrID` \
  LEFT JOIN `hd` ON `hd_addresses`.`hdID` = `hd`.`hdID` \
  LEFT JOIN `blocks` ON `t_in`.`blockID` = `blocks`.`blockID` \
  WHERE `t_in`.`txnTxid` = ? \
  ORDER BY `inputs`.`inIndex` ASC'


/**
 * A singleton providing a MySQL db wrapper
 * Node-mysql doc: https://github.com/felixge/node-mysql
 */
class MySqlDbWrapper {

  /**
   * Constructor
   */
  constructor() {
    this.dbConfig = null
    // Db connections pool
    this.pool = null
    // Lock preventing multiple reconnects
    this.lockReconnect = false
    // Timer managing reconnects
    this.timerReconnect = null
  }

  /**
   * Connect the wrapper to the database
   * @param {object} dbConfig - database configuration
   */
  connect(dbConfig) {
    this.dbConfig = dbConfig

    try {
      if (this.pool)
        this.handleReconnect()
      else
        this.handleConnect()
    } catch(e) {
      this.handleReconnect()
    }

    setInterval(this.ping.bind(this), 30000)
  }

  /**
   * Connect the wrapper to the mysql server
   */
  handleConnect() {
    try {
      this.pool = mysql.createPool(this.dbConfig)
      Logger.info(`Created a database pool of ${this.dbConfig.connectionLimit} connections`)

      if (debug) {
        this.pool.on('acquire', function (conn) {
          Logger.info(`Connection ${conn.threadId} acquired`)
        })
        this.pool.on('enqueue', function (conn) {
          Logger.info('Waiting for a new connection slot')
        })
        this.pool.on('release', function (conn) {
          Logger.info(`Connection ${conn.threadId} released`)
        })
      }
    } catch(e) {
      Logger.error(err, 'MySqlDbWrapper.handleConnect() : Problem met while trying to initialize a new pool')
      throw e
    }
  }

  /**
   * Reconnect the wrapper to the mysql server
   */
  handleReconnect() {
    if (this.pool) {
      // Manage the lock
      if (this.lockReconnect)
        return

      this.lockReconnect = true

      if (this.timerReconnect)
        clearTimeout(this.timerReconnect)

      // Destroy previous pool
      this.pool.end(err => {
        if (err) {
          Logger.error(err, 'MySqlDbWrapper.handleReconnect() : Problem met while terminating the pool')
          this.timerReconnect = setTimeout(this.handleReconnect.bind(this), 2000)
        } else {
          this.handleConnect()
        }
        this.lockReconnect = false
      })
    }
  }

  /**
   * Ping the mysql server
   */
  ping() {
    debug && Logger.info(`MySqlDbWrapper.ping() : ${this.pool._freeConnections.length} free connections`)

    // Iterate over all free connections
    // which might have been disconnected by the mysql server
    for (let c of this.pool._freeConnections) {
      c.query('SELECT 1', (err, res, fields) => {
        if (debug && err) {
          Logger.error(err, `MySqlDbWrapper.ping() : Ping Error`)
        }
      })
    }
  }

  /**
   * Send a query
   */
  async _query(query, retries) {
    queryDebug && Logger.info(query)

    if (retries == null)
      retries = 5

    return new Promise((resolve, reject) => {
      try {
        this.pool.query(query, null, async (err, result, fields) => {
          if (err) {
            // Retry the request on lock errors
            if ((err.code == 'ER_LOCK_DEADLOCK' || 
              err.code == 'ER_LOCK_TIMEOUT' || 
              err.code == 'ER_LOCK_WAIT_TIMEOUT') && (retries > 0)
            ) {
              try {
                this.queryError('Lock detected. Retry request in a few ms', query)
                const sleepMillis = Math.floor((Math.random() * 100) + 1)
                await new Promise(resolve2 => setTimeout(resolve2, sleepMillis))
                const res = await this._query(query, retries - 1)
                resolve(res)
              } catch(err) {
                reject(err)
              }
            } else {
              reject(err)
            }
          } else {
            queryDebug && Logger.info(result)
            resolve(result)
          }
        })
      } catch(err) {
        this.queryError(err, query)
        reject(err)
      }
    })
  }

  /**
   * Log a query error
   */
  queryError(err, query) {
    Logger.error(err, 'MySqlDbWrapper.query() : Query Error')
    Logger.error(query)
  }

  /**
   * Get the ID of an address
   * @param {string} address - bitcoin address
   * @returns {integer} returns the address id
   */
  async getAddressId(address) {
    const sqlQuery = 'SELECT `addrID` FROM `addresses` WHERE `addrAddress` = ?'
    const params = address
    const query = mysql.format(sqlQuery, params)
    const result = await this._query(query)

    if (result.length > 0)
      return result[0].addrID
    
    throw errors.db.ERROR_NO_ADDRESS
  }

  /**
   * Get the ID of an Address. Ensures that the address exists.
   * @param {string} address - bitcoin address
   * @returns {integer} returns the address id
   */
  async ensureAddressId(address) {
    const sqlQuery = 'SELECT `addrID` FROM `addresses` WHERE `addrAddress` = ?'
    const params = address
    const query = mysql.format(sqlQuery, params)
    const result = await this._query(query)

    if (result.length > 0)
      return result[0].addrID
    
    const sqlQuery2 = 'INSERT INTO `addresses` SET ?'
    const params2 = { addrAddress: address }
    const query2 = mysql.format(sqlQuery2, params2)
    const result2 = await this._query(query2)
    return result2.insertId
  }

  /**
   * Get the IDs of an array of Addresses
   * @param {string[]} addresses - array of bitcoin addresses
   * @returns {object} returns a map of addresses to IDs: {[address]: 100}
   */
  async getAddressesIds(addresses) {
    const ret = {}

    if (addresses.length == 0)
      return ret

    const sqlQuery = 'SELECT * FROM `addresses` WHERE `addrAddress` IN (?)'
    const params = [addresses]
    const query = mysql.format(sqlQuery, params)
    const result = await this._query(query)

    for (let r of result)
      ret[r.addrAddress] = r.addrID

    return ret
  }

  /**
   * Bulk insert addresses.
   * @param {string[]} addresses - array of bitcoin addresses
   */
  async addAddresses(addresses) {
    if (addresses.length == 0)
      return []

    const sqlQuery = 'INSERT IGNORE INTO `addresses` (addrAddress) VALUES ?'
    const params = [addresses.map(a => [a])]
    const query = mysql.format(sqlQuery, params)
    return this._query(query)
  }

  /**
   * Bulk select address entries
   * @param {string[]} addresses - array of bitcoin addresses
   */
  async getAddresses(addresses) {
    if (addresses.length == 0)
      return []

    const sqlQuery = 'SELECT * FROM `addresses` WHERE `addrAddress` IN (?)'
    const params = [addresses]
    const query = mysql.format(sqlQuery, params)
    return this._query(query)
  }

  /**
   * Get address balance.
   * @param {string} address - bitcoin address
   * @returns {integer} returns the balance of the address
   */
  async getAddressBalance(address) {
    if (address == null)
      return null
    
    const sqlQuery = 'SELECT SUM(`outputs`.`outAmount`) as balance \
      FROM `addresses` \
      INNER JOIN `outputs` ON `outputs`.`addrID` = `addresses`.`addrID`  \
      LEFT JOIN `inputs` ON `outputs`.`outID` = `inputs`.`outID` \
      WHERE \
        `inputs`.`outID` IS NULL AND \
        `addresses`.`addrAddress` = ?'

    const params = address
    const query = mysql.format(sqlQuery, params)
    const results = await this._query(query)

    if (results.length == 1) {
      const balance = results[0].balance
      return (balance == null) ? 0 : balance
    }

    return null
  }

  /**
   * Get the number of transactions for an address.
   * @param {string} address - bitcoin address
   * @returns {integer} returns the number of transactions for the address
   */
  async getAddressNbTransactions(address) {
    if(address == null)
      return null

    const sqlQuery = 'SELECT COUNT(DISTINCT `r`.`txnTxid`) AS nbTxs \
      FROM ( \
        ( \
          SELECT `transactions`.`txnTxid` AS txnTxid \
          FROM `outputs` \
          INNER JOIN `transactions` ON `transactions`.`txnID` = `outputs`.`txnID` \
          INNER JOIN `addresses` ON `outputs`.`addrID` = `addresses`.`addrID` \
          WHERE `addresses`.`addrAddress` = ? \
        ) UNION ( \
          SELECT `transactions`.`txnTxid` AS txnTxid \
          FROM `inputs` \
          INNER JOIN `transactions` ON `transactions`.`txnID` = `inputs`.`txnID` \
          INNER JOIN `outputs` ON `outputs`.`outID` = `inputs`.`outID` \
          INNER JOIN `addresses` ON `outputs`.`addrID` = `addresses`.`addrID` \
          WHERE `addresses`.`addrAddress` = ? \
        ) \
      ) AS `r`'

    const params = [address, address]
    const query = mysql.format(sqlQuery, params)
    const results = await this._query(query)

    if (results.length == 1) {
      const nbTxs = results[0].nbTxs
      return (nbTxs == null) ? 0 : nbTxs
    }

    return null
  }

  /**
   * Get an HD account.
   * @param {string} xpub - xpub
   * @returns {integer} returns {hdID, hdXpub, hdCreated, hdType}
   *  throws if no record of xpub
   */
  async getHDAccount(xpub) {
    const sqlQuery = 'SELECT * FROM `hd` WHERE `hdXpub` = ?'
    const params = xpub
    const query = mysql.format(sqlQuery, params)
    const result = await this._query(query)

    if (result.length > 0)
      return result[0]

    throw errors.db.ERROR_NO_HD_ACCOUNT
  }

  /**
   * Get the ID of an HD account
   * @param {string} xpub - xpub
   * @returns {integer} returns the id of the hd account
   */
  async getHDAccountId(xpub) {
    const sqlQuery = 'SELECT `hdID` FROM `hd` WHERE `hdXpub` = ?'
    const params = xpub
    const query = mysql.format(sqlQuery, params)
    const result = await this._query(query)

    if (result.length > 0)
      return result[0].hdID

    throw errors.db.ERROR_NO_HD_ACCOUNT    
  }

  /**
   * Get the ID of an HD account. Ensures that the account exists.
   * @param {string} xpub - xpub
   * @param {string} type - hd account type
   * @returns {integer} returns the id of the hd account
   */
  async ensureHDAccountId(xpub, type) {
    const info = hdaHelper.classify(type)

    if (info.type === null)
      throw errors.xpub.SEGWIT

    // Get the ID of the xpub
    const sqlQuery = 'SELECT `hdID` FROM `hd` WHERE `hdXpub` = ?'
    const params = xpub
    const query = mysql.format(sqlQuery, params)
    const result = await this._query(query)

    if (result.length > 0)
      return result[0].hdID

    const sqlQuery2 = 'INSERT INTO `hd` SET ?'
    const params2 = {
      hdXpub: xpub, 
      hdCreated: util.unix(),
      hdType: type,
    }
    const query2 = mysql.format(sqlQuery2, params2)
    const result2 = await this._query(query2)
    return result2.insertId
    
  }

  /**
   * Lock the type of a hd account
   * @param {string} xpub - xpub
   * @returns {boolean} locked - true for locking, false for unlocking
   */
  async setLockHDAccountType(xpub, locked) {
    locked = !!locked

    const account = await this.getHDAccount(xpub)
    const info = hdaHelper.classify(account.hdType)

    if (info.locked == locked)
      return true

    const hdType = hdaHelper.makeType(account.hdType, locked)
    const sqlQuery = 'UPDATE `hd` SET `hdType` = ? WHERE `hdXpub` = ?'
    const params = [hdType, xpub]
    const query = mysql.format(sqlQuery, params)
    return this._query(query)
  }

  /**
   * Delete a hd account
   * @param {string} xpub - xpub
   */
  async deleteHDAccount(xpub) {
    try {
      // Check that this HD account exists
      await this.getHDAccountId(xpub)

      // Delete addresses associated with this xpub.
      // Address deletion cascades into transaction inputs & outputs.
      const sqlQuery = 'DELETE `addresses`.* FROM `addresses` \
        INNER JOIN `hd_addresses` ON `hd_addresses`.`addrID` = `addresses`.`addrID` \
        INNER JOIN `hd` ON `hd_addresses`.`hdID` = `hd`.`hdID` \
        WHERE `hd`.`hdXpub` = ?'
      const params = xpub
      const query = mysql.format(sqlQuery, params)
      await this._query(query)

      // Delete HD account entry
      const sqlQuery2 = 'DELETE FROM `hd` WHERE `hdXpub` = ?'
      const params2 = xpub
      const query2 = mysql.format(sqlQuery2, params2)
      return this._query(query2)

    } catch(e) {}
  }

  /**
   * Add an address a hd account
   * @param {string} address - bitcoin address
   * @param {string} xpub - xpub
   * @param {integer} chain - derivation chain
   * @param {index} index - derivation index for the address
   */
  async addAddressToHDAccount(address, xpub, chain, index) {
    const results = await Promise.all([
      this.ensureAddressId(address),
      this.getHDAccountId(xpub)
    ])

    const addrID = results[0]
    const hdID = results[1]

    if (hdID == null)
      throw null

    const sqlQuery = 'INSERT INTO `hd_addresses` SET ?'
    const params = {
      hdID: hdID,
      addrID: addrID,
      hdAddrChain: chain,
      hdAddrIndex: index
    }
    const query = mysql.format(sqlQuery, params)
    return this._query(query)
  }

  /**
   * Bulk-add addresses to an HD account.
   * @param {string} xpub - xpub
   * @param {object[]} addressData - array of {address: '...', chain: <int>, index: <int>}
   *  which is the output of the HDAccountsHelper.deriveAddresses()
   */
  async addAddressesToHDAccount(xpub, addressData) {
    if (addressData.length == 0)
      return
    
    const addresses = addressData.map(d => d.address)
    const hdID = await this.getHDAccountId(xpub)

    // Bulk insert addresses
    await this.addAddresses(addresses)

    // Bulk get address IDs
    const addrIdMap = await this.getAddressesIds(addresses)

    // Convert input addressData into database entry format
    const data = []
    for (let entry of addressData) {
      data.push([
        hdID,
        addrIdMap[entry.address],
        entry.chain,
        entry.index
      ])
    }

    const sqlQuery = 'INSERT IGNORE INTO `hd_addresses` \
      (hdID, addrID, hdAddrChain, hdAddrIndex) VALUES ?'
    const params = [data]
    const query = mysql.format(sqlQuery, params)
    return this._query(query)
  }

  /**
   * Get hd accounts associated to a list of addresses
   * @param {string[]} addresses - array of bitcoin addresses
   * @returns {object[]}
   */
  async getUngroupedHDAccountsByAddresses(addresses) {
    if (addresses.length == 0) return {}

    const sqlQuery = 'SELECT \
        `hd`.`hdID`, \
        `hd`.`hdXpub`, \
        `hd`.`hdType`, \
        `addresses`.`addrID`, \
        `addresses`.`addrAddress`, \
        `hd_addresses`.`hdAddrChain`, \
        `hd_addresses`.`hdAddrIndex` \
      FROM `addresses` \
      LEFT JOIN `hd_addresses` ON `hd_addresses`.`addrID` = `addresses`.`addrID` \
      LEFT JOIN `hd` ON `hd_addresses`.`hdID` = `hd`.`hdID` \
      WHERE `addresses`.`addrAddress` IN (?) \
      AND `addresses`.`addrAddress` NOT IN (SELECT addrAddress FROM banned_addresses)'

    const params = [addresses]
    const query = mysql.format(sqlQuery, params)
    return this._query(query)
  }

  /**
   * Get any HD accounts that own the input addresses
   * If addresses are known but not associated with an HD account,
   * theyare returned in the `loose` category
   * @param {string[]} addresses - array of bitcoin addresses
   * @returns {object}
   *  {
   *     hd: {
   *       [xpub]: {
   *         hdID: N, 
   *         hdType: M, 
   *         addresses:[...]
   *       }, 
   *       ...
   *    }
   *    loose:[...]
   *  }
   */
  async getHDAccountsByAddresses(addresses) {
    const ret = {
      hd: {},
      loose: []
    }

    if (addresses.length == 0)
      return ret

    const sqlQuery = 'SELECT \
        `hd`.`hdID`, \
        `hd`.`hdXpub`, \
        `hd`.`hdType`, \
        `addresses`.`addrID`, \
        `addresses`.`addrAddress`, \
        `hd_addresses`.`hdAddrChain`, \
        `hd_addresses`.`hdAddrIndex` \
      FROM `addresses` \
      LEFT JOIN `hd_addresses` ON `hd_addresses`.`addrID` = `addresses`.`addrID` \
      LEFT JOIN `hd` ON `hd_addresses`.`hdID` = `hd`.`hdID` \
      WHERE `addresses`.`addrAddress` IN (?) \
      AND `addresses`.`addrAddress` NOT IN (SELECT addrAddress FROM banned_addresses)'

    const params = [addresses]
    const query = mysql.format(sqlQuery, params)
    const results = await this._query(query)

    for (let r of results) {
      if (r.hdXpub == null) {
        ret.loose.push({
          addrID: r.addrID,
          addrAddress: r.addrAddress,
        })
      } else {
        if (!ret.hd[r.hdXpub]) {
          ret.hd[r.hdXpub] = {
            hdID: r.hdID,
            hdType: r.hdType,
            addresses: []
          }
        }

        ret.hd[r.hdXpub].addresses.push({
          addrID: r.addrID,
          addrAddress: r.addrAddress,
          hdAddrChain: r.hdAddrChain,
          hdAddrIndex: r.hdAddrIndex,
        })
      }
    }

    return ret
  }

  /**
   * Get an HD account balance
   * @param {string} xpub - xpub
   * @returns {integer} returns the balance of the hd account
   */
  async getHDAccountBalance(xpub) {
    const sqlQuery = 'SELECT \
        SUM(`outputs`.`outAmount`) as balance \
      FROM `hd_addresses` \
      INNER JOIN `addresses` ON `hd_addresses`.`addrID` = `addresses`.`addrID` \
      INNER JOIN `hd` ON `hd_addresses`.`hdID` = `hd`.`hdID` \
      INNER JOIN `outputs` ON `outputs`.`addrID` = `addresses`.`addrID`  \
      LEFT JOIN `inputs` ON `outputs`.`outID` = `inputs`.`outID` \
      WHERE `inputs`.`outID` IS NULL \
        AND `hd`.`hdXpub` = ?'

    const params = xpub
    const query = mysql.format(sqlQuery, params)
    const results = await this._query(query)

    if (results.length == 1)
      return (results[0].balance == null) ? 0 : results[0].balance

    return null
  }

  /**
   * Get next unused address indices for each HD chain of an account
   * @param {string} xpub - xpub
   * @returns {integer[]} returns an array of unused indices
   *     [M/0/X, M/1/Y] -> [X,Y]
   */
  async getHDAccountNextUnusedIndices(xpub) {
    const sqlQuery = 'SELECT \
        `hd_addresses`.`hdAddrChain`, \
        MAX(`hd_addresses`.`hdAddrIndex`) + 1 AS `nextUnusedIndex` \
      FROM `hd_addresses` \
      INNER JOIN `addresses` ON `hd_addresses`.`addrID` = `addresses`.`addrID` \
      INNER JOIN `hd` ON `hd_addresses`.`hdID` = `hd`.`hdID` \
      INNER JOIN `outputs` ON `outputs`.`addrID` = `addresses`.`addrID`  \
      WHERE `hd`.`hdXpub` = ? \
      GROUP BY `hd_addresses`.`hdAddrChain`'

    const params = xpub
    const query = mysql.format(sqlQuery, params)
    const results = await this._query(query)

    const ret = [0, 0]

    for (let r of results)
      if ([0,1].indexOf(r.hdAddrChain) > -1)
        ret[r.hdAddrChain] = r.nextUnusedIndex

    return ret
  }

  /**
   * Get the maximum derived address index for each HD chain of an account
   * @param {string} xpub - xpub
   * @returns {integer[]} returns an array of derived indices
   *     [M/0/X, M/1/Y] -> [X,Y]
   */
  async getHDAccountDerivedIndices(xpub) {
    const sqlQuery = 'SELECT \
        `hd_addresses`.`hdAddrChain`, \
        MAX(`hd_addresses`.`hdAddrIndex`) AS `maxDerivedIndex` \
      FROM `hd_addresses` \
      INNER JOIN `addresses` ON `hd_addresses`.`addrID` = `addresses`.`addrID` \
      INNER JOIN `hd` ON `hd_addresses`.`hdID` = `hd`.`hdID` \
      WHERE `hd`.`hdXpub` = ? \
      GROUP BY `hd_addresses`.`hdAddrChain`'

    const params = xpub
    const query = mysql.format(sqlQuery, params)
    const results = await this._query(query)

    const ret = [-1, -1]

    for (let r of results)
      if ([0,1].indexOf(r.hdAddrChain) > -1)
        ret[r.hdAddrChain] = r.maxDerivedIndex

    return ret
  }

  /**
   * Get the number of indices derived in an interval for a HD chain
   * @param {string} xpub - xpub
   * @param {integer} chain - HD chain (0 or 1)
   * @param {integer} minIdx - min index of derivation
   * @param {integer} maxIdx - max index of derivation
   * @returns {integer[]} returns an array of number of derived indices
   */
  async getHDAccountNbDerivedIndices(xpub, chain, minIdx, maxIdx) {
    const sqlQuery = 'SELECT \
        COUNT(`hd_addresses`.`hdAddrIndex`) AS `nbDerivedIndices` \
      FROM `hd_addresses` \
      INNER JOIN `hd` ON `hd_addresses`.`hdID` = `hd`.`hdID` \
      WHERE `hd`.`hdXpub` = ? \
      AND `hd_addresses`.`hdAddrChain` = ? \
      AND `hd_addresses`.`hdAddrIndex` >= ? \
      AND `hd_addresses`.`hdAddrIndex` <= ?'

    const params = [xpub, chain, minIdx, maxIdx]
    const query = mysql.format(sqlQuery, params)
    const results = await this._query(query)

    if (results.length == 1) {
      const nbDerivedIndices = results[0].nbDerivedIndices
      return (nbDerivedIndices == null) ? 0 : nbDerivedIndices
    }

    return 0
  }

  /**
   * Get the number of transactions for an HD account
   * @param {string} xpub - xpub
   * @returns {integer} returns the balance of the hd account
   */
  async getHDAccountNbTransactions(xpub) {
    const sqlQuery = 'SELECT COUNT(DISTINCT `r`.`txnTxid`) AS nbTxs \
      FROM ( \
        ( \
          SELECT `transactions`.`txnTxid` AS txnTxid \
          FROM `outputs` \
          INNER JOIN `transactions` ON `transactions`.`txnID` = `outputs`.`txnID` \
          INNER JOIN `hd_addresses` ON `hd_addresses`.`addrID` = `outputs`.`addrID` \
          INNER JOIN `hd` ON `hd`.`hdID` = `hd_addresses`.`hdID` \
          WHERE `hd`.`hdXpub` = ? \
        ) UNION ( \
          SELECT `transactions`.`txnTxid` AS txnTxid \
          FROM `inputs` \
          INNER JOIN `transactions` ON `transactions`.`txnID` = `inputs`.`txnID` \
          INNER JOIN `outputs` ON `outputs`.`outID` = `inputs`.`outID` \
          INNER JOIN `hd_addresses` ON `hd_addresses`.`addrID` = `outputs`.`addrID` \
          INNER JOIN `hd` ON `hd`.`hdID` = `hd_addresses`.`hdID` \
          WHERE `hd`.`hdXpub` = ? \
        ) \
      ) AS `r`'

    const params = [xpub, xpub]
    const query = mysql.format(sqlQuery, params)
    const results = await this._query(query)

    if (results.length == 1)
      return (results[0].nbTxs == null) ? 0 : results[0].nbTxs

    return null
  }

  /**
   * Get the number of transactions for a list of addresses and HD accounts
   * @param {string[]} addresses - array of bitcoin addresses
   * @param {string[]} xpubs - array of xpubs
   * @returns {int} returns the number of transactions
   */
  async getAddrAndXpubsNbTransactions(addresses, xpubs) {
    if (
      (!addresses || addresses.length == 0)
      && (!xpubs || xpubs.length == 0)
    ) {
      return []
    }

    // Prepares subqueries for the query
    // retrieving txs of interest
    let subQuery = ''
    let subQueries = []

    if (addresses && addresses.length > 0) {
      const params = [addresses, addresses]
      subQuery = mysql.format(SUBQUERY_TXIDS_ADDR, params)
      subQueries.push(subQuery)
    }

    if (xpubs && xpubs.length > 0) {
      const params = [xpubs, xpubs]
      subQuery = mysql.format(SUBQUERY_TXIDS_XPUBS, params)
      subQueries.push(subQuery)
    }

    subQuery = subQueries.join(' UNION ')

    const sqlQuery = 'SELECT COUNT(DISTINCT `r`.`txnTxid`) AS nbTxs \
      FROM (' + subQuery + ') AS `r`'
    
    let query = mysql.format(sqlQuery)
    const results = await this._query(query)

    if (results.length == 1)
      return (results[0].nbTxs == null) ? 0 : results[0].nbTxs

    return null
  }

  /**
   * Get the transactions for a list of addresses and HD accounts
   * @param {string[]} addresses - array of bitcoin addresses
   * @param {string[]} xpubs - array of xpubs
   * @returns {object[]} returns an array of transactions
   */
  async getTxsByAddrAndXpubs(addresses, xpubs, page, nbTxsPerPage) {
    if (
      (!addresses || addresses.length == 0)
      && (!xpubs || xpubs.length == 0)
    ) {
      return []
    }

    // Manages the paging
    if (page == null)
      page = 0

    if (nbTxsPerPage == null)
      nbTxsPerPage = keys.multiaddr.transactions

    const skip = page * nbTxsPerPage

    // Prepares subqueries for the query
    // retrieving txs of interest
    let subQuery = ''
    let subQueries = []

    if (addresses && addresses.length > 0) {
      const params = [addresses, addresses]
      subQuery = mysql.format(SUBQUERY_TXS_ADDR, params)
      subQueries.push(subQuery)
    }

    if (xpubs && xpubs.length > 0) {
      const params = [xpubs, xpubs]
      subQuery = mysql.format(SUBQUERY_TXS_XPUB, params)
      subQueries.push(subQuery)
    }

    subQuery = subQueries.join(' UNION DISTINCT ')

    // Get a page of transactions
    const sqlQuery = 'SELECT \
        `txs`.`txnID`, \
        `txs`.`txnTxid`, \
        `txs`.`txnVersion`, \
        `txs`.`txnLocktime`, \
        `txs`.`blockHeight`, \
        `txs`.`time` \
      FROM (' + subQuery + ') AS txs \
      ORDER BY `txs`.`time` DESC, `txs`.`txnID` DESC \
      LIMIT ?,?'
    const params = [skip, nbTxsPerPage]
    let query = mysql.format(sqlQuery, params)
    const txs = await this._query(query)

    const txsIds = txs.map(t => t.txnID)

    if (txsIds.length == 0)
      return []

    // Prepares subqueries for 
    // the query retrieving utxos of interest
    let subQuery2 = ''
    let subQueries2 = []

    if (addresses && addresses.length > 0) {
      const params2 = [txsIds, addresses, txsIds, addresses]
      subQuery2 = mysql.format(SUBQUERY_UTXOS_ADDR, params2)
      subQueries2.push(subQuery2)
    }

    if (xpubs && xpubs.length > 0) {
      const params2 = [txsIds, xpubs, txsIds, xpubs]
      subQuery2 = mysql.format(SUBQUERY_UTXOS_XPUB, params2)
      subQueries2.push(subQuery2)
    }

    subQuery2 = subQueries2.join(' UNION DISTINCT ')

    // Get inputs and outputs of interest
    const sqlQuery2 = 'SELECT * \
      FROM (' + subQuery2 + ') AS `utxos` \
      ORDER BY `utxos`.`outIndex` ASC, `utxos`.`inIndex` ASC'

    let query2 = mysql.format(sqlQuery2)
    const utxos = await this._query(query2)

    return this.assembleTransactions(txs, utxos)
  }

  /**
   * Initialize a transaction object returned as response to queries
   * @param {object} tx - transaction data retrieved from db
   * @returns {object} returns the transaction stub
   */
  _transactionStub(tx) {
    let ret = {
      hash: tx.txnTxid,
      time: (tx.time < 32503680000) ? tx.time : 0,
      version: tx.txnVersion,
      locktime: tx.txnLocktime,
      result: 0,
      inputs: [],
      out: []
    }

    if (tx.blockHeight != null)
      ret.block_height = tx.blockHeight

    return ret
  }

  /**
   * Initialize an input object returned as part of a response
   * @param {object} input - input data retrieved from db
   * @returns {object} returns the input stub
   */
  _inputStub(input) {
    let ret = {
      vin: input.inIndex,
      sequence: input.inSequence,
      prev_out: {
        txid: input.inOutTxid,
        vout: input.inOutIndex,
        value: input.inOutAmount,
        addr: input.inOutAddress
      }
    }

    if (input.hdXpub && input.hdXpub !== null) {
      ret.prev_out.xpub = {
        m: input.hdXpub,
        path: ['M', input.hdAddrChain, input.hdAddrIndex].join('/')
      }
    }

    return ret
  }

  /**
   * Initialize an output object returned as part of a response
   * @param {object} output - output data retrieved from db
   * @returns {object} returns the output stub
   */
  _outputStub(output) {
    let ret = {
      n: output.outIndex,
      value: output.outAmount,
      addr: output.outAddress
    }

    if (output.hdXpub && output.hdXpub !== null) {
      ret.xpub = {
        m: output.hdXpub,
        path: ['M', output.hdAddrChain, output.hdAddrIndex].join('/')
      }
    }

    return ret
  }

  /**
   * Take query results for txs and utxos and combine into transaction data
   * @param {object[]} txs - array of transaction data retrieved from db
   * @param {object[]} utxos - array of utxos data retrieved from db
   * @returns {object[]} returns an array of transaction objects
   */
  assembleTransactions(txs, utxos) {
    const txns = {}

    for (let tx of txs) {
      if (!txns[tx.txnID])
        txns[tx.txnID] = this._transactionStub(tx)
    }

    for (let u of utxos) {
      if (u.txnID != null && txns[u.txnID]) {
        if (u.inIndex != null) {
          txns[u.txnID].result -= u.inOutAmount
          txns[u.txnID].inputs.push(this._inputStub(u))
        } else if (u.outIndex != null) {
          txns[u.txnID].result += u.outAmount
          txns[u.txnID].out.push(this._outputStub(u))
        }
      }
    }

    // Return transactions in descending time order, most recent first
    const ret = Object.keys(txns).map(key => txns[key])
    ret.sort((a,b) => b.time - a.time)
    return ret
  }

  /**
   * Get a list of unspent outputs for given hd account
   * @param {string} xpub - xpub
   * @returns {object[]} returns an array of utxos objects
   *  {txnTxid, txnVersion, txnLocktime, outIndex, outAmount, outScript, addrAddress}
   */
  async getHDAccountUnspentOutputs(xpub) {
    const sqlQuery = 'SELECT \
        `txnTxid`, \
        `txnVersion`, \
        `txnLocktime`, \
        `blockHeight`, \
        `outIndex`, \
        `outAmount`, \
        `outScript`, \
        `addrAddress`, \
        `hdAddrChain`, \
        `hdAddrIndex` \
      FROM `outputs` \
      INNER JOIN `addresses` ON `outputs`.`addrID` = `addresses`.`addrID` \
      INNER JOIN `hd_addresses` ON `outputs`.`addrID` = `hd_addresses`.`addrID` \
      INNER JOIN `hd` ON `hd_addresses`.`hdID` = `hd`.`hdID` \
      INNER JOIN `transactions` ON `outputs`.`txnID` = `transactions`.`txnID` \
      LEFT JOIN `blocks` ON `transactions`.`blockID` = `blocks`.`blockID` \
      LEFT JOIN `inputs` ON `outputs`.`outID` = `inputs`.`outID` \
      WHERE `inputs`.`outID` IS NULL \
        AND `hd`.`hdXpub` = ?'

    const params = xpub
    const query = mysql.format(sqlQuery, params)
    return this._query(query)
  }

  /**
   * Get addresses that belong to a given hd account
   * @param {string[]} addresses - array of bitcoin addresses
   * @returns {object} returns a dictionary {[address]: hdXpub, ...}
   */
  async getXpubByAddresses(addresses) {
    const ret = {}

    if (addresses.length == 0)
      return ret

    const sqlQuery = 'SELECT `hd`.`hdXpub`, `addresses`.`addrAddress` \
      FROM `addresses` \
      INNER JOIN `hd_addresses` ON `hd_addresses`.`addrID` = `addresses`.`addrID` \
      INNER JOIN `hd` ON `hd_addresses`.`hdID` = `hd`.`hdID` \
      WHERE `addresses`.`addrAddress` IN (?)'

    const params = [addresses]
    const query = mysql.format(sqlQuery, params)
    const results = await this._query(query)

    for (let r of results)
      ret[r.addrAddress] = r.hdXpub

    return ret
  }

  /**
   * Get the mysql ID of a transaction. Ensures that the transaction exists.
   * @param {string} txid - txid of a transaction
   * @returns {integer} returns the transaction id (mysql id)
   */
  async ensureTransactionId(txid) {
    const sqlQuery = 'INSERT IGNORE INTO `transactions` SET ?'
    const params = {
      txnTxid: txid, 
      txnCreated: util.unix()
    }
    const query = mysql.format(sqlQuery, params)
    const result = await this._query(query)

    // Successful insertion
    if (result.insertId > 0)
      return result.insertId

    // Transaction already in db
    const sqlQuery2 = 'SELECT `txnID` FROM `transactions` WHERE `txnTxid` = ?'
    const params2 = txid
    const query2 = mysql.format(sqlQuery2, params2)
    const result2 = await this._query(query2)

    if (result2.length > 0)
      return result2[0].txnID

    throw 'Problem met while trying to insert a new transaction'
  }

  /**
   * Get the mysql ID of a transaction
   * @param {string} txid - txid of a transaction
   * @returns {integer} returns the transaction id (mysql id)
   */
  async getTransactionId(txid) {
    const sqlQuery = 'SELECT `txnID` FROM `transactions` WHERE `txnTxid` = ?'
    const params = txid
    const query = mysql.format(sqlQuery, params)
    const result = await this._query(query)
    return (result.length == 0) ? null : result[0].txnID
  }

  /**
   * Get the mysql IDs of a collection of transactions
   * @param {string[]} txids - txids of the transactions
   * @returns {object[]} returns an array of {txnTxid: txnId}
   */
  async getTransactionsIds(txids) {
    if (txids.length == 0)
      return []

    const sqlQuery = 'SELECT `txnID`, `txnTxid` FROM `transactions` WHERE `txnTxid` IN (?)'
    const params = [txids]
    const query = mysql.format(sqlQuery, params)
    const results = await this._query(query)

    const ret = {}
    for (let r of results)
      ret[r.txnTxid] = r.txnID
    return ret
  }

  /**
   * Get the mysql IDs of a set of transactions
   * @param {string[]} txid - array of transactions txids
   * @returns {integer[]} returns an array of transaction ids (mysql ids)
   */
  async getTransactionsById(txnIDs) {
    if (txnIDs.length == 0)
      return []

    const sqlQuery = 'SELECT * FROM `transactions` WHERE `txnID` IN (?)'
    const params = [txnIDs]
    const query = mysql.format(sqlQuery, params)
    return this._query(query)
  }

  /**
   * Insert a new transaction in db
   * @param {object} tx - {txid, version, locktime}
   */
  async addTransaction(tx) {
    if (!tx.created)
      tx.created = util.unix()

    const sqlQuery = 'INSERT INTO `transactions` \
      (txnTxid, txnCreated, txnVersion, txnLocktime) VALUES (?) \
      ON DUPLICATE KEY UPDATE txnVersion = VALUES(txnVersion)'

    const params = [[
      tx.txid,
      tx.created,
      tx.version,
      tx.locktime
    ]]

    const query = mysql.format(sqlQuery, params)
    return this._query(query)
  }

  /**
   * Insert a collection of transactions in db
   * @param {object[]} txs - array of {txid, version, locktime}
   */
  async addTransactions(txs) {
    if (txs.length == 0)
      return

    const sqlQuery = 'INSERT INTO `transactions` \
      (txnTxid, txnCreated, txnVersion, txnLocktime) VALUES ? \
      ON DUPLICATE KEY UPDATE txnVersion = VALUES(txnVersion)'

    const params = [txs.map(tx => [
      tx.txid,
      tx.created ? tx.created : util.unix(),
      tx.version,
      tx.locktime
    ])]

    const query = mysql.format(sqlQuery, params)
    return this._query(query)
  }

  /**
   * Get a transaction for a given txid
   * @param {string} txid - txid of the transaction
   */
  async getTransaction(txid) {
    // Get transaction outputs
    const outputsQuery = mysql.format(SUBQUERY_GET_TX_OUTS, txid)
      // Get transaction inputs
    const inputsQuery = mysql.format(SUBQUERY_GET_TX_INS, txid)

    const results = await Promise.all([
      this._query(outputsQuery),
      this._query(inputsQuery)
    ])

    const tx = {
      hash: txid,
      time: Infinity,
      version: 0,
      locktime: 0,
      inputs: [],
      out: [],
      block_height: null,
    }

    // Process the outputs
    for (let output of results[0]) {
      tx.version = output.txnVersion
      tx.locktime = output.txnLocktime

      if (output.blockTime != null)
        tx.time = Math.min(tx.time, output.blockTime)

      tx.time = Math.min(tx.time, output.txnCreated)
      
      if (output.blockHeight != null)
        tx.block_height = output.blockHeight

      const fmt = {
        n: output.outIndex,
        value: output.outAmount,
        addr: output.addrAddress,
        script: output.outScript,
      }

      if (output.hdXpub) {
        fmt.xpub = {
          m: output.hdXpub,
          path: ['M', output.hdAddrChain, output.hdAddrIndex].join('/')
        }
      }

      tx.out.push(fmt)
    }

    // Process the inputs
    for (let input of results[1]) {
      tx.version = input.txnVersion
      tx.locktime = input.txnLocktime

      if (input.blockTime != null)
        tx.time = Math.min(tx.time, input.blockTime)

      tx.time = Math.min(tx.time, input.txnCreated)

      if (input.blockHeight != null)
        tx.block_height = input.blockHeight

      const fmt = {
        vin: input.inIndex,
        prev_out: {
          txid: input.prevOutTxid,
          vout: input.outIndex,
          value: input.outAmount,
          addr: input.addrAddress,
          script: input.outScript,
        },
        sequence: input.inSequence
      }

      if (input.hdXpub) {
        fmt.prev_out.xpub = {
          m: input.hdXpub,
          path: ['M', input.hdAddrChain, input.hdAddrIndex].join('/')
        }
      }

      tx.inputs.push(fmt)
    }

    // Remove block height if null
    if (tx.block_height == null)
      delete tx.block_height
    
    return tx
  }

  /**
   * Get the unconfirmed transactions
   * @returns {object[]} returns an array of transactions data
   */
  async getUnconfirmedTransactions() {
    const query = 'SELECT * FROM `transactions` WHERE blockID IS NULL'
    return this._query(query)
  }

  /**
   * Get all transactions
   * @returns {object[]} returns an array of transactions data
   */
  async getTransactions() {
    const query = 'SELECT * FROM `transactions`'
    return this._query(query)
  }

  /**
   * Get the inputs of a transaction
   * @param {string} txnID - mysql id of the transaction
   * @returns {object[]} returns an array of inputs
   */
  async getTxInputs(txnID) {
    const sqlQuery = 'SELECT * FROM `inputs` WHERE `txnID` = ?'
    const params = txnID
    const query = mysql.format(sqlQuery, params)
    return this._query(query)
  }

  /**
   * Batch confirm txids in a block
   * @param {string[]} txnTxidArray - array of transaction txids
   * @param {integer} blockID - mysql id of the blck
   */
  async confirmTransactions(txnTxidArray, blockID) {
    if (txnTxidArray.length == 0)
      return

    const sqlQuery = 'UPDATE `transactions` SET `blockID` = ? WHERE `txnTxid` IN (?)'
    const params = [blockID, txnTxidArray]
    const query = mysql.format(sqlQuery, params)
    return this._query(query)
  }

  /**
   * Get the transactions confirmed after a given height
   * @param {integer]} height - block height
   * @param {object[]} returns an array of transactions
   */
  async getTransactionsConfirmedAfterHeight(height) {
    const sqlQuery = 'SELECT `transactions`.* FROM `transactions` \
      INNER JOIN `blocks` ON `blocks`.`blockID` = `transactions`.`blockID` \
      WHERE `blocks`.`blockHeight` > ?'
    const params = height
    const query = mysql.format(sqlQuery, params)
    return this._query(query)
  }

  /**
   * Delete the transactions confirmed after a given height
   * @param {integer]} height - block height
   */
  async deleteTransactionsConfirmedAfterHeight(height) {
    const sqlQuery = 'DELETE `transactions`.* FROM `transactions` \
      INNER JOIN `blocks` ON `blocks`.`blockID` = `transactions`.`blockID` \
      WHERE `blocks`.`blockHeight` > ?'
    const params = height
    const query = mysql.format(sqlQuery, params)
    return this._query(query)
  }

  /**
   * Batch unconfirm a set of transactions
   * @param {string[]} txnTxidArray - array of transaction txids
   */
  async unconfirmTransactions(txnTxidArray) {
    if (txnTxidArray.length == 0)
      return

    const sqlQuery = 'UPDATE `transactions` SET `blockID` = NULL WHERE `txnTxid` IN (?)'
    const params = [txnTxidArray]
    const query = mysql.format(sqlQuery, params)
    return this._query(query)
  }

  /**
   * Delete a transaction identified by its txid
   * @param {string} txid - txid of the transaction
   */
  async deleteTransaction(txid) {
    const sqlQuery = 'DELETE `transactions`.* FROM `transactions` WHERE `transactions`.`txnTxid` = ?'
    const params = txid
    const query = mysql.format(sqlQuery, params)
    return this._query(query)
  }

  /**
   * Delete a set of transactions identified by their mysql ids
   * @param {integer[]} txnIDs - mysql ids of the transactions
   */
  async deleteTransactionsByID(txnIDs) {
    if (txnIDs.length == 0)
      return []

    const sqlQuery = 'DELETE `transactions`.* FROM `transactions` WHERE `transactions`.`txnID` in (?)'
    const params = [txnIDs]
    const query = mysql.format(sqlQuery, params)
    return this._query(query)
  }

  /**
   * Insert transaction outputs associated with known addresses
   * @param {object[]} outputs - array of {txnID, addrID, outIndex, outAmount, outScript}
   */
  async addOutputs(outputs) {
    if (outputs.length == 0)
      return

    const sqlQuery = 'INSERT IGNORE INTO `outputs` \
      (txnID, addrID, outIndex, outAmount, outScript) VALUES ?'

    const params = [outputs.map(o => [o.txnID, o.addrID, o.outIndex, o.outAmount, o.outScript])]
    const query = mysql.format(sqlQuery, params)
    return this._query(query)
  }

  /**
   * Get a list of outputs identified by their txid and index.
   * The presence of spendingTxnID and spendingInID not null indicate that an 
   * input spending the transaction output index is already in the database and
   * may indicate a DOUBLE SPEND.
   * @param {object[]} spends - array of {txid,index}
   * @returns {object[]} returns a array of output objects
   *  {addrAddress, outID, outAmount, txnTxid, outIndex, spendingTxnID/null, spendingInID/null}
   */
  async getOutputSpends(spends) {
    if (spends.length == 0) 
      return []

    const whereClauses = 
      spends.map(s => '(`txnTxid`=' + this.pool.escape(s.txid) + ' AND `outIndex`=' + this.pool.escape(s.index) + ')')

    const whereClause = whereClauses.join(' OR ')

    const sqlQuery = 'SELECT \
        `addrAddress`, \
        `outputs`.`outID`, \
        `outAmount`, \
        `txnTxid`, \
        `outIndex`, \
        `inputs`.`txnID` AS `spendingTxnID` \
      FROM `outputs` \
      INNER JOIN `addresses` ON `outputs`.`addrID` = `addresses`.`addrID` \
      INNER JOIN `transactions` ON `outputs`.`txnID` = `transactions`.`txnID` \
      LEFT JOIN `inputs` ON `inputs`.`outID` = `outputs`.outID \
      WHERE ' + whereClause

    const query = mysql.format(sqlQuery)
    return this._query(query)
  }

  /**
   * Get a list of mysql ids for outputs identified by their txid and index.
   * @param {object[]} spends - array of {txid,vout}
   * @returns {object[]} returns a array of output objects
   *  {outID, txnTxid, outIndex}
   */
  async getOutputIds(spends) {
    if (spends.length == 0)
      return []

    const whereClauses =
      spends.map((s) => '(`txnTxid`=' + this.pool.escape(s.txid) + ' AND `outIndex`=' + this.pool.escape(s.vout) + ')')

    const whereClause = whereClauses.join(' OR ')

    const sqlQuery = 'SELECT \
        `outID`, \
        `txnTxid`, \
        `outIndex` \
      FROM `outputs` \
      INNER JOIN `transactions` ON `outputs`.`txnID` = `transactions`.`txnID` \
      WHERE ' + whereClause

    const query = mysql.format(sqlQuery)
    return this._query(query)
  }

  /**
   * Get a list of unspent outputs for a list of addresses
   * @param {string[]} addresses - array of bitcoin addresses
   * @returns {object[]} returns a array of output objects
   *  {txnTxid, outIndex, outAmount, outScript, addrAddress}
   */
  async getUnspentOutputs(addresses) {
    if (addresses.length == 0)
      return []

    const sqlQuery = 'SELECT \
        `txnTxid`, \
        `txnVersion`, \
        `txnLocktime`, \
        `blockHeight`, \
        `outIndex`, \
        `outAmount`, \
        `outScript`, \
        `addrAddress` \
      FROM `outputs` \
      INNER JOIN `addresses` ON `outputs`.`addrID` = `addresses`.`addrID` \
      INNER JOIN `transactions` ON `outputs`.`txnID` = `transactions`.`txnID` \
      LEFT JOIN `blocks` ON `transactions`.`blockID` = `blocks`.`blockID` \
      LEFT JOIN `inputs` ON `outputs`.`outID` = `inputs`.`outID` \
      WHERE `inputs`.`outID` IS NULL \
        AND (`addrAddress`) IN (?)'

    const params = [addresses]
    const query = mysql.format(sqlQuery, params)
    return this._query(query)
  }

  /**
   * Insert transaction inputs that spend known Outputs
   * @param {object[]} inputs - array of input objects
   *  {txnID, outID, inIndex, inSequence}
   */
  async addInputs(inputs) {
    if (inputs.length == 0)
      return

    const sqlQuery = 'INSERT INTO `inputs` \
      (txnID, outID, inIndex, inSequence) VALUES ? \
      ON DUPLICATE KEY UPDATE outID = VALUES(outID)'

    const params = [inputs.map((i) => [i.txnID, i.outID, i.inIndex, i.inSequence])]
    const query = mysql.format(sqlQuery, params)
    return this._query(query)
  }

  /**
   * Insert a new block
   * @param {object} block - block object
   *  {blockHash, blockParent, blockHeight, blockTime}
   * block.blockParent is an ID, which may be obtained with DB.getBlockByHash
   */
  async addBlock(block) {
    const sqlQuery = 'INSERT IGNORE INTO `blocks` SET ?'
    const params = block
    const query = mysql.format(sqlQuery, params)
    const result = await this._query(query)

    // Successful insertion
    if (result.insertId > 0)
      return result.insertId

    // Block already in db
    const sqlQuery2 = 'SELECT `blockID` FROM `blocks` WHERE `blockHash` = ?'
    const params2 = block.blockHash
    const query2 = mysql.format(sqlQuery2, params2)
    const result2 = await this._query(query2)
 
    if (result2.length > 0)
      return result2[0].blockID     
 
    throw 'Problem met while trying to insert a new block'
  }

  /**
   * Get a block identified by the block hash
   * @param {string} hash - block hash
   * @returns {object} returns the block
   */
  async getBlockByHash(hash) {
    const sqlQuery = 'SELECT * FROM `blocks` WHERE `blockHash` = ?'
    const params = hash
    const query = mysql.format(sqlQuery, params)
    const result = await this._query(query)
    return (result.length == 1) ? result[0] : null
  }

  /**
   * Get a collection of blocks identified by the blocks hashes
   * @param {string[]} hashes - blocks hashes
   * @returns {object[]} returns the blocks
   */
  async getBlocksByHashes(hashes) {
    if (hashes.length == 0)
      return []

    const sqlQuery = 'SELECT * FROM `blocks` WHERE `blockHash` IN (?)'
    const params = [hashes]
    const query = mysql.format(sqlQuery, params)
    return await this._query(query)
  }

  /**
   * Get details about all blocks at a given block height
   * @param {integer} height - block height
   * @returns {object[]} returns an array of blocks
   */
  async getBlocksByHeight(height) {
    const sqlQuery = 'SELECT * FROM `blocks` WHERE `blockHeight` = ?'
    const params = height
    const query = mysql.format(sqlQuery, params)
    return this._query(query)
  }

  /**
   * Delete the blocks after a given block height
   * @param {integer} height - block height
   */
  async deleteBlocksAfterHeight(height) {
    const sqlQuery = 'DELETE FROM `blocks` WHERE `blockHeight` > ?'
    const params = height
    const query = mysql.format(sqlQuery, params)
    return this._query(query)
  }

  /**
   * Gets the last block
   * @returns {object} returns the last block
   */
  async getHighestBlock() {
    try {
      const results = await this.getLastBlocks(1)
      if (results == null || results.length == 0)
        return {
          blockID: null,
          blockHeight: 0
        }
      else
        return results[0]
    } catch(err) {
      return null
    }
  }

  /**
   * Gets the N last blocks
   * @param {integer} n - number of blocks to be retrieved
   * @returns {object[]} returns an array of the n last blocks
   */
  async getLastBlocks(n) {
    const sqlQuery = 'SELECT * FROM `blocks` ORDER BY `blockHeight` DESC LIMIT ?'
    const params = n
    let query = mysql.format(sqlQuery, n)
    return this._query(query)
  }


  /**
   * Get all scheduled transactions
   * @returns {object[]} returns an array of scheduled transactions
   */
  async getScheduledTransactions() {
    const sqlQuery = 'SELECT * FROM `scheduled_transactions` ORDER BY `schTrigger`, `schCreated`'
    return this._query(sqlQuery)
  }

  /**
   * Get the mysql ID of a scheduled transaction
   * @param {string} txid - txid of a scheduled transaction
   * @returns {integer} returns the scheduled transaction id (mysql id)
   */
  async getScheduledTransactionId(txid) {
    const sqlQuery = 'SELECT `schID` FROM `scheduled_transactions` WHERE `schTxid` = ?'
    const params = txid
    const query = mysql.format(sqlQuery, params)
    const result = await this._query(query)
    return (result.length == 0) ? null : result[0].txnID
  }

  /**
   * Insert a new scheduled transaction in db
   * @param {object} tx - {txid, created, rawTx, parentId, delay, trigger}
   */
  async addScheduledTransaction(tx) {
    if (!tx.created)
      tx.created = util.unix()

    const sqlQuery = 'INSERT INTO `scheduled_transactions` \
      (schTxid, schCreated, schRaw, schParentID, schParentTxid, schDelay, schTrigger) VALUES (?)'

    const params = [[
      tx.txid,
      tx.created,
      tx.rawTx,
      tx.parentId,
      tx.parentTxid,
      tx.delay,
      tx.trigger
    ]]

    const query = mysql.format(sqlQuery, params)
    const result = await this._query(query)

    if (result.insertId > 0)
      return result.insertId

    throw 'Problem met while trying to insert a new scheduled transaction'
  }

  /**
   * Delete a scheduled transaction
   * @param {string} txid - scheduled transaction txid
   */
  async deleteScheduledTransaction(txid) {
    const sqlQuery = 'DELETE `scheduled_transactions`.* \
      FROM `scheduled_transactions` \
      WHERE `scheduled_transactions`.`schTxid` = ?'
    const params = txid
    const query = mysql.format(sqlQuery, params)
    return this._query(query)
  }

  /**
   * Get scheduled transactions
   * with a trigger lower than a given block height
   * @param {integer} height - block height
   */
  async getActivatedScheduledTransactions(height) {
    const sqlQuery = 'SELECT * FROM `scheduled_transactions` \
      WHERE `schTrigger` <= ? AND `schParentID` IS NULL'
    const params = height
    const query = mysql.format(sqlQuery, params)
    return this._query(query)
  }

  /**
   * Get the scheduled transaction having a given parentID
   * @param {integer} parentId - parent ID
   * @returns {object[]} returns an array of scheduled transactions
   */
  async getNextScheduledTransactions(parentId) {
    const sqlQuery = 'SELECT * FROM `scheduled_transactions` \
      WHERE `schParentID` = ?'
    const params = parentId
    const query = mysql.format(sqlQuery, params)
    return this._query(query)
  }

  /**
   * Update the trigger of a scheduled transaction
   * identified by its ID
   * @param {integer} id - id of the scheduled transaction
   * @param {integer} trigger - new trigger
   */
  async updateTriggerScheduledTransaction(id, trigger) {
    const sqlQuery = 'UPDATE `scheduled_transactions` \
      SET `schTrigger` = ? \
      WHERE `schID` = ?'
    const params = [trigger, id]
    const query = mysql.format(sqlQuery, params)
    return this._query(query)
  }


  /**
   * MAINTENANCE FUNCTIONS
   */

  async getInvalidAccountTimes() {
    const sqlQuery = 'SELECT \
        `hd`.`hdID`, \
        `hdCreated`, \
        min(`txnCreated`) as `earliest` \
      FROM `hd` \
      INNER JOIN `hd_addresses` ON `hd_addresses`.`hdID` = `hd`.`hdID` \
      INNER JOIN `addresses` ON `hd_addresses`.`addrID` = `addresses`.`addrID` \
      INNER JOIN `outputs` ON `outputs`.`addrID` = `hd_addresses`.`addrID` \
      INNER JOIN `transactions` ON `outputs`.`txnID` = `transactions`.`txnID` \
      WHERE `hd`.`hdCreated` > `transactions`.`txnCreated` \
      GROUP BY `hd`.`hdID` LIMIT 100'
   
    return this._query(sqlQuery)
  }

  async getInvalidTxTimes() {
    const sqlQuery = 'SELECT \
        `txnID`, \
        `txnCreated`, \
        `blockTime` \
      FROM `transactions` \
      INNER JOIN `blocks` ON `transactions`.`blockID` = `blocks`.`blockID` \
      WHERE `transactions`.`txnCreated` > `blocks`.`blockTime` \
      LIMIT 100'
   
    return this._query(sqlQuery)
  }

  async setHDTime(hdID, hdCreated) {
    const sqlQuery = 'UPDATE `hd` SET `hdCreated` = ? WHERE `hdID` = ?'
    const params = [hdCreated, hdID]
    const query = mysql.format(sqlQuery, params)
    return this._query(query)
  }

  async setTransactionTime(txnID, txnCreated) {
    const sqlQuery = 'UPDATE `transactions` SET `txnCreated` = ? WHERE `txnID` = ?'
    const params = [txnCreated, txnID]
    const query = mysql.format(sqlQuery, params)
    return this._query(query)
  }

  async updateInputSequence(inID, inSequence) {
    const sqlQuery = 'UPDATE `inputs` SET `inSequence` = ? WHERE `inID` = ?'
    const params = [inSequence, inID]
    const query = mysql.format(sqlQuery, params)
    return this._query(query)
  }

  async getOutputsWithoutScript() {
    const sqlQuery = 'SELECT \
        `txnTxid`, \
        `outIndex`, \
        `outId` \
      FROM `outputs` \
      INNER JOIN `transactions` ON `outputs`.`txnID` = `transactions`.`txnID` \
      WHERE length(`outputs`.`outScript`) = 0 \
      ORDER BY `outId` \
      LIMIT 100'

    return this._query(sqlQuery)
  }

  async updateOutputScript(outID, outScript) {
    const sqlQuery = 'UPDATE `outputs` SET `outScript` = ? WHERE `outID` = ?'
    const params = [outScript, outID]
    const query = mysql.format(sqlQuery, params)
    return this._query(query)
  }

  async setBlockParent(hash, blockID) {
    const sqlQuery = 'UPDATE `blocks` SET `blockParent` = ? WHERE `blockHash` = ?'
    const params = [blockID, hash]
    const query = mysql.format(sqlQuery, params)
    return this._query(query)
  }

}

module.exports = new MySqlDbWrapper()
