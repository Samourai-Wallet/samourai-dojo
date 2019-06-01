/*!
 * lib/bitcoind-rpc/fees.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const util = require('../util')
const errors = require('../errors')
const Logger = require('../logger')
const network = require('../bitcoin/network')
const keys = require('../../keys')[network.key]
const RpcClient = require('./rpc-client')
const latestBlock = require('./latest-block')


/**
 * A singleton providing information about network fees 
 */
class Fees {

  /**
   * Constructor
   */
  constructor() {
    this.block = -1
    this.targets = [2, 4, 6, 12, 24]
    this.fees = {}
    this.feeType = keys.bitcoind.feeType

    this.rpcClient = new RpcClient()

    this.refresh()
  }

  /**
   * Refresh and return the current fees
   * @returns {Promise}
   */
  async getFees() {
    try {
      if (latestBlock.height > this.block)
        await this.refresh()

      return this.fees

    } catch(err) {
      return Promise.reject(errors.generic.GEN)
    }
  }

  /**
   * Refresh the current fees
   * @returns {Promise}
   */
  async refresh() {
    await util.seriesCall(this.targets, async tgt => {
      try {
        const level = await this.rpcClient.cmd('estimatesmartfee', tgt, this.feeType)
        this.fees[tgt] = Math.round(level.feerate * 1e5)
      } catch(e) {
        Logger.error(e, 'Fees.refresh()')
        delete this.fees[tgt]
      }
    })

    this.block = latestBlock.height
  }

}

module.exports = new Fees()
