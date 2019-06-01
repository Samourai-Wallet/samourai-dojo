/*!
 * lib/error.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

/**
 * Dictionary of error codes
 */
module.exports = {
  get: {
    UNKNXPUB: 'Unknown xpub. Create with POST /xpub',
    DISALLOWED: 'GET not allowed. Use POST',
  },
  body: {
    NODATA: 'No body data',
    NOXPUB: 'Missing body parameter "xpub"',
    NOTYPE: 'Missing body parameter "type"',
    NOADDR: 'Missing body parameter "address"',
    NOMSG: 'Missing body parameter "message"',
    NOSIG: 'Missing body parameter "signature"',
    NOSCRIPT: 'Missing body parameter "script"',
    SCRIPTSIZE: 'Too many entries in the script',
    NOTX: 'Missing body parameter "tx"',
    INVTYPE: 'Invalid value for parameter "type"',
    INVDATA: 'Invalid request arguments'
  },
  sig: {
    INVSIG: 'Invalid bitcoin signature',
    INVMSG: 'Invalid message content',
    INVADDR: 'Incorrect bitcoin address used for signature',
  },
  tx: {
    PARSE: 'Unable to parse transaction hex',
    SEND: 'Unable to broadcast transaction',
    TXID: 'Malformed txid',
  },
  address: {
    INVALID: 'Invalid address',
  },
  xpub: {
    INVALID: 'Invalid xpub',
    CHAIN: 'Invalid chain',
    PRIVKEY: 'No private keys',
    CREATE: 'Unable to create new HD account',
    RESTORE: 'Unable to restore HD account',
    OVERLAP: 'Import in progress',
    SEGWIT: 'Invalid value for SegWit support type',
    LOCKED: 'Unable to complete operation (locked xpub)'
  },
  txout: {
    VOUT: 'Invalid vout',
    NOTFOUND: 'Unspent output not found',
  },
  multiaddr: {
    NOACT: 'Missing parameter "active"',
    INVALID: 'No valid active entries',
    AMBIG: 'Ambiguous "new" parameter: pass only one xpub',
  },
  generic: {
    GEN: 'Error',
    DB: 'Database Error',
  },
  auth: {
    INVALID_CONF: 'Missing configuration parameter',
    INVALID_JWT: 'Invalid JSON Web Token',
    INVALID_PRF: 'Your current access rights do not allow this operation',
    MISSING_JWT: 'Missing JSON Web Token',
    TECH_ISSUE: 'A technical problem was encountered. Unable to authenticate the user'
  },
  db: {
    ERROR_NO_ADDRESS: 'ERROR_NO_ADDRESS',
    ERROR_NO_HD_ACCOUNT: 'ERROR_NO_HD_ACCOUNT'
  },
  pushtx: {
    NLOCK_MISMATCH: 'nLockTime in script does not match nLockTime in transaction',
    SCHEDULED_TOO_FAR: 'nLockTime is set to far in the future',
    SCHEDULED_BAD_ORDER: 'Order of hop and nLockTime values must be consistent'
  }
}
