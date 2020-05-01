/*!
 * tracker/mempool-buffer.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const _ = require('lodash')
const zmq = require('zeromq')
const bitcoin = require('bitcoinjs-lib')
const util = require('../lib/util')
const Logger = require('../lib/logger')
const db = require('../lib/db/mysql-db-wrapper')
const network = require('../lib/bitcoin/network')
const keys = require('../keys')[network.key]
const AbstractProcessor = require('./abstract-processor')
const Transaction = require('./transaction')
const TransactionsBundle = require('./transactions-bundle')


/**
 * A class managing a buffer for the mempool
 */
class MempoolProcessor extends AbstractProcessor {

  /**
   * Constructor
   * @param {object} notifSock - ZMQ socket used for notifications
   */
  constructor(notifSock) {
    super(notifSock)
    // Mempool buffer
    this.mempoolBuffer = new TransactionsBundle()
    // ZeroMQ socket for bitcoind Txs messages
    this.txSock = null
    // ZeroMQ socket for pushtx messages
    this.pushTxSock = null
    // ZeroMQ socket for pushtx orchestrator messages
    this.orchestratorSock = null
    // Flag indicating if processor should process the transactions
    // Processor is deactivated if the tracker is late
    // (priority is given to the blockchain processor)
    this.isActive = false
  }

  /**
   * Start processing the mempool
   * @returns {Promise}
   */
  async start() {
    this.checkUnconfirmedId = setInterval(
      _.bind(this.checkUnconfirmed, this),
      keys.tracker.unconfirmedTxsProcessPeriod
    )

    await this.checkUnconfirmed()

    this.initSockets()

    this.processMempoolId = setInterval(
      _.bind(this.processMempool, this),
      keys.tracker.mempoolProcessPeriod
    )

    await this.processMempool()

    /*this.displayStatsId = setInterval(_.bind(this.displayMempoolStats, this), 60000)
    await this.displayMempoolStats()*/
  }

  /**
   * Stop processing
   */ 
  async stop() {
    clearInterval(this.checkUnconfirmedId)
    clearInterval(this.processMempoolId)
    //clearInterval(this.displayStatsId)

    resolve(this.txSock.disconnect(keys.bitcoind.zmqTx).close())
    resolve(this.pushTxSock.disconnect(keys.ports.notifpushtx).close())
    resolve(this.orchestratorSock.disconnect(keys.ports.orchestrator).close())
  }

  /**
   * Initialiaze ZMQ sockets
   */
  async initSockets() {
    // Socket listening to pushTx
    this.pushTxSock = zmq.socket('sub')
    this.pushTxSock.connect(`tcp://127.0.0.1:${keys.ports.notifpushtx}`)
    this.pushTxSock.subscribe('pushtx')

    this.pushTxSock.on('message', (topic, message) => {
      switch (topic.toString()) {
        case 'pushtx':
          this.onPushTx(message)
          break
        default:
          Logger.info(`Tracker : ${topic.toString()}`)
      }
    })

    Logger.info('Tracker : Listening for pushTx')

    // Socket listening to pushTx Orchestrator
    this.orchestratorSock = zmq.socket('sub')
    this.orchestratorSock.connect(`tcp://127.0.0.1:${keys.ports.orchestrator}`)
    this.orchestratorSock.subscribe('pushtx')

    this.orchestratorSock.on('message', (topic, message) => {
      switch (topic.toString()) {
        case 'pushtx':
          this.onPushTx(message)
          break
        default:
          Logger.info(`Tracker : ${topic.toString()}`)
      }
    })

    Logger.info('Tracker : Listening for pushTx orchestrator')

    // Socket listening to bitcoind Txs messages
    this.txSock = zmq.socket('sub')
    this.txSock.connect(keys.bitcoind.zmqTx)
    this.txSock.subscribe('rawtx')

    this.txSock.on('message', (topic, message) => {
      switch (topic.toString()) {
        case 'rawtx':
          this.onTx(message)
          break
        default:
          Logger.info(`Tracker : ${topic.toString()}`)
      }
    })

    Logger.info('Tracker : Listening for mempool transactions')
  }

