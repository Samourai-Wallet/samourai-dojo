/*!
 * scripts/delete-data-banned-addresses.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const mysql = require('mysql')
const Logger = require('../lib/logger')
const util = require('../lib/util')
const db = require('../lib/db/mysql-db-wrapper')


/**
 * Script deleting all data related to addresses registered in the ban list
 */

async function getBannedAddresses() {
  const query = mysql.format('SELECT `addrAddress` FROM `banned_addresses`')
  return db._query(query)
}


async function deleteAddress(address) {
  const addr = address.addrAddress
  Logger.info('Start deletion of address ' + addr)
  const query = mysql.format(
    'DELETE `addresses`.* FROM `addresses` WHERE `addresses`.`addrAddress` = ?',
    addr
  )
  const ret = await db._query(query)
  Logger.info('Completed deletion of address ' + addr)
  return ret
}


async function getUnlinkedTransactions() {
  const query = mysql.format(
    'SELECT `transactions`.`txnTxid` \
     FROM `transactions` \
     WHERE `transactions`.`txnID` NOT IN (SELECT `outputs`.`txnID` FROM `outputs`) \
     AND `transactions`.`txnID` NOT IN (SELECT `inputs`.`txnID` FROM `inputs`)'
  )
  return db._query(query)
}


async function deleteTransaction(tx) {
  const txid = tx.txnTxid
  Logger.info('Start deletion of transaction ' + txid)
  await db.deleteTransaction(txid)
  Logger.info('Completed deletion of transaction ' + txid)
}


async function run() {
  // Get a list of banned addresses
  const addresses = await getBannedAddresses()
  // Delete addresses, outputs, inputs
  // related to a banned address
  await util.seriesCall(addresses, deleteAddress)
  // Get a list of unlinked transactions
  const txs = await getUnlinkedTransactions()
  // Deletes the transactions
  await util.seriesCall(txs, deleteTransaction)
}


/**
 * Launch the script
 */

Logger.info('Start processing')

const startupTimeout = setTimeout(async function() {
  return run().then(() => {
    Logger.info('Processing completed')
  })
}, 1500)

