/*!
 * keys/index-example.js
 * Copyright (c) 2016-2018, Samourai Wallet (CC BY-NC-ND 4.0 License).
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
    dojoVersion: process.env.DOJO_VERSION_TAG,
    /*
     * Bitcoind
     */
    bitcoind: {
      // RPC API
      rpc: {
        // Login
        user: process.env.BITCOIND_RPC_USER,
        // Password
        pass: process.env.BITCOIND_RPC_PASSWORD,
        // IP address
        host: 'bitcoind',
        // TCP port
        port: 28256
      },
      // ZMQ Tx notifications
      zmqTx: 'tcp://bitcoind:9501',
      // ZMQ Block notifications
      zmqBlk: 'tcp://bitcoind:9502',
      // Fee type (estimatesmartfee)
      feeType: process.env.NODE_FEE_TYPE
    },
    /*
     * MySQL database
     */
    db: {
      // User
      user: process.env.MYSQL_USER,
      // Password
      pass: process.env.MYSQL_PASSWORD,
      // IP address
      host: 'db',
      // TCP port
      port: 3306,
      // Db name
      database: process.env.MYSQL_DATABASE,
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
      // Port used by pushtx
      pushtx: 8081,
      // Port used by the tracker for its notifications
      tracker: 5555,
      // Port used by pushtx for its notifications
      notifpushtx: 5556,
      // Port used by the pushtx orchestrator for its notifications
      orchestrator: 5557
    },
    /*
     * HTTPS
     * Activate only if node js is used as frontend web server
     * (no nginx proxy server)
     */
    https: {
      // HTTPS for the API
      account: {
        // Activate https
        active: false,
        // Filepath of server private key 
        // (shoud be stored in keys/sslcert)
        keypath: '',
        // Passphrase of the private key
        passphrase: '',
        // Filepath of server certificate
        // (shoud be stored in keys/sslcert)
        certpath: '',
        // Filepath of CA certificate
        // (shoud be stored in keys/sslcert)
        capath: ''
      },
      // HTTPS for pushtx
      pushtx: {
        // Activate https
        active: false,
        // Filepath of server private key
        // (shoud be stored in keys/sslcert)
        keypath: '',
        // Passphrase of the private key
        passphrase: '',
        // Filepath of server certificate
        // (shoud be stored in keys/sslcert)
        certpath: '',
        // Filepath of CA certificate
        // (shoud be stored in keys/sslcert)
        capath: ''
      }
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
      // @todo Set to true !!!
      mandatory: true,
      // List of available authentication strategies
      strategies: {
        // Authentication with a shared local api key
        localApiKey: {
          // List of API keys (alphanumeric characters)
          apiKeys: [process.env.NODE_API_KEY],
          // Admin key (alphanumeric characters)
          adminKey: process.env.NODE_ADMIN_KEY,
          // DO NOT MODIFY
          configurator: 'localapikey-strategy-configurator'
        }
      },
      // Configuration of Json Web Tokens
      // used for the management of authorizations
      jwt: {
        // Secret passphrase used by the server to sign the jwt
        // (alphanumeric characters)
        secret: process.env.NODE_JWT_SECRET,
        accessToken: {
          // Number of seconds after which the jwt expires
          expires: parseInt(process.env.NODE_JWT_ACCESS_EXPIRES)
        },
        refreshToken: {
          // Number of seconds after which the jwt expires
          expires: parseInt(process.env.NODE_JWT_REFRESH_EXPIRES)
        }
      }
    },
    /*
     * Prefixes used by the API
     * for /support and /status endpoints
     */
    prefixes: {
      // Prefix for /support endpoint
      support: process.env.NODE_PREFIX_SUPPORT,
      // Prefix for /status endpoint
      status: process.env.NODE_PREFIX_STATUS,
      // Prefix for pushtx /status endpoint
      statusPushtx: process.env.NODE_PREFIX_STATUS_PUSHTX
    },
    /*
     * Gaps used for derivation of keys
     */
    gap: {
      // Gap for derivation of external addresses
      external: parseInt(process.env.NODE_GAP_EXTERNAL),
      // Gap for derivation of internal (change) addresses
      internal: parseInt(process.env.NODE_GAP_INTERNAL)
    },
    /*
     * Multiaddr endpoint
     */
    multiaddr: {
      // Number of transactions returned by the endpoint
      transactions: 50
    },
    /*
     * Third party explorers
     * used for fast scan of addresses
     */
    explorers: {
      // Use local bitcoind for imports and rescans
      // or use OXT as a fallback
      // Values: active | inactive
      bitcoind: process.env.NODE_IMPORT_FROM_BITCOIND,
      // Use a SOCKS5 proxy for all communications with external services
      // Values: null if no socks5 proxy used, otherwise the url of the socks5 proxy
      socks5Proxy: 'socks5h://172.28.1.4:9050',
      // OXT
      oxt: process.env.NODE_URL_OXT_API
    },
    /*
     * Max number of transactions per address
     * accepted during fast scan
     */
    addrFilterThreshold: parseInt(process.env.NODE_ADDR_FILTER_THRESHOLD),
    /*
     * Pool of child processes
     * for parallel derivation of addresses
     * Be careful with these parameters ;)
     */
    addrDerivationPool: {
      // Min number of child processes always running
      minNbChildren: parseInt(process.env.NODE_ADDR_DERIVATION_MIN_CHILD),
      // Max number of child processes allowed
      maxNbChildren: parseInt(process.env.NODE_ADDR_DERIVATION_MAX_CHILD),
      // Max duration 
      acquireTimeoutMillis: 60000,
      // Parallel derivation threshold
      // (use parallel derivation if number of addresses to be derived 
      //  is greater than thresholdParalleDerivation)
      thresholdParallelDerivation: parseInt(process.env.NODE_ADDR_DERIVATION_THRESHOLD),
    },
    /*
     * PushTx - Scheduler
     */
    txsScheduler: {
      // Max number of transactions allowed in a single script
      maxNbEntries: parseInt(process.env.NODE_TXS_SCHED_MAX_ENTRIES),
      // Max number of blocks allowed in the future
      maxDeltaHeight: parseInt(process.env.NODE_TXS_SCHED_MAX_DELTA_HEIGHT)
    },
    /*
     * Tracker
     */
    tracker: {
      // Processing of mempool (periodicity in ms)
      mempoolProcessPeriod: parseInt(process.env.NODE_TRACKER_MEMPOOL_PERIOD),
      // Processing of unconfirmed transactions (periodicity in ms)
      unconfirmedTxsProcessPeriod: parseInt(process.env.NODE_TRACKER_UNCONF_TXS_PERIOD)
    }
  }

}
