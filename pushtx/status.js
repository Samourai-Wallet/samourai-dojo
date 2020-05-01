/*!
 * pushtx/status.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const bitcoin = require('bitcoinjs-lib')
const util = require('../lib/util')
const Logger = require('../lib/logger')
const db = require('../lib/db/mysql-db-wrapper')
const network = require('../lib/bitcoin/network')
const keys = require('../keys')[network.key]
const RpcClient = require('../lib/bitcoind-rpc/rpc-client')


/**
 * Default values for status object
 */
const DEFAULT_STATUS = {
  uptime: 0,
  memory: 0,
  bitcoind: {
    up: false,
    conn: -1,
    blocks: -1,
    version: -1,
    protocolversion: -1,
    relayfee: 0,
    testnet: false
  },
  push: {
    count: 0,
    amount: 0
  }
}

/**
 * Singleton providing information about the pushtx service
 */
class Status {

  /**
   * Constructor
   */
  constructor() {
    this.startTime = Date.now()
    this.status = JSON.parse(JSON.stringify(DEFAULT_STATUS))
    this.stats = {
      amount: 0,
      count: 0
    }
    this.rpcClient = new RpcClient()
  }

  /**
   * Update the stats
   * @param {Number} amount - amount sent (in BTC)
   */
  updateStats(amount) {
    this.stats.count++
    this.stats.amount += amount
  }

  /**
   * Get current status
   * @returns {Promise} status object
   */
  async getCurrent() {
    const mem = process.memoryUsage()
    this.status.memory = util.toMb(mem.rss)

    this.status.uptime = +((Date.now() - this.startTime) / 1000).toFixed(1)

    this.status.push.amount = +((this.stats.amount / 1e8).toFixed(3))
    this.status.push.count = this.stats.count

    try {
      await this._refreshNetworkInfo()
      await this._refreshBlockchainInfo()
    } catch (e) {
      Logger.error(e, 'PushTx : Status.getCurrent() : Error')
    } finally {
      return this.status
    }
  }

  /**
   * Get scheduled transactions
   */
  async getScheduledTransactions() {
    const ret = {
      nbTxs: 0,
      txs: []
    }

    try {
      ret.txs = await db.getScheduledTransactions()
      ret.nbTxs = ret.txs.length
    } catch(e) {
      //
    } finally {
      return ret
    }
  }

  /**
   * Refresh network info
   */
  async _refreshNetworkInfo() {
    const info = await this.rpcClient.getNetworkInfo()
    this.status.bitcoind.conn = info.connections
    this.status.bitcoind.version = info.version
    this.status.bitcoind.protocolversion = info.protocolversion
    this.status.bitcoind.relayfee = info.relayfee
  }

  /**
   * Refresh blockchain info
   */
  async _refreshBlockchainInfo() {
    const info = await this.rpcClient.getBlockchainInfo()
    this.status.bitcoind.blocks = info.blocks
    this.status.bitcoind.testnet = (info.chain != 'main')
    this.status.bitcoind.up = true
  }

}

module.exports = new Status()
