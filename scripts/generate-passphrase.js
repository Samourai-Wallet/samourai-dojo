/*!
 * scripts/generate_passphrase.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

const bip39 = require('bip39')


/**
 * Script generating a strong random passphrase (128-bits of entropy)
 * Useful for the generation of a strong api key or oa strong jwt secret (see /keys/index-example.js).
 */

function run() {
  const mnemonic = bip39.generateMnemonic()
  console.log(`Generated passphrase = ${mnemonic}`)
}


/**
 * Launch the script
 */
run()