  /**
   * Process transactions from the mempool buffer
   * @returns {Promise}
   */
  async processMempool() {
    // Refresh the isActive flag
    await this._refreshActiveStatus()

    const activeLbl = this.isActive ? 'active' : 'inactive'
    Logger.info(`Tracker : Processing ${activeLbl} Mempool (${this.mempoolBuffer.size()} transactions)`)

    let currentMempool = new TransactionsBundle(this.mempoolBuffer.toArray())
    this.mempoolBuffer.clear()

    const filteredTxs = await currentMempool.prefilterTransactions()

    return util.seriesCall(filteredTxs, async filteredTx => {
      const tx = new Transaction(filteredTx)
      const txCheck = await tx.checkTransaction()
      if (txCheck && txCheck.broadcast)
        this.notifyTx(txCheck.tx)
    })
  }

  /**
   * On reception of a new transaction from bitcoind mempool
   * @param {Buffer} buf - transaction
   * @returns {Promise}
   */
  async onTx(buf) {
    if (this.isActive) {
      try {
        let tx = bitcoin.Transaction.fromBuffer(buf)
        this.mempoolBuffer.addTransaction(tx)
      } catch (e) {
        Logger.error(e, 'Tracker : MempoolProcessor.onTx()')
        return Promise.reject(e)
      }
    }

    return Promise.resolve()
  }


  /**
   * On reception of a new transaction from /pushtx
   * @param {Buffer} buf - transaction
   * @returns {Promise}
   */
  async onPushTx(buf) {
    try {
      let pushedTx = bitcoin.Transaction.fromHex(buf.toString())
      const txid = pushedTx.getId()

      Logger.info(`Tracker : Processing tx for pushtx ${txid}`)

      if (!TransactionsBundle.cache.has(txid)) {
        // Process the transaction
        const tx = new Transaction(pushedTx)
        const txCheck = await tx.checkTransaction()
        // Notify the transaction if needed
        if (txCheck && txCheck.broadcast)
          this.notifyTx(txCheck.tx)
      }
    } catch (e) {
      Logger.error(e, 'Tracker : MempoolProcessor.onPushTx()')
      return Promise.reject(e)
    }
  }

  /**
   * Check unconfirmed transactions
   * @returns {Promise}
   */
  async checkUnconfirmed() {
    const t0 = Date.now()

    Logger.info('Tracker : Processing unconfirmed transactions')

    const unconfirmedTxs = await db.getUnconfirmedTransactions()

    if (unconfirmedTxs.length > 0) {
      await util.seriesCall(unconfirmedTxs, tx => {
        try {
          return this.client.getrawtransaction(tx.txnTxid, true)
            .then(async rtx => {
              if (!rtx.blockhash) return null              
              // Transaction is confirmed
              const block = await db.getBlockByHash(rtx.blockhash)
              if (block && block.blockID) {
                Logger.info(`Tracker : Marking TXID ${tx.txnTxid} confirmed`)
                return db.confirmTransactions([tx.txnTxid], block.blockID)
              }
            },
            () => {
              // Transaction not in mempool. Update LRU cache and database
              TransactionsBundle.cache.del(tx.txnTxid)
              // TODO: Notify clients of orphaned transaction
              return db.deleteTransaction(tx.txnTxid)
            }
          )
        } catch(e) {
          Logger.error(e, 'Tracker : MempoolProcessor.checkUnconfirmed()')
        }
      })
    }

    // Logs
    const ntx = unconfirmedTxs.length
    const dt = ((Date.now() - t0) / 1000).toFixed(1)
    const per = (ntx == 0) ? 0 : ((Date.now() - t0) / ntx).toFixed(0)
    Logger.info(`Tracker :  Finished processing unconfirmed transactions ${dt}s, ${ntx} tx, ${per}ms/tx`)
  }

  /**
   * Sets the isActive flag
   */
  async _refreshActiveStatus() {
    // Get highest header in the blockchain
    const info = await this.client.getblockchaininfo()
    const highestHeader = info.headers

    // Get highest block processed by the tracker
    const highestBlock = await db.getHighestBlock()
    if (highestBlock == null || highestBlock.blockHeight == 0) {
      this.isActive = false
      return
    }

    // Tolerate a delay of 6 blocks
    this.isActive = (highestHeader >= 550000) && (highestHeader <= highestBlock.blockHeight + 6)
  }

  /**
   * Log mempool statistics
   */
  displayMempoolStats() {
    Logger.info(`Tracker : Mempool Size: ${this.mempoolBuffer.size()}`)
  }

}


module.exports = MempoolProcessor
