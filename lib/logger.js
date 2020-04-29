/*!
 * lib/logger.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const util = require('./util')


/**
 * Class providing static methods for logging
 */
class Logger {

  /**
   * Log a message in the console
   * @param {string/object} msg
   * @param {boolean} json - true if msg is a json object, false otherwise
   */
  static info(msg, json) {
    const logEntry = Logger._formatLog('INFO', msg, json)
    console.log(logEntry)
  }

  /**
   * Log an error message
   * @param {object} e - error
   * @param {string} msg - message associated to the error
   */
  static error(e, msg) {
    const logEntry = Logger._formatLog('ERROR', msg)
    console.error(logEntry)

    //const errorEntry = Logger._formatLog(e)
    if (e) {
      console.error(e)
    }
  }


  /**
   * Format log entry
   * @param {string} level - log level label
   * @param {string/object} msg
   * @param {boolean} json - true if msg is a json object, false otherwise
   */
  static _formatLog(level, msg, json) {
    json = json || false
    const data = json ? JSON.stringify(msg, null, 2) : msg

    const memUse = process.memoryUsage()
    const mib = util.pad100(util.toMb(memUse.rss))

    const D = new Date()
    const y = D.getUTCFullYear()
    const m = util.pad10(D.getUTCMonth() + 1)
    const d = util.pad10(D.getUTCDate())
    const h = util.pad10(D.getUTCHours())
    const mn = util.pad10(D.getUTCMinutes())
    const s = util.pad10(D.getUTCSeconds())
    const ms = util.pad100(D.getUTCMilliseconds())
    
    const parts = [y, '-', m, '-', d, 'T', h, ':', mn, ':', s, 'Z  ', level, '  ', data]
    return parts.join('')
  }
}

module.exports = Logger
