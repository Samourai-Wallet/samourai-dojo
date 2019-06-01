/*!
 * tracker/block.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const bitcoin = require('bitcoinjs-lib')
const util = require('../lib/util')
const Logger = require('../lib/logger')
const db = require('../lib/db/mysql-db-wrapper')
const Transaction = require('./transaction')
const TransactionsBundle = require('./transactions-bundle')


/**
 * A class allowing to process a transaction
 */
class Block extends TransactionsBundle {

  /**
   * Constructor
   * @param {string} hex - block in hex format
   * @param {string} header - block header
   */
  constructor(hex, header) {
    super()
    this.hex = hex
    this.header = header
  }

  /**
   * Register the block and transactions of interest in db
   * @returns {Promise - object[]} returns an array of transactions to be broadcast
   */
  async checkBlock() {
    Logger.info('Beginning to process new block.')

    let block
    const txsForBroadcast = []
    
    try {
      block = bitcoin.Block.fromHex(this.hex)
      this.transactions = block.transactions
    } catch (e) {
      Logger.error(e, 'Block.checkBlock()')
      Logger.error(null, this.header)
      return Promise.reject(e)
    }
    
    const t0 = Date.now()
    let ntx = 0
    
    // Filter transactions
    const filteredTxs = await this.prefilterTransactions()

    // Check filtered transactions
    // and broadcast notifications
    await util.seriesCall(filteredTxs, async tx => {
      const filteredTx = new Transaction(tx)
      const txCheck = await filteredTx.checkTransaction()
      if (txCheck && txCheck.broadcast)
        txsForBroadcast.push(txCheck.tx)
    })

    // Retrieve the previous block
    // and store the new block into the database
    const prevBlock = await db.getBlockByHash(this.header.previousblockhash)
    const prevID = (prevBlock && prevBlock.blockID) ? prevBlock.blockID : null

    const blockId = await db.addBlock({
      blockHeight: this.header.height,
      blockHash: this.header.hash,
      blockTime: this.header.time,
      blockParent: prevID
    })

    Logger.info(` Added block ${this.header.height} (id=${blockId})`)

    // Confirms the transactions
    const txids = this.transactions.map(t => t.getId())
    ntx = txids.length    
    const txidLists = util.splitList(txids, 100)
    await util.seriesCall(txidLists, list => db.confirmTransactions(list, blockId))

    // Logs and result returned
    const dt = ((Date.now()-t0)/1000).toFixed(1)
    const per = ((Date.now()-t0)/ntx).toFixed(0)
    Logger.info(` Finished block ${this.header.height}, ${dt}s, ${ntx} tx, ${per}ms/tx`)

    return txsForBroadcast
  }

  /**
   * Register the block header
   * @param {int} prevBlockID - id of previous block
   * @returns {Promise}
   */
  async checkBlockHeader(prevBlockID) {
    Logger.info('Beginning to process new block header.')

    // Insert the block header into the database
    const blockId = await db.addBlock({
      blockHeight: this.header.height,
      blockHash: this.header.hash,
      blockTime: this.header.time,
      blockParent: prevBlockID
    })

    Logger.info(` Added block header ${this.header.height} (id=${blockId})`)

    return blockId
  }

}

module.exports = Block
