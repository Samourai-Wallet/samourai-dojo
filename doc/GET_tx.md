# Get Transaction

Request details about a single Bitcoin transaction. Pass `?fees=1` to scan the previous outputs and compute the fees paid in this transaction.


```
GET /tx/:txid
GET /tx/:txid?fees=1
```

## Parameters
* **txid** - `string` - The transaction ID
* **fees** - `string` - (optional) Scan previous outputs to compute fees
* **at** - `string` (optional) - Access Token (json web token). Required if authentication is activated.

### Examples

```
GET /tx/abcdef
GET /tx/abcdef?fees=1
```

#### Success
Status code 200 with JSON response:
```json
{
  "txid": "abcdef",
  "size": 250,
  "vsize": 125,
  "version": 1,
  "locktime": 0,
  "block": {
    "height": 100000,
    "hash": "abcdef",
    "time": 1400000000
  },
  "inputs": [
    {
      "n": 0,
      "outpoint": {
        "txid": "abcdef",
        "vout": 2
      },
      "sig": "0a1b2c3d4e5f",
      "seq": 4294967295
    },
    {
      "n": 1,
      "outpoint": {
        "txid": "abcdef",
        "vout": 3
      },
      "sig": "",
      "seq": 4294967295,
      "witness": [
        "aabbccddeeff",
        "00112233"
      ]
    }
  ],
  "outputs": [
    {
      "n": 0,
      "value": 10000,
      "scriptpubkey": "0a1b2c3d4e5f",
      "type": "pubkeyhash",
      "address": "1xAddress"
    },
    {
      "n": 1,
      "value": 0,
      "scriptpubkey": "0a1b2c3d4e5f",
      "type": "nulldata"
    },
    {
      "n": 2,
      "value": 10000,
      "scriptpubkey": "0a1b2c3d4e5f",
      "type": "multisig",
      "addresses": [
        "1xAddress",
        "1yAddress"
      ]
    },
    {
      "n": 3,
      "value": 10000,
      "scriptpubkey": "000a1b2c3d4e5f",
      "type": "witness_v0_scripthash"
    },
    {
      "n": 4,
      "value": 10000,
      "scriptpubkey": "000b1b2c3d4e5f",
      "type": "witness_v0_keyhash"
    }
  ]
}
```
Additional fields with `?fees=1`:
```json
{
  "fees": 10000,
  "feerate": 50,
  "vfeerate": 75,
  "inputs": [
    {
      "outpoint": {
        "value": 20000,
        "scriptpubkey": "0a1b2c3d4e5f"
      }
    }
  ],
  "outputs": ["..."]
}
```

**Notes**
* `block` details will be missing for unconfirmed transactions
* Input `sig` is the raw hex, not ASM of script signature
* `feerate` has units of Satoshi/byte
* `vsize` and `vfeerate` are the virtual size and virtual fee rate and are different than `size` and `feerate` for SegWit transactions

#### Failure
Status code 400 with JSON response:
```json
{
  "status": "error",
  "error": "<error message>"
}
```
