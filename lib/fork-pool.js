/*!
 * lib/fork-pool.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const os = require('os')
const childProcess = require('child_process')
const genericPool = require('generic-pool')
const Logger = require('./logger')


/**
 * A class managing a pool of child processes
 * Inspired from fork-pool by Andrew Sliwinski
 * https://github.com/thisandagain/fork-pool/
 */
class ForkPool {

  /**
   * Constructor
   */
  constructor(path, options) {
    if (!options) {
      this._networkKey = ''
      this._options = {
        max: os.cpus().length / 2,
        min: os.cpus().length / 2,
        acquireTimeoutMillis: 60000
      }
    } else {
      this._networkKey = options.networkKey
      this._options = options
    }

    const factory = {
      create: () => {
        return childProcess.fork(path, [this._networkKey])
      },
      destroy: (cp) => {
        cp.kill()
      }
    }

    this.pool = genericPool.createPool(factory, this._options)
    Logger.info(`Created ${this._options.min} child processes for addresses derivation (max = ${this._options.max})`)
  }

  /**
   * Enqueue a new task to be processed by a child process
   * @param {object} data - data to be passed to the child process
   * @returns {Promise}
   */
  async enqueue(data) {
    let cp
    const pool = this.pool
    
    return new Promise(async (resolve, reject) => {
      try {
        cp = await pool.acquire()

        cp.send(data)

        cp.once('message', async msg => {
          pool.release(cp)
          resolve(msg)
        })

      } catch(e) {
        reject(e)
      }
    })
  }

  /**
   * Drain the pool
   */
  async drain() {
    await this.pool.drain()
    await this.pool.clear()
  }

}

module.exports = ForkPool
