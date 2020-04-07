/*!
 * keys/index-example.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */


/**
 * Desired structure of /keys/index.js, which is ignored in the repository.
 */
module.exports = {
  /*
   * Mainnet parameters
   */
  bitcoin: {
    /*
     * Dojo version
     */
    dojoVersion: '1.5.0',
    /*
     * Bitcoind
     */
    bitcoind: {
      // RPC API
      rpc: {
        // Login
        user: 'user',
        // Password
        pass: 'password',
        // IP address
        host: '127.0.0.1',
        // TCP port
        port: 8332
      },
      // ZMQ Tx notifications
      zmqTx: 'tcp://127.0.0.1:9501',
      // ZMQ Block notifications
      zmqBlk: 'tcp://127.0.0.1:9502',
      // Fee type (estimatesmartfee)
      feeType: 'ECONOMICAL'      
    },
    /*
     * MySQL database
     */
    db: {
      // User
      user: 'user',
      // Password
      pass: 'password',
      // IP address
      host: '127.0.0.1',
      // TCP port
      port: 3306,
      // Db name
      database: 'db_name',
      // Timeout
      acquireTimeout: 15000,
      // Max number of concurrent connections
      // for each module
      connectionLimitApi: 50,
      connectionLimitTracker: 10,
      connectionLimitPushTxApi: 5,
      connectionLimitPushTxOrchestrator: 5
    },
    /*
     * TCP Ports
     */
    ports: {
      // Port used by the API
      account: 8080,
      // Port used by pushtx API
      pushtx: 8081,
      // Port used by the tracker API
      trackerApi: 8082,
      // Port used by the tracker for its notifications
      tracker: 5555,
      // Port used by pushtx for its notifications
      notifpushtx: 5556,
      // Port used by the pushtx orchestrator for its notifications
      orchestrator: 5557
    },
    /*
     * Authenticated access to the APIs (account & pushtx)
     */
    auth: {
      // Name of the authentication strategy used
      // Available values:
      //    null          : No authentication
      //    'localApiKey' : authentication with a shared local api key
      activeStrategy: 'localApiKey',
      // Flag indicating if authenticated access is mandatory
      // (useful for launch, othewise should be true)
      mandatory: false,
      // List of available authentication strategies
      strategies: {
        // Authentication with a shared local api key
        localApiKey: {
          // List of API keys (alphanumeric characters)
          apiKeys: ['<myApiKey>', '<myApiKey2>'],
          // Admin key (alphanumeric characters)
          adminKey: '<myAdminKey>',
          // DO NOT MODIFY
          configurator: 'localapikey-strategy-configurator'
        }
      },
      // Configuration of Json Web Tokens
      // used for the management of authorizations
      jwt: {
        // Secret passphrase used by the server to sign the jwt
        // (alphanumeric characters)
        secret: '<my_secret>',
        accessToken: {
          // Number of seconds after which the jwt expires
          expires: 600
        },
        refreshToken: {
          // Number of seconds after which the jwt expires
          expires: 7200
        }
      }
    },
    /*
     * Prefixes used by the API
     * for /support and /status endpoints
     */
    prefixes: {
      // Prefix for /support endpoint
      support: 'support',
      // Prefix for /status endpoint
      status: 'status',
      // Prefix for pushtx /status endpoint
      statusPushtx: 'status'
    },
    /*
     * Gaps used for derivation of keys
     */
    gap: {
      // Gap for derivation of external addresses
      external: 20,
      // Gap for derivation of internal (change) addresses
      internal: 20
    },
    /*
     * Multiaddr endpoint
     */
    multiaddr: {
      // Number of transactions returned by the endpoint
      transactions: 50
    },
    /*
     * Indexer or third party service
     * used for fast scan of addresses
     */
    indexer: {
      // Active indexer
      // Values: local_bitcoind | local_indexer | third_party_explorer
      active: 'local_bitcoind',
      // Local indexer
      localIndexer: {
        // IP address or hostname
        host: '127.0.0.1',
        // Port
        port: 50001,
        // Support of batch requests
        // Values: active | inactive
        batchRequests: 'inactive'
      },
      // Use a SOCKS5 proxy for all communications with external services
      // Values: null if no socks5 proxy used, otherwise the url of the socks5 proxy
      socks5Proxy: null,
      // OXT
      oxt: 'https://api.oxt.me'
    },
    /*
     * Max number of transactions per address
     * accepted during fast scan
     */
    addrFilterThreshold: 1000,
    /*
     * Pool of child processes
     * for parallel derivation of addresses
     * Be careful with these parameters ;)
     */
    addrDerivationPool: {
      // Min number of child processes always running
      minNbChildren: 2,
      // Max number of child processes allowed
      maxNbChildren: 2,
      // Max duration 
      acquireTimeoutMillis: 60000,
      // Parallel derivation threshold
      // (use parallel derivation if number of addresses to be derived 
      //  is greater than thresholdParalleDerivation)
      thresholdParallelDerivation: 10
    },
    /*
     * PushTx - Scheduler
     */
    txsScheduler: {
      // Max number of transactions allowed in a single script
      maxNbEntries: 10,
      // Max number of blocks allowed in the future
      maxDeltaHeight: 18
    },
    /*
     * Tracker
     */
    tracker: {
      // Processing of mempool (periodicity in ms)
      mempoolProcessPeriod: 2000,
      // Processing of unconfirmed transactions (periodicity in ms)
      unconfirmedTxsProcessPeriod: 300000
    }
  },

  /*
   * Testnet parameters
   */
  testnet: {
    bitcoind: {
      rpc: {
        user: 'user',
        pass: 'password',
        host: '127.0.0.1',
        port: 18332
      },
      zmqTx: 'tcp://127.0.0.1:19501',
      zmqBlk: 'tcp://127.0.0.1:19502',
      feeType: 'ECONOMICAL'
    },
    db: {
      user: 'user',
      pass: 'password',
      host: '127.0.0.1',
      port: 3306,
      database: 'db_name',
      acquireTimeout: 15000,
      connectionLimitApi: 5,
      connectionLimitTracker: 5,
      connectionLimitPushTxApi: 1,
      connectionLimitPushTxOrchestrator: 5
    },
    ports: {
      account: 18080,
      pushtx: 18081,
      trackerApi: 18082,
      tracker: 15555,
      notifpushtx: 15556,
      orchestrator: 15557
    },
    auth: {
      activeStrategy: null,
      mandatory: false,
      strategies: {
        localApiKey: {
          apiKeys: ['<myApiKey>', '<myApiKey2>'],
          adminKey: '<myAdminKey>',
          configurator: 'localapikey-strategy-configurator'
        }
      },
      jwt: {
        secret: 'myJwtSecret',
        accessToken: {
          expires: 600
        },
        refreshToken: {
          expires: 7200
        }
      }
    },
    prefixes: {
      support: 'support',
      status: 'status',
      statusPushtx: 'status'
    },
    gap: {
      external: 20,
      internal: 20
    },
    multiaddr: {
      transactions: 50
    },
    indexer: {
      active: 'third_party_explorer',
      localIndexer: {
        host: '127.0.0.1',
        port: 50001,
        batchRequests: 'inactive'
      },
      socks5Proxy: null,
      esplora: 'https://blockstream.info/testnet'
    },
    addrFilterThreshold: 1000,
    addrDerivationPool: {
      minNbChildren: 1,
      maxNbChildren: 1,
      acquireTimeoutMillis: 60000,
      thresholdParallelDerivation: 10
    },
    txsScheduler: {
      maxNbEntries: 10,
      maxDeltaHeight: 18
    },
    tracker: {
      mempoolProcessPeriod: 2000,
      unconfirmedTxsProcessPeriod: 300000
    }
  }
}