/*!
 * pushtx/index.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
(async () => {

  'use strict'

  const Logger = require('../lib/logger')
  const db = require('../lib/db/mysql-db-wrapper')
  const RpcClient = require('../lib/bitcoind-rpc/rpc-client')
  const network = require('../lib/bitcoin/network')
  const keys = require('../keys')[network.key]
  const HttpServer = require('../lib/http-server/http-server')
  const PushTxRestApi = require('./pushtx-rest-api')
  const pushTxProcessor = require('./pushtx-processor')


  /**
   * PushTx API
   */
  Logger.info('Process ID: ' + process.pid)
  Logger.info('Preparing the pushTx API')

  // Wait for Bitcoind RPC API
  // being ready to process requests
  await RpcClient.waitForBitcoindRpcApi()

  // Initialize the db wrapper
  const dbConfig = {
    connectionLimit: keys.db.connectionLimitPushTxApi,
    acquireTimeout: keys.db.acquireTimeout,
    host: keys.db.host,
    user: keys.db.user,
    password: keys.db.pass,
    database: keys.db.database
  }

  db.connect(dbConfig)

  // Initialize notification sockets of singleton pushTxProcessor
  pushTxProcessor.initNotifications({
    uriSocket: `tcp://127.0.0.1:${keys.ports.notifpushtx}`
  })

  // Initialize the http server
  const host = keys.apiBind
  const port = keys.ports.pushtx
  const httpServer = new HttpServer(port, host)

  // Initialize the PushTx rest api
  const pushtxRestApi = new PushTxRestApi(httpServer)

  // Start the http server
  httpServer.start()

})().catch(err => {
  console.error(err)
  process.exit(1)
})
