# Get Transactions

Request a paginated list of transactions related to a collection of HD accounts and/or loose addresses and/or public keys.

Note that loose addresses that are also part of one of the HD accounts requested will be ignored. Their transactions are listed as part of the HD account result.

```
GET /txs?active=...
```

## Parameters
* **active** - `string` - A pipe-separated list of extended public keys and/or loose addresses and/or pubkeys (`xpub1|address1|address2|pubkey1|...`)
* **page** - `integer` - Index of the requested page (first page is index 0)
* **count** - `integer` - Number of transactions returned per page
* **at** - `string` (optional) - Access Token (json web token). Required if authentication is activated. Alternatively, the access token can be passed through the `Authorization` HTTP header (with the `Bearer` scheme).

### Examples

```
GET /txs?active=xpub0123456789
GET /txs?active=xpub0123456789|address1|address2|pubkey1
```

#### Success
Status code 200 with JSON response:
```json
{
  "n_tx": 153,
  "page": 2,
  "n_tx_page": 50,
  "txs": [
    {
      "block_height": 100000,
      "hash": "abcdef",
      "version": 1,
      "locktime": 0,
      "result": -10000,
      "time": 1400000000,
      "inputs": [
        {
          "vin": 1,
          "prev_out": {
            "txid": "abcdef",
            "vout": 2,
            "value": 20000,
            "xpub": {
              "m": "xpubABCDEF",
              "path": "M/0/3"
            },
            "addr": "1xAddress",
            "pubkey": "04Pubkey"
          },
          "sequence": 4294967295
        }
      ],
      "out": [
        {
          "n": 2,
          "value": 10000,
          "addr": "1xAddress",
          "pubkey": "03Pubkey"
          "xpub": {
            "m": "xpubABCDEF",
            "path": "M/1/5"
          }
        }
      ]
    }
  ]
}
```

**Notes**
* The transaction `inputs` and `out` arrays are for known addresses only and do not reflect the full input and output list of the transaction on the blockchain
* `result.txs[i].block_height` should not be present for unconfirmed transactions
* `result.txs[i].result` is the change in value for the "wallet" as defined by all entries on the `active` query parameter
* `result.txs[i].inputs[j].prev_out.addr` should be present for BIP47-related addresses but may be `null` if the previous output address is unknown
* `result.txs[i].out[j].addr` should be present for BIP47-related addresses

#### Failure
Status code 400 with JSON response:
```json
{
  "status": "error",
  "error": "<error message>"
}
```
