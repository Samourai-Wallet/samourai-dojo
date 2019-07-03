/*!
 * lib/remote-importer/sources.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const network = require('../bitcoin/network')
const Logger = require('../logger')
const keys = require('../../keys')[network.key]
const Sources = require('./sources')
const BitcoindWrapper = require('./bitcoind-wrapper')
const OxtWrapper = require('./oxt-wrapper')


/**
 * Remote data sources for mainnet
 */
class SourcesMainnet extends Sources {

  /**
   * Constructor
   */
  constructor() {
    super()
    this._initSource()
  }

  /**
   * Initialize the external data source
   */
  _initSource() {
    if (keys.explorers.bitcoind == 'active') {
      // If local bitcoind option is activated
      // we'll use the local node as our unique source
      this.source = new BitcoindWrapper()
      Logger.info('Activated Bitcoind as the data source for imports')
    } else {
      // Otherwise, we'll use the rest api provided by OXT
      this.source = new OxtWrapper(keys.explorers.oxt)
      Logger.info('Activated OXT API as the data source for imports')
    }
  }

}

module.exports = SourcesMainnet
