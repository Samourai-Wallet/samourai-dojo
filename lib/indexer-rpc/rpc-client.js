/*!
 * lib/indexer_rpc/rpc-client.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const net = require('net')
const makeConcurrent = require('make-concurrent')
const network = require('../bitcoin/network')
const keys = require('../../keys')[network.key]


/**
 * RPC client for an indexer
 * following the Electrum protocol
 */
class RpcClient {

  /**
   * Constructor
   */
  constructor(opts) {
    this._opts = {
      host: keys.indexer.localIndexer.host,
      port: keys.indexer.localIndexer.port,
      concurrency: Infinity,
      timeout: 10000
    }

    if (this._opts.concurrency !== Infinity) {
      this._call = makeConcurrent(
        this._call.bind(this),
        {concurrency: this._opts.concurrency}
      )
    }
  }

  /**
   * Set an option
   * @param {string} key
   * @param {*} value
   * @return {RpcClient}
   */
  set(key, value) {
    this._opts[key] = value
    return this
  }

  /**
   * Get an option
   * @param {string} key
   * @return {*}
   */
  get(key) {
    return this._opts[key]
  }

  /**
   * Check if an error returned by the wrapper
   * is a connection error.
   * @param {string} err - error message
   * @returns {boolean} returns true if message related to a connection error
   */
  static isConnectionError(err) {
    if (typeof err != 'string')
      return false

    const isTimeoutError = (err.indexOf('connect ETIMEDOUT') != -1)
    const isConnRejected = (err.indexOf('Connection Rejected') != -1)

    return (isTimeoutError || isConnRejected)
  }

  /**
   * Check if the rpc api is ready to process requests
   * @returns {Promise}
   */
  static async waitForIndexerRpcApi(opts) {
    let client = new RpcClient(opts)

    try {
      await client.sendRequest('server.version', 'dojo', ['1.0', '1.4'])
    } catch(e) {
      client = null
      Logger.info('Indexer RPC : API is still unreachable. New attempt in 20s.')
      return util.delay(20000).then(() => {
        return RpcClient.waitForIndexerRpcApi()
      })
    }
  }

  /**
   * Send multiple requests (batch mode)
   * @param {Object[]} batch - array of objects {method: ..., params: ...}
   * @return {Promise}
   */
  async sendBatch(batch) {
    return this._call(batch, true)
  }

  /**
   * Send multiple requests (flood mode)
   * @param {Object[]} batch - array of objects {method: ..., params: ...}
   * @return {Promise}
   */
  async sendRequests(batch) {
    return this._call(batch, false)
  }

  /**
   * Send a request
   * @param {string} method - called method
   * @return {Promise}
   */
  async sendRequest(method, ...params) {
    const batch = [{method: method, params: params}]
    const ret = await this._call(batch, false)
    return ret[0]
  }

  /**
   * Send requests (internal method)
   * @param {Object[]} data - array of objects {method: ..., params: ...}
   * @returns {Promise}
   */
  async _call(data, batched) {
    return new Promise((resolve, reject) => {
      let methodId = 0
      let requests = []
      let responses = []
      let response = ''

      const requestErrorMsg = `Indexer JSON-RPC: host=${this._opts.host} port=${this._opts.port}:`

      // Prepare an array of requests
      requests = data.map(req => {
        return JSON.stringify({
          jsonrpc: '2.0',
          method: req.method,
          params: req.params || [],
          id: methodId++
        })
      })

      // If batch mode
      // send a single batched request
      if (batched)
        requests = [`[${requests.join(',')}]`]

      // Initialize the connection
      const conn = net.Socket()
      conn.setTimeout(this._opts.timeout)
      conn.setEncoding('utf8')
      conn.setKeepAlive(true, 0)
      conn.setNoDelay(true)

      conn.on('connect', () => {
        // Send the requests
        for (let request of requests)
          conn.write(request + '\n')
      })

      conn.on('timeout', () => {
        const e = new Error('ETIMEDOUT')
        e.errorno = 'ETIMEDOUT'
        e.code = 'ETIMEDOUT'
        e.connect = false
        conn.emit('error', e)
      })

      conn.on('data', chunk => {
        // Process the received chunk char by char
        for (let c of chunk) {
          response += c
          // Detect the end of a response
          if (c == '\n') {
            try {
              // Parse the response
              let parsed = JSON.parse(response)
              if (parsed.error)
                throw new Error(JSON.stringify(parsed.error))
              // Add the parsed reponse to the array of responses
              if (batched) {
                responses = parsed.map(p => { return {idxAddr: p.id, txs: p.result} })
              } else {
                responses.push({idxAddr: parsed.id, txs: parsed.result})
              }
              // Reset the response
              response = ''
              // If all responses have been received
              // close the connection 
              if (responses.length == data.length)
                conn.end()
            } catch (err) {
              reject(
                new Error(`${requestErrorMsg} Error Parsing JSON: ${err.message}, data: ${response}`)
              )
            }
          }
        }
      })

      conn.on('end', e => {
        // Connection closed
        // we can return the responses
        resolve(responses)
      })

      conn.on('error', e => {
        reject(new Error(`${requestErrorMsg} Request error: ${e}`))
      })

      // Connect to the RPC API
      conn.connect({
        host: this._opts.host,
        port: this._opts.port
      })

    })
  }

}

module.exports = RpcClient
