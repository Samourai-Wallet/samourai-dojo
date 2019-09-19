/*!
 * tracker/blockchain-processor.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const _ = require('lodash')
const zmq = require('zeromq')
const Sema = require('async-sema')
const util = require('../lib/util')
const Logger = require('../lib/logger')
const db = require('../lib/db/mysql-db-wrapper')
const network = require('../lib/bitcoin/network')
const keys = require('../keys')[network.key]
const AbstractProcessor = require('./abstract-processor')
const Block = require('./block')
const TransactionsBundle = require('./transactions-bundle')


/**
 * A class allowing to process the blockchain
 */
class BlockchainProcessor extends AbstractProcessor {

  /**
   * Constructor
   * @param {object} notifSock - ZMQ socket used for notifications
   */
  constructor(notifSock) {
    super(notifSock)
    // ZeroMQ socket for bitcoind blocks messages
    this.blkSock = null
    // Initialize a semaphor protecting the onBlockHash() method
    this._onBlockHashSemaphor = new Sema(1, { capacity: 50 })
    // Flag tracking Initial Block Download Mode
    this.isIBD = true
  }

  /**
   * Start processing the blockchain
   * @returns {Promise}
   */
  async start() {
    await this.catchup()
    await this.initSockets()
  }

  /**
   * Start processing the blockchain
   */
  async stop() {}

  /**
   * Tracker process startup
   * @returns {Promise}
   */
  async catchup() {
    // Consider that we are in IBD mode if Dojo is far in the past
    const highest = await db.getHighestBlock()
    this.isIBD = highest.blockHeight < 570000

    if (this.isIBD)
      return this.catchupIBDMode()
    else
      return this.catchupNormalMode()
  }

  /**
   * Tracker process startup (normal mode)
   * 1. Grab the latest block height from the daemon
   * 2. Pull all block headers after database last known height
   * 3. Process those block headers
   *
   * @returns {Promise}
   */
  async catchupIBDMode() {
    try {
      Logger.info('Tracker Startup (IBD mode)')

      const info = await this.client.getblockchaininfo()
      const daemonNbBlocks = info.blocks
      const daemonNbHeaders = info.headers

      // Get highest block processed by the tracker
      const highest = await db.getHighestBlock()
      const dbMaxHeight = highest.blockHeight
      let prevBlockId = highest.blockID

      // If no header or block loaded by bitcoind => try later
      if (daemonNbHeaders == 0 || daemonNbBlocks == 0) {
        Logger.info('New attempt scheduled in 30s (waiting for block headers)')
        return util.delay(30000).then(() => {
          return this.catchupIBDMode()
        })

      // If we have more blocks to load in db
      } else if (daemonNbHeaders - 1 > dbMaxHeight) {

        // If blocks need to be downloaded by bitcoind => try later
        if (daemonNbBlocks - 1 <= dbMaxHeight) {
          Logger.info('New attempt scheduled in 10s (waiting for blocks)')
          return util.delay(10000).then(() => {
            return this.catchupIBDMode()
          })

        // If some blocks are ready for an import in db
        } else {
          const blockRange = _.range(dbMaxHeight + 1, daemonNbBlocks + 1)

          Logger.info(`Sync ${blockRange.length} blocks`)

          await util.seriesCall(blockRange, async height => {
            try {
              const blockHash = await this.client.getblockhash(height)
              const header = await this.client.getblockheader(blockHash, true)
              prevBlockId = await this.processBlockHeader(header, prevBlockId)
            } catch(e) {
              Logger.error(e, 'BlockchainProcessor.catchupIBDMode()')
              process.exit()
            }
          }, 'Tracker syncing', true)

          // Schedule a new iteration (in case more blocks need to be loaded)
          Logger.info('Start a new iteration')
          return this.catchupIBDMode()
        }

      // If we are synced
      } else {
        this.isIBD = false
      }

    } catch(e) {
      Logger.error(e, 'BlockchainProcessor.catchupIBDMode()')
      throw e
    }
  }

