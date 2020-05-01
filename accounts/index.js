/*!
 * accounts/index.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
(async () => {

  'use strict'

  const Logger = require('../lib/logger')
  const RpcClient = require('../lib/bitcoind-rpc/rpc-client')
  const network = require('../lib/bitcoin/network')
  const keys = require('../keys')[network.key]
  const db = require('../lib/db/mysql-db-wrapper')
  const hdaHelper = require('../lib/bitcoin/hd-accounts-helper')
  const HttpServer = require('../lib/http-server/http-server')
  const AuthRestApi = require('../lib/auth/auth-rest-api')
  const XPubRestApi = require('./xpub-rest-api')
  const FeesRestApi = require('./fees-rest-api')
  const HeadersRestApi = require('./headers-rest-api')
  const TransactionsRestApi = require('./transactions-rest-api')
  const StatusRestApi = require('./status-rest-api')
  const notifServer = require('./notifications-server')
  const MultiaddrRestApi = require('./multiaddr-rest-api')
  const UnspentRestApi = require('./unspent-rest-api')
  const SupportRestApi = require('./support-rest-api')


  /**
   * Samourai REST API
   */
  Logger.info('API : Process ID: ' + process.pid)
  Logger.info('API : Preparing the REST API')
  
  // Wait for Bitcoind RPC API
  // being ready to process requests
  await RpcClient.waitForBitcoindRpcApi()

  // Initialize the db wrapper
  const dbConfig = {
    connectionLimit: keys.db.connectionLimitApi,
    acquireTimeout: keys.db.acquireTimeout,
    host: keys.db.host,
    user: keys.db.user,
    password: keys.db.pass,
    database: keys.db.database
  }

  db.connect(dbConfig)

  // Activate addresses derivation
  // in an external process
  hdaHelper.activateExternalDerivation()

  // Initialize the http server
  const host = keys.apiBind
  const port = keys.ports.account
  const httpServer = new HttpServer(port, host)

  // Initialize the rest api endpoints
  const authRestApi = new AuthRestApi(httpServer)
  const xpubRestApi = new XPubRestApi(httpServer)
  const feesRestApi = new FeesRestApi(httpServer)
  const headersRestApi = new HeadersRestApi(httpServer)
  const transactionsRestApi = new TransactionsRestApi(httpServer)
  const statusRestApi = new StatusRestApi(httpServer)
  const multiaddrRestApi = new MultiaddrRestApi(httpServer)
  const unspentRestApi = new UnspentRestApi(httpServer)
  const supportRestApi = new SupportRestApi(httpServer)

  // Start the http server
  httpServer.start()

  // Attach the web sockets server to the web server
  notifServer.attach(httpServer)

})().catch(err => {
  console.error(err)
  process.exit(1)
})
