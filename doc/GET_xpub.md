# Get HD Account

Request details about an HD account. If account does not exist, it must be created with [POST /xpub](./POST_xpub.md), and this call will return an error.

Data returned includes the unspent `balance`, the next `unused` address indices for external and internal chains, the `derivation` path of addresses, and the `created` timestamp when the server first saw this HD account.

```
GET /xpub/:xpub
```

## Parameters
* **:xpub** - `string` - The extended public key for the HD Account
* **at** - `string` (optional) - Access Token (json web token). Required if authentication is activated.

### Example

```
GET /xpub/xpub0123456789
```

#### Success
Status code 200 with JSON response:
```json
{
  "status": "ok",
  "data": {
    "balance": 100000000,
    "unused": {
      "external": 2,
      "internal": 1
    },
    "derivation": "BIP44|BIP49",
    "created": 1500000000
  }
}
```

#### Failure
Status code 400 with JSON response:
```json
{
  "status": "error",
  "error": "<error message>"
}
```