  /**
   * Tracker process startup (normal mode)
   * 1. Grab the latest block height from the daemon
   * 2. Pull all block headers after database last known height
   * 3. Process those block headers
   *
   * @returns {Promise}
   */
  async catchupNormalMode() {
    try {
      Logger.info('Tracker Startup (normal mode)')

      const info = await this.client.getblockchaininfo()
      const daemonNbBlocks = info.blocks

      // Get highest block processed by the tracker
      const highest = await db.getHighestBlock()
      if (highest == null) return null
      if (daemonNbBlocks == highest.blockHeight) return null

      // Compute blocks range to be processed
      const blockRange = _.range(highest.blockHeight, daemonNbBlocks + 1)

      Logger.info(`Sync ${blockRange.length} blocks`)

      // Process the blocks
      return util.seriesCall(blockRange, async height => {
        try {
          const hash = await this.client.getblockhash(height)
          const header = await this.client.getblockheader(hash)
          return this.processBlock(header) 
        } catch(e) {
          Logger.error(e, 'BlockchainProcessor.catchupNormalMode()')
          process.exit()
        }
      }, 'Tracker syncing', true)

    } catch(e) {
      Logger.error(e, 'BlockchainProcessor.catchupNormalMode()')
    }
  }

  /**
   * Initialiaze ZMQ sockets
   */
  initSockets() {
    // Socket listening to bitcoind Blocks messages
    this.blkSock = zmq.socket('sub')
    this.blkSock.connect(keys.bitcoind.zmqBlk)
    this.blkSock.subscribe('hashblock')

    this.blkSock.on('message', (topic, message) => {
      switch (topic.toString()) {
        case 'hashblock':
          this.onBlockHash(message)
          break
        default:
          Logger.info(topic.toString())
      }
    })

    Logger.info('Listening for blocks')
  }

  /**
   * Upon receipt of a new block hash, retrieve the block header from bitcoind via
   * RPC. Continue pulling block headers back through the chain until the database
   * contains header.previousblockhash, adding the headers to a stack. If the 
   * previousblockhash is not found on the first call, this is either a chain 
   * re-org or the tracker missed blocks during a shutdown.
   *
   * Once the chain has bottomed out with a known block in the database, delete
   * all known database transactions confirmed in blocks at heights greater than
   * the last known block height. These transactions are orphaned but may reappear 
   * in the new chain. Notify relevant accounts of balance updates / 
   * transaction confirmation counts.
   *
   * Delete block entries not on the main chain.
   *
   * Forward-scan through the block headers, pulling the full raw block hex via 
   * RPC. The raw block contains all transactions and is parsed by bitcoinjs-lib.
   * Add the block to the database. Run checkTransaction for each transaction in 
   * the block that is not in the database. Confirm all transactions in the block.
   *
   * After each block, query bitcoin against all database unconfirmed outputs
   * to see if they remain in the mempool or have been confirmed in blocks. 
   * Malleated transactions entering the wallet will disappear from the mempool on
   * block confirmation.
   *
   * @param {Buffer} buf - block
   * @returns {Promise}
   */
  async onBlockHash(buf) {
    try {
      // Acquire the semaphor
      await this._onBlockHashSemaphor.acquire()

      const blockHash = buf.toString('hex')
      let headers = null

      try {
        const header = await this.client.getblockheader(blockHash, true)
        Logger.info(`Block #${header.height} ${blockHash}`)
        // Grab all headers between this block and last known
        headers = await this.chainBacktrace([header])
      } catch(err) {
        Logger.error(err, `BlockchainProcessor.onBlockHash() : error in getblockheader(${blockHash})`)
      }
      
      if(headers == null)
        return null

      // Reverse headers to put oldest first
      headers.reverse()

      const deepest = headers[0]
      const knownHeight = deepest.height - 1

      // Cancel confirmation of transactions
      // and delete blocks after the last known block height
      await this.rewind(knownHeight)

      // Process the blocks
      return await util.seriesCall(headers, header => {
        return this.processBlock(header) 
      })

    } catch(e) {
      Logger.error(e, 'BlockchainProcessor.onBlockHash()')
    } finally {
      // Release the semaphor
      await this._onBlockHashSemaphor.release()
    }
  }

