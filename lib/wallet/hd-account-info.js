/*!
 * lib/wallet/hd-account-info.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const errors = require('../errors')
const db = require('../db/mysql-db-wrapper')
const hdaHelper = require('../bitcoin/hd-accounts-helper')
const hdaService = require('../bitcoin/hd-accounts-service')
const rpcLatestBlock = require('../bitcoind-rpc/latest-block')


/**
 * A class storing information about the actibity of a hd account
 */
class HdAccountInfo {

  /**
   * Constructor
   * @param {object} xpub - xpub
   */
  constructor(xpub) {
    // Initializes properties
    this.xpub = xpub
    this.address = xpub
    this.account = 0
    this.depth = 0
    this.finalBalance = 0
    this.accountIndex = 0
    this.changeIndex = 0
    this.accountDerivedIndex = 0
    this.changeDerivedIndex = 0
    this.nTx = 0
    this.unspentOutputs = []
    this.derivation = null
    this.created = null
    this.tracked = false
  }

  /**
   * Ensure the hd account exists in database
   * Otherwise, tries to import it with BIP44 derivation
   * @returns {Promise - integer} return the internal id of the hd account
   *    or null if it doesn't exist
   */
  async ensureHdAccount() {
    try {
      const id = await db.getHDAccountId(this.xpub)
      return id
    } catch(e) {
      if (e == errors.db.ERROR_NO_HD_ACCOUNT) {
        try {
          // Default to BIP44 import
          return hdaService.restoreHdAccount(this.xpub, hdaHelper.BIP44)
        } catch(e) {
          return null
        }
      }
      return null
    }
  }

  /**
   * Load information about the hd account
   * @returns {Promise}
   */
  async loadInfo() {
    try {
      const id = await db.getHDAccountId(this.xpub)
      //if (id == null) return false

      const account = await db.getHDAccount(this.xpub)
      this.created = account.hdCreated
      this.derivation = hdaHelper.typeString(account.hdType)
      this.tracked = true

      this.finalBalance = await db.getHDAccountBalance(this.xpub)

      const unusedIdx = await db.getHDAccountNextUnusedIndices(this.xpub)
      this.accountIndex = unusedIdx[0]
      this.changeIndex = unusedIdx[1]

      const derivedIdx = await db.getHDAccountDerivedIndices(this.xpub)
      this.accountDerivedIndex = derivedIdx[0]
      this.changeDerivedIndex = derivedIdx[1]

      this.nTx = await db.getHDAccountNbTransactions(this.xpub)

      const node = hdaHelper.getNode(this.xpub)
      const index = node[2].index
      const threshold = Math.pow(2,31)
      const hardened = (index >= threshold)
      this.account = hardened ? (index - threshold) : index
      this.depth = node[2].depth

      return true

    } catch(e) {
      return false
    }
  }

  /**
   * Load the utxos associated to the hd account
   * @returns {Promise - object[]}
   */
  async loadUtxos() {
    this.unspentOutputs = []

    const utxos = await db.getHDAccountUnspentOutputs(this.xpub)

    for (let utxo of utxos) {
      const conf = 
        (utxo.blockHeight == null)
        ? 0
        : (rpcLatestBlock.height - utxo.blockHeight + 1)

      const entry = {
        tx_hash: utxo.txnTxid,
        tx_output_n: utxo.outIndex,
        tx_version: utxo.txnVersion,
        tx_locktime: utxo.txnLocktime,
        value: utxo.outAmount,
        script: utxo.outScript,
        addr: utxo.addrAddress,
        confirmations: conf,
        xpub: {
          m: this.xpub,
          path: ['M', utxo.hdAddrChain, utxo.hdAddrIndex].join('/')
        }
      }

      this.unspentOutputs.push(entry)
    }

    // Order the utxos
    this.unspentOutputs.sort((a,b) => b.confirmations - a.confirmations)

    return this.unspentOutputs
  }

  /**
   * Return a plain old js object with hd account properties
   * @returns {object}
   */
  toPojo() {
    return {
      address: this.address,
      final_balance: this.finalBalance,
      account_index: this.accountIndex,
      change_index: this.changeIndex,
      n_tx: this.nTx,
      derivation: this.derivation,
      created: this.created
    }
  }

  /**
   * Return a plain old js object with hd account properties
   * (extended version)
   * @returns {object}
   */
  toPojoExtended() {
    return {
      xpub: this.xpub,
      tracked: this.tracked,
      balance: this.finalBalance,
      unused: {
        external: this.accountIndex,
        internal: this.changeIndex,
      },
      derived: {
        external: this.accountDerivedIndex,
        internal: this.changeDerivedIndex,
      },
      n_tx: this.nTx,
      derivation: this.derivation,
      account: this.account,
      depth: this.depth,
      created: (new Date(this.created * 1000)).toGMTString()
    }
  }

}

module.exports = HdAccountInfo
