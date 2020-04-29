/*!
 * pushtx/pushtx-rest-api.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const bitcoin = require('bitcoinjs-lib')
const Logger = require('../lib/logger')
const errors = require('../lib/errors')
const db = require('../lib/db/mysql-db-wrapper')
const network = require('../lib/bitcoin/network')
const keys = require('../keys')[network.key]
const RpcClient = require('../lib/bitcoind-rpc/rpc-client')
const pushTxProcessor = require('./pushtx-processor')


/**
 * A class scheduling delayed push of transactions
 */
class TransactionsScheduler {

  /**
   * Constructor
   */
  constructor() {
    this.rpcClient = new RpcClient()
  }

  /**
   * Schedule a set of transactions
   * according to a given sequential script
   * @param {object} script - scheduling script
   */
  async schedule(script) {
    try {
      // Check script length
      if (script.length > keys.txsScheduler.maxNbEntries)
        throw errors.body.SCRIPTSIZE

      // Order transactions by increasing hop values and nlocktime
      script.sort((a,b) => a.hop - b.hop || a.nlocktime - b.nlocktime)

      // Get the height of last block seen
      const info = await this.rpcClient.getBlockchainInfo()
      const lastHeight = info.blocks

      // Get the nLockTime associated to the first transaction
      const nltTx0 = script[0].nlocktime

      // Check that nltTx0 is in allowed range of blocks
      if (nltTx0 > lastHeight + keys.txsScheduler.maxDeltaHeight)
        throw errors.pushtx.SCHEDULED_TOO_FAR

      // Compute base height for this script
      const baseHeight = Math.max(lastHeight, nltTx0)

      // Iterate over the transactions for a few validations
      let lastHopProcessed = -1
      let lastLockTimeProcessed = -1

      for (let entry of script) {
        // Compute delta height (entry.nlocktime - nltTx0)
        entry.delta = entry.nlocktime - nltTx0
        // Check that delta is in allowed range
        if (entry.delta > keys.txsScheduler.maxDeltaHeight)
          throw errors.pushtx.SCHEDULED_TOO_FAR
        // Decode the transaction
        const tx = bitcoin.Transaction.fromHex(entry.tx)
        // Check that nlocktimes are matching
        if (!(tx.locktime && tx.locktime == entry.nlocktime)) {
          const msg = `TransactionsScheduler.schedule() : nLockTime mismatch : ${tx.locktime} - ${entry.nlocktime}`
          Logger.error(null, `PushTx : ${msg}`)
          throw errors.pushtx.NLOCK_MISMATCH
        }
        // Check that order of hop and nlocktime values are consistent
        if (entry.hop != lastHopProcessed) {
          if (entry.nlocktime < lastLockTimeProcessed)
            throw errors.pushtx.SCHEDULED_BAD_ORDER
        }
        lastHopProcessed = entry.hop
        lastLockTimeProcessed = entry.nlocktime
        // Update scheduled height if needed
        if (baseHeight != nltTx0)
          entry.nlocktime = baseHeight + entry.delta
      }

      let parentTxid = null
      let parentNlocktime = baseHeight

      // Check if first transactions should be sent immediately
      while ((script.length > 0) && (script[0].nlocktime <= lastHeight) && (script[0].delta == 0)) {
        await pushTxProcessor.pushTx(script[0].tx)
        const tx = bitcoin.Transaction.fromHex(script[0].tx)
        parentTxid = tx.getId()
        parentNlocktime = script[0].nlocktime
        script.splice(0,1)
      }

      // Store others transactions in database
      let parentId = null

      for (let entry of script) {
        const tx = bitcoin.Transaction.fromHex(entry.tx)

        const objTx = {
          txid: tx.getId(),
          created: null,
          rawTx: entry.tx,
          parentId: parentId,
          parentTxid: parentTxid,
          delay: entry.nlocktime - parentNlocktime,   // Store delay relative to previous transaction
          trigger: entry.nlocktime
        }

        parentId = await db.addScheduledTransaction(objTx)
        Logger.info(`PushTx : Registered scheduled tx ${objTx.txid} (trigger=${objTx.trigger})`)
        parentTxid = tx.getId()
        parentNlocktime = entry.nlocktime
      }

    } catch(e) {
      throw e
    }
  }

}

module.exports = TransactionsScheduler
