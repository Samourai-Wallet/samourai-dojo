/*!
 * scripts/patches/translate-hd-accounts.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const mysql = require('mysql')
const bitcoin = require('bitcoinjs-lib')
const bs58check = require('bs58check')
const bs58 = require('bs58')
const db = require('../../lib/db/mysql-db-wrapper')
const hdaHelper = require('../../lib/bitcoin/hd-accounts-helper')


/**
 * Translate a ypub or zpub into a xpub
 */
function xlatXPUB(xpub) {
  const decoded = bs58check.decode(xpub)
  const ver = decoded.readInt32BE()

  let xlatVer = 0

  if (ver == hdaHelper.MAGIC_XPUB || ver == hdaHelper.MAGIC_YPUB || ver == hdaHelper.MAGIC_ZPUB) {
    xlatVer = hdaHelper.MAGIC_XPUB    
  } else if (ver == hdaHelper.MAGIC_TPUB || ver == hdaHelper.MAGIC_UPUB || ver == hdaHelper.MAGIC_VPUB) {
    xlatVer = hdaHelper.MAGIC_TPUB
  }

  let b = Buffer.alloc(4)
  b.writeInt32BE(xlatVer)

  decoded.writeInt32BE(xlatVer, 0)

  const checksum = bitcoin.crypto.hash256(decoded).slice(0, 4)
  const xlatXpub = Buffer.alloc(decoded.length + checksum.length)

  decoded.copy(xlatXpub, 0, 0, decoded.length)

  checksum.copy(xlatXpub, xlatXpub.length - 4, 0, checksum.length)

  const encoded = bs58.encode(xlatXpub)
  return encoded
}

/**
 * Retrieve hd accounts from db
 */
async function getHdAccounts() {
  const sqlQuery = 'SELECT `hdID`, `hdXpub`, `hdType`  FROM `hd`'
  const query = mysql.format(sqlQuery)
  return db._query(query)
}

/**
 * Update the xpub of a hdaccount
 */
async function updateHdAccount(hdId, xpub) {
  const sqlQuery = 'UPDATE `hd` SET `hdXpub` = ? WHERE `hdID` = ?'
  const params = [xpub, hdId]
  const query = mysql.format(sqlQuery, params)
  return db._query(query)
}

/**
 * Script translating when needed
 * xpubs stored in db into ypub and zpub
 */
async function run() {
  try {
    const hdAccounts = await getHdAccounts()

    for (let account of hdAccounts) {
      const hdId = account.hdID
      const xpub = account.hdXpub
      const info = hdaHelper.classify(account.hdType)
      const scheme = info.type
      
      if ((scheme == hdaHelper.BIP49) || (scheme == hdaHelper.BIP84)) {
        try {
          const xlatedXpub = xlatXPUB(xpub)
          await updateHdAccount(hdId, xlatedXpub)
          console.log(`Updated ${hdId} (${xpub} => ${xlatedXpub})`)
        } catch(e) {
          console.log('A problem was met')
          console.log(e)
        }
      }
    }
  } catch(e) {
    console.log('A problem was met')
    console.log(e)
  }  
}

/**
 * Launch the script
 */
console.log('Start processing')

const startupTimeout = setTimeout(async function() {
  return run().then(() => {
    console.log('Process completed')
  })
}, 1500)