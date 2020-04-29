/*!
 * accounts/notification-web-sockets.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const _ = require('lodash')
const LRU = require('lru-cache')
const WebSocket = require('websocket')
const Logger = require('../lib/logger')
const network = require('../lib/bitcoin/network')
const keys = require('../keys')[network.key]
const apiHelper = require('./api-helper')
const status = require('./status')
const authMgr = require('../lib/auth/authorizations-manager')

const debug = !!(process.argv.indexOf('ws-debug') > -1)


/**
 * A class providing a notifications server over web sockets
 */
class NotificationsService {

  /**
   * Constructor
   * @param {object} server - listening instance of a http server
   */
  constructor(server) {
    // Web sockets server
    this.ws = null
    // Dictionary of connections
    this.conn = {}
    // Dictionary of subscriptions
    this.subs = {}
    // Dictionary mapping addresses to pubkeys
    this.cachePubKeys = {}

    // Cache registering the most recent subscriptions received
    // Used to filter multiple subscriptions sent by external apps.
    this.cacheSubs = LRU({
      // Maximum number of subscriptions to store in cache
      // Estimate: 1000 clients with an average of 5 subscriptions
      max: 5000,
      // Function used to compute length of item
      length: (n, key) => 1,
      // Maximum age for items in the cache (1mn)
      maxAge: 60000
    })

    // Initialize the web socket server
    this._initWSServer(server)
  }

  /**
   * Initialize the web sockets server
   * @param {object} server - listening instance of a http server
   */
  _initWSServer(server) {
    this.ws = new WebSocket.server({httpServer: server})

    Logger.info('API : Created WebSocket server')

    this.ws.on('request', req => {
      try {
        let conn = req.accept(null, req.origin)
        conn.id = status.sessions++
        conn.subs = []

        debug && Logger.info(`API : Client ${conn.id} connected`)

        conn.on('close', () => {
          this._closeWSConnection(conn, false)
        })

        conn.on('error', err => {
          Logger.error(err, `API : NotificationsService : Error on connection ${conn.id}`)
          if (conn.connected)
            this._closeWSConnection(conn, true)
        })

        conn.on('message', msg => {
          if (msg.type == 'utf8') 
            this._handleWSMessage(msg.utf8Data, conn)
          else
            this._closeWSConnection(conn, true)
        })

        this.conn[conn.id] = conn
        status.clients = status.clients + 1
        status.maxConn = Math.max(status.maxConn, Object.keys(this.conn).length)

      } catch(e) {
        Logger.error(e, `API : NotificationsService._initWSServer() : Error during request accept`)
      }
    })
  }
  
  /**
   * Close a web sockets connection
   * @param {object} conn - web socket connection
   * @param {boolean} forcedClose - true if close initiated by server
   */
  _closeWSConnection(conn, forcedClose) {
    try {
      for (let topic of conn.subs) {
        this._unsub(topic, conn.id)

        // Close initiated by client, remove subscriptions from cache
        if (!forcedClose && this.cacheSubs.has(topic))
          this.cacheSubs.del(topic)
      }

      if (this.conn[conn.id]) {
        delete this.conn[conn.id]
        status.clients = status.clients - 1
      }

      // Close initiated by server, drop the connection
      if (forcedClose && conn.connected)
        conn.drop(1008, 'Get out of here!')

      debug && Logger.info(`API : Client ${conn.id} disconnected`)

    } catch(e) {
      Logger.error(e, 'API : NotificationsService._closeWSConnection()')
    }
  }

  /**
   * Filter potential duplicate subscriptions
   * @param {string} msg - subscription received
   * @returns {boolean} returns false if it's a duplicate, true otherwise.
   */
  _filterWSMessage(msg) {
    if (this.cacheSubs.has(msg)) {
      debug && Logger.info('API : Duplicate subscriptions detected')
      return false
    } else {
      this.cacheSubs.set(msg, true)
      return true
    }
  }

