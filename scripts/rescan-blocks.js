/*!
 * scripts/tracker.index.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const Logger = require('../lib/logger')
const BlockchainProcessor = require('../tracker/blockchain-processor')


/**
 * Script executing a rescan of the chain from a given block
 */

async function run(height) {
  const processor = new BlockchainProcessor()
  // Rewind the chain
  await processor.rewind(height - 1)
  // Catchup
  await processor.catchup()
}


/**
 * Launch the script
 */

// Retrieves command line arguments
if (process.argv.length < 3) {
  Logger.error(null, 'Missing arguments. Command = node rescan-blocks.js <from_block_height>')
  return
}

Logger.info('Start processing')

const height = parseInt(process.argv[2])

const startupTimeout = setTimeout(async function() {
  return run(height).then(() => {
    Logger.info('Process completed')
  })
}, 1500)
