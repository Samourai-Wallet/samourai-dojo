/*!
 * accounts/index-cluster.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const os = require('os')
const cluster = require('cluster')
const Logger = require('../lib/logger')


/**
 * Launch a cluster of Samourai API
 */
const nbCPUS = os.cpus()

if (cluster.isMaster) {  
  nbCPUS.forEach(function() {
    cluster.fork()
  })

  cluster.on('listening', function(worker) {
    Logger.info(`Cluster ${worker.process.pid} connected`)
  })
  
  cluster.on('disconnect', function(worker) {
    Logger.info(`Cluster ${worker.process.pid} disconnected`)
  })
  
  cluster.on('exit', function(worker) {
    Logger.info(`Cluster ${worker.process.pid} is dead`)
    // Ensuring a new cluster will start if an old one dies
    cluster.fork()
  })
} else {
  require('./index.js')
}