  /**
   * Handle messages received over the web sockets
   * (subscriptions)
   * @param {string} msg - subscription received
   * @param {object} conn - connection
   */
  _handleWSMessage(msg, conn) {
    try {
      debug && Logger.info(`API : Received from client ${conn.id}: ${msg}`)

      const data = JSON.parse(msg)

      // Check authentication (if needed)
      if (authMgr.authActive && authMgr.isMandatory) {
        try {
          authMgr.isAuthenticated(msg.at)
        } catch(e) {
          this.notifyAuthError(e, conn.id)
          return
        }        
      }

      switch(data.op) {
        case 'ping':
          conn.sendUTF('{"op": "pong"}')
          break
        case 'addr_sub':
          if (data.addr) {
            // Check for potential flood by clients
            // subscribing for the same xpub again and again
            if (this._filterWSMessage(data.addr))
              this._entitysub(data.addr, conn)
            else
              this._closeWSConnection(conn, true)
          }
          break
        case 'blocks_sub':
          this._addsub('block', conn)
          break
      }
    } catch(e) {
      Logger.error(e, 'API : NotificationsService._handleWSMessage() : WebSocket message error')
    }
  }

  /**
   * Subscribe to a list of addresses/xpubs/pubkeys
   * @param {string} topic - topic
   * @param {object} conn - connection asking for subscription
   */
  _entitysub(topic, conn) {
    const valid = apiHelper.parseEntities(topic)

    for (let a in valid.addrs) {
      const address = valid.addrs[a]
      this._addsub(address, conn)
      if (valid.pubkeys[a]) {
        this.cachePubKeys[address] = valid.pubkeys[a]
      }
    }

    for (let xpub of valid.xpubs)
      this._addsub(xpub, conn)
  }

  /**
   * Subscribe to a topic
   * @param {string} topic - topic
   * @param {object} conn - connection asking for subscription
   */
  _addsub(topic, conn) {
    if (conn.subs.indexOf(topic) >= 0)
      return false

    conn.subs.push(topic)

    if (!this.subs[topic])
      this.subs[topic] = []

    this.subs[topic].push(conn.id)

    debug && Logger.info(`API : Client ${conn.id} subscribed to ${topic}`)
  }

  /**
   * Unsubscribe from a topic
   * @param {string} topic - topic
   * @param {int} cid - client id
   */
  _unsub(topic, cid) {
    if (!this.subs[topic])
      return false

    const index = this.subs[topic].indexOf(cid)
    if (index < 0) 
      return false

    this.subs[topic].splice(index, 1)

    if (this.subs[topic].length == 0) {
      delete this.subs[topic]
      if (this.cachePubKeys.hasOwnProperty(topic))
        delete this.cachePubKeys[topic]
    }

    return true
  }

  /**
   * Dispatch a notification to all clients
   * who have subscribed to a topic
   * @param {string} topic - topic
   * @param {string} msg - content of the notification
   */
  dispatch(topic, msg) {
    if (!this.subs[topic])
      return

    for (let cid of this.subs[topic]) {
      if (!this.conn[cid]) 
        continue

      try {
        this.conn[cid].sendUTF(msg)
      } catch(e) {
        Logger.error(e, `API : NotificationsService.dispatch() : Error sending dispatch for ${topic} to client ${cid}`)
      }
    }
  }

  /**
   * Dispatch notifications for a new block
   * @param {string} header - block header
   */
  notifyBlock(header) {
    try {
      const data = {
        op: 'block',
        x: header
      }
      this.dispatch('block', JSON.stringify(data))
    } catch(e) {
      Logger.error(e, `API : NotificationsService.notifyBlock()`)
    }
  }

