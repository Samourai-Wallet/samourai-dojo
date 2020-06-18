/*!
 * accounts/notification-web-sockets.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const _ = require('lodash')
const zmq = require('zeromq')
const WebSocket = require('websocket')
const Logger = require('../lib/logger')
const network = require('../lib/bitcoin/network')
const keys = require('../keys')[network.key]
const status = require('./status')
const NotificationsService = require('./notifications-service')


/**
 * A singleton providing a notifications server over web sockets
 */
class NotificationsServer {

  /**
   * Constructor
   */
  constructor() {
    // Http server
    this.httpServer = null
    // Notifications service
    this.notifService = null
    // Initialize the zmq socket for communications
    // with the tracker
    this._initTrackerSocket()
  }

  /**
   * Attach the web sockets server to the listening web server
   * @param {pushtx.HttpServer} httpServer - HTTP server
   */
  attach(httpServer) {
    this.httpServer = httpServer

    if (this.notifService !== null) return
    
    this.notifService = new NotificationsService(httpServer.server)
  }


  /**
   * Initialize a zmq socket for notifications from the tracker
   */
  _initTrackerSocket() {
    this.sock = zmq.socket('sub')
    this.sock.connect(`tcp://127.0.0.1:${keys.ports.tracker}`)
    this.sock.subscribe('block')
    this.sock.subscribe('transaction')

    this.sock.on('message', (topic, message, sequence) => {
      switch(topic.toString()) {
        case 'block':
          try {
            const header = JSON.parse(message.toString())
            this.notifService.notifyBlock(header)
          } catch(e) {
            Logger.error(e, 'API : NotificationServer._initTrackerSocket() : Error in block message')
          }
          break
        case 'transaction':
          try {
            const tx = JSON.parse(message.toString())
            this.notifService.notifyTransaction(tx)
          } catch(e) {
            Logger.error(e, 'API : NotificationServer._initTrackerSocket() : Error in transaction message')
          }
          break
        default:
          Logger.info(`API : Unknown ZMQ message topic: "${topic}"`)
      }
    })
  }

}

module.exports = new NotificationsServer()
