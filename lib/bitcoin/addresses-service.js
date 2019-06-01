/*!
 * lib/bitcoin/addresses-service.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const db = require('../db/mysql-db-wrapper')
const remote = require('../remote-importer/remote-importer')


/**
 * A singleton providing an Adresses service
 */
class AddressesService {

  /**
   * Constructor
   */
  constructor() {}

  /**
   * Rescan the blockchain for an address
   * @param {string} address - bitcoin address
   * @returns {Promise}
   */
  async rescan(address) {
    const hdaccount = await db.getUngroupedHDAccountsByAddresses([address])
    // Don't filter addresses associated to an HDAccount
    const filterAddr = !(hdaccount.length > 0 && hdaccount[0]['hdID'])
    return remote.importAddresses([address], filterAddr)
  }

  /**
   * Restore an address in db
   * @param {string[]} addresses - array of bitcoin addresses
   * @param {boolean} filterAddr - true if addresses should be filter, false otherwise
   * @returns {Promise}
   */
  async restoreAddresses(address, filterAddr) {
    return remote.importAddresses(address, filterAddr)
  }
}

module.exports = new AddressesService()