  /**
   * Dispatch notifications for a transaction
   *
   * Transaction notification operates within these constraints:
   *   1. Notify each client ONCE of a relevant transaction
   *   2. Maintain privacy of other parties when transactions are between clients
   *
   *   Clients subscribe to a list of xpubs and addresses. Transactions identify
   *   address and xpub if available on inputs and outputs, omitting inputs and
   *   outputs for untracked addresses.
   *
   *   Example:
   *   tx
   *     inputs
   *       addr1
   *       xpub2
   *     outputs
   *       xpub1
   *       xpub2
   *       addr2
   *       xpub3
   *
   *   subs
   *     addr1: client1, client2
   *     addr2: client1
   *     xpub1: client1
   *     xpub2: client2
   *    xpub4: client3
   *
   *   client1: addr1, addr2, xpub1
   *   client2: addr1, xpub2
   *   client3: xpub4
   *
   *   tx -> client1
   *     inputs
   *       addr1
   *     outputs
   *       xpub1
   *       addr2
   *
   *   tx -> client2
   *     inputs
   *       addr1
   *       xpub2
   *     outputs
   *       xpub2
   *
   * @param {object} tx - transaction
   *
   * @note Synchronous processing done by this method
   * may become a bottleneck in the future if under heavy load.
   * Split in multiple async calls might make sense.
   */
  notifyTransaction(tx) {
    try {
      // Topics extracted from the transaction
      const topics = {}
      // Client subscriptions: {[cid]: [topic1, topic2, ...]}
      const clients = {}

      // Extract topics from the inputs
      for (let i in tx.inputs) {
        let input = tx.inputs[i]
        let topic = null

        if (input.prev_out) {
          // Topic is either xpub or addr. Should it be both?
          if (input.prev_out.xpub) {
            topic = input.prev_out.xpub.m
          } else if (input.prev_out.addr) {
            topic = input.prev_out.addr
          }
        }

        if (this.subs[topic]) {
          topics[topic] = true
          // Add topic information to the input
          input.topic = topic
        }
      }

      // Extract topics from the outputs
      for (let o in tx.out) {
        let output = tx.out[o]
        let topic = null

        if (output.xpub) {
          topic = output.xpub.m
        } else if (output.addr) {
          topic = output.addr
        }

        if (this.subs[topic]) {
          topics[topic] = true
          // Add topic information to the output
          output.topic = topic
        }
      }

      for (let topic in topics) {
        for (let cid of this.subs[topic]) {
          if (!clients[cid])
            clients[cid] = []
          if (clients[cid].indexOf(topic) == -1)
            clients[cid].push(topic)
        }
      }

      // Tailor a transaction for each client
      for (let cid in clients) {
        const ctx = _.cloneDeep(tx)
        ctx.inputs = []
        ctx.out = []

        // List of topics relevant to this client
        const clientTopics = clients[cid]

        // Check for topic information on inputs & outputs (added above)
        for (let input of tx.inputs) {
          const topic = input.topic
          if (topic && clientTopics.indexOf(topic) > -1) {
            const cin = _.cloneDeep(input)
            delete cin.topic
            if (this.cachePubKeys.hasOwnProperty(topic))
              cin.pubkey = this.cachePubKeys[topic]
            ctx.inputs.push(cin)
          }
        }

        for (let output of tx.out) {
          const topic = output.topic
          if (topic && clientTopics.indexOf(topic) > -1) {
            const cout = _.cloneDeep(output)
            delete cout.topic
            if (this.cachePubKeys.hasOwnProperty(topic))
              cout.pubkey = this.cachePubKeys[topic]
            ctx.out.push(cout)
          }
        }

        // Move on if the custom transaction has no inputs or outputs
        if (ctx.inputs.length == 0 && ctx.out.length == 0)
          continue

        // Send custom transaction to client
        const data = {
          op: 'utx',
          x: ctx
        }

        try {
          this.conn[cid].sendUTF(JSON.stringify(data))
          debug && Logger.error(`API : Sent ctx ${ctx.hash} to client ${cid}`)
        } catch(e) {
          Logger.error(e, `API : NotificationsService.notifyTransaction() : Trouble sending ctx to client ${cid}`)
        }
      }

    } catch(e) {
      Logger.error(e, `API : NotificationsService.notifyTransaction()`)
    }
  }

  /**
   * Dispatch notification for an authentication error
   * @param {string} err - error
   * @param {integer} cid - connection id
   */
  notifyAuthError(err, cid) {
    const data = {
      op: 'error',
      msg: err
    }

    try {
      this.conn[cid].sendUTF(JSON.stringify(data))
      debug && Logger.error(`API : Sent authentication error to client ${cid}`)
    } catch(e) {
      Logger.error(e, `API : NotificationsService.notifyAuthError() : Trouble sending authentication error to client ${cid}`)
    }
  }
  

}

module.exports = NotificationsService