  /**
   * Zip back up the blockchain until a known prevHash is found, returning all
   * block headers from last header in the array to the block after last known.
   * @param {object[]} headers - array of block headers
   * @returns {Promise}
   */
  async chainBacktrace(headers) {
    // Block deepest in the blockchain is the last on the list
    const deepest = headers[headers.length - 1]

    if (headers.length > 1)
      Logger.info(`chainBacktrace @ height ${deepest.height}, ${headers.length} blocks`)

    // Look for previous block in the database
    const block = await db.getBlockByHash(deepest.previousblockhash)

    if (block == null) {
      // Previous block does not exist in database. Grab from bitcoind
      const header = await this.client.getblockheader(deepest.previousblockhash, true)
      headers.push(header)
      return this.chainBacktrace(headers)
    } else {
      // Previous block does exist. Return headers
      return headers
    }
  }

  /**
   * Cancel confirmation of transactions 
   * and delete blocks after a given height
   * @param {integer} height - height of last block maintained
   * @returns {Promise}
   */
  async rewind(height) {
    // Retrieve transactions confirmed in reorg'd blocks
    const txs = await db.getTransactionsConfirmedAfterHeight(height)

    if (txs.length > 0) {
      // Cancel confirmation of transactions included in reorg'd blocks
      Logger.info(`Backtrace: unconfirm ${txs.length} transactions in reorg`)
      const txids = txs.map(t => t.txnTxid)
      await db.unconfirmTransactions(txids)
    }

    // TODO: get accounts and notify of deletion ?

    await db.deleteBlocksAfterHeight(height)
  }

  /**
   * Rescan a range of blocks
   * @param {integer} fromHeight - height of first block
   * @param {integer} toHeight - height of last block
   * @returns {Promise}
   */
  async rescanBlocks(fromHeight, toHeight) {
    // Get highest block processed by the tracker
    const highest = await db.getHighestBlock()
    const dbMaxHeight = highest.blockHeight

    if (toHeight == null)
      toHeight = fromHeight

    toHeight = Math.min(toHeight, dbMaxHeight)
    const blockRange = _.range(fromHeight, toHeight + 1)

    Logger.info(`Blocks Rescan : starting a rescan for ${blockRange.length} blocks`)

    // Process the blocks
    return util.seriesCall(blockRange, async height => {
      try {
        Logger.info(`Rescanning block ${height}`)
        const hash = await this.client.getblockhash(height)
        const header = await this.client.getblockheader(hash)
        return this.processBlock(header) 
      } catch(e) {
        Logger.error(e, 'BlockchainProcessor.rescan()')
        throw e
      }
    }, 'Tracker rescan', true)
  }

  /**
   * Process a block
   * @param {object} header - block header
   * @returns {Promise}
   */
  async processBlock(header) {
    try {
      // Get raw block hex string from bitcoind
      const hex = await this.client.getblock(header.hash, false)

      const block = new Block(hex, header)
      
      const txsForBroadcast = await block.checkBlock()

      // Send notifications
      for (let tx of txsForBroadcast)
        this.notifyTx(tx)

      this.notifyBlock(header)

    } catch(e) {
      // The show must go on.
      // TODO: further notification that this block did not check out
      Logger.error(e, 'BlockchainProcessor.processBlock()')
    }
  }

  /**
   * Process a block header
   * @param {object} header - block header
   * @param {int} prevBlockID - id of previous block
   * @returns {Promise}
   */
  async processBlockHeader(header, prevBlockID) {
    try {
      const block = new Block(null, header)
      return block.checkBlockHeader(prevBlockID)
    } catch(e) {
      Logger.error(e, 'BlockchainProcessor.processBlockHeader()')
      throw e
    }
  }

}

module.exports = BlockchainProcessor
