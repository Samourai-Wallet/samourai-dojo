/*!
 * lib/wallet/address-info.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const db = require('../db/mysql-db-wrapper')
const hdaHelper = require('../bitcoin/hd-accounts-helper')


/**
 * A class storing information about the actibity of an address
 */
class AddressInfo {

  /**
   * Constructor
   * @param {object} address - bitcoin address
   */
  constructor(address) {
    // Initializes properties
    this.address = address
    this.pubkey = null
    this.finalBalance = 0
    this.nTx = 0
    this.unspentOutputs = []

    this.tracked = false,
    this.type = 'untracked'
    this.xpub = null
    this.path = null
    this.segwit = null
    this.txs = []
  }

  /**
   * Load information about the address
   * @returns {Promise}
   */
  async loadInfo() {
    const balance = await db.getAddressBalance(this.address)
    if (balance !== null)
      this.finalBalance = balance

    const nbTxs = await db.getAddressNbTransactions(this.address)
    if (nbTxs !== null)
      this.nTx = nbTxs
  }

  /**
   * Load information about the address
   * (extended form)
   * @returns {Promise}
   */
  async loadInfoExtended() {
    const res = await db.getHDAccountsByAddresses([this.address])

    for (let xpub in res.hd) {
      const xpubType = hdaHelper.classify(res.hd[xpub].hdType).type
      const info = res.hd[xpub].addresses[0]
      this.tracked = true
      this.type = 'hd'
      this.xpub = xpub
      this.segwit = (xpubType === hdaHelper.BIP49 || xpubType === hdaHelper.BIP84)
      this.path = ['M', info.hdAddrChain, info.hdAddrIndex].join('/')
    }

    if (res.loose.indexOf(this.address) > -1) {
      this.tracked = true
      this.type = 'loose'
    }

    return this.loadInfo()
  }

  /**
   * Loads a partial list of transactions for this address
   * @param {integer} page - page index
   * @param {integer} count - number of transactions per page
   * @returns {Promise}
   */
  async loadTransactions(page, count) {
    this.txs = await db.getTxsByAddrAndXpubs([this.address])
  }

  /**
   * Load the utxos associated to the address
   * @returns {Promise - object[]}
   */
  async loadUtxos() {
    this.unspentOutputs = []

    const res = await db.getUnspentOutputs([this.address])

    for (let r of res) {
      this.unspentOutputs.push({
        txid: r.txnTxid,
        vout: r.outIndex,
        amount: r.outAmount,
      })
    }

    // Order the utxos
    this.unspentOutputs.sort((a,b) => b.confirmations - a.confirmations)
    return this.unspentOutputs
  }

  /**
   * Return a plain old js object with address properties
   * @returns {object}
   */
  toPojo() {
    const ret = {
      address: this.address,
      final_balance: this.finalBalance,
      n_tx: this.nTx
    }

    if (this.pubkey)
      ret.pubkey = this.pubkey

    return ret
  }

  /**
   * Return a plain old js object with address properties
   * (extended version)
   * @returns {object}
   */
  toPojoExtended() {
    const ret = {
      address: this.address,
      tracked: this.tracked,
      type: this.type,
      balance: this.finalBalance,
      xpub: this.xpub,
      path: this.path,
      segwit: this.segwit,
      n_tx:  this.nTx,
      txids: this.txs.map(t => t.hash),
      utxo: this.unspentOutputs
    }

    if (this.pubkey)
      ret.pubkey = this.pubkey

    return ret
  }

}

module.exports = AddressInfo
