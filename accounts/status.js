/*!
 * accounts/status.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const util = require('../lib/util')
const db = require('../lib/db/mysql-db-wrapper')


/**
 * Singleton providing information about the accounts endpoints
 */
class Status {

  /**
   * Constructor
   */
  constructor() {
    this.t0 = Date.now()
    this.clients = 0
    this.sessions = 0
    this.maxConn = 0
  }

  /**
   * Get current status
   * @returns {Promise - object} status object
   */
  async getCurrent() {
    const uptime = util.timePeriod((Date.now() - this.t0) / 1000, false)
    const memory = `${util.toMb(process.memoryUsage().rss)} MiB`

    // Get highest block processed by the tracker
    const highest = await db.getHighestBlock()
    const dbMaxHeight = highest.blockHeight

    return {
      uptime: uptime,
      memory: memory,
      ws: {
        clients: this.clients,
        sessions: this.sessions,
        max: this.maxConn
      },
      blocks: dbMaxHeight
    }
  }

}

module.exports = new Status()
