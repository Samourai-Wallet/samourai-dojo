/*!
 * tracker/index.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
(async () => {

  'use strict'

  const RpcClient = require('../lib/bitcoind-rpc/rpc-client')
  const network = require('../lib/bitcoin/network')
  const keys = require('../keys')[network.key]
  const db = require('../lib/db/mysql-db-wrapper')
  const Logger = require('../lib/logger')
  const Tracker = require('./tracker')


  Logger.info('Process ID: ' + process.pid)
  Logger.info('Preparing the tracker')

  // Wait for Bitcoind RPC API
  // being ready to process requests
  await RpcClient.waitForBitcoindRpcApi()

  // Initialize the db wrapper
  const dbConfig = {
    connectionLimit: keys.db.connectionLimitTracker,
    acquireTimeout: keys.db.acquireTimeout,
    host: keys.db.host,
    user: keys.db.user,
    password: keys.db.pass,
    database: keys.db.database
  }

  db.connect(dbConfig)

  // Start the tracker
  const tracker = new Tracker()
  tracker.start()

})().catch(err => {
  console.error(err)
  process.exit(1)
})
