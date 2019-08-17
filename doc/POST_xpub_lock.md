# Lock an HD Account Type

To avoid errors related to `POST xpub` and SegWit derivation type, this endpoint allows locking of the type of an xpub in the database.

```
POST /xpub/:xpub/lock
```

## Parameters
* **address** - `string` - The first address of the internal chain for this `xpub`, derivation path `M/1/0`. Use compressed P2PHK address regardless of HD derivation scheme.
* **message** - `string` - Either `"lock"` or `"unlock"`
* **signature** - `string` - The base64-encoded signature of the double SHA256 hash of `[varuint length of message string, message string]`. Signature scheme follows [bitcoinjs-message](https://github.com/bitcoinjs/bitcoinjs-message/blob/master/index.js) with a message prefix matching the [coin type](https://github.com/bitcoinjs/bitcoinjs-lib/blob/v3.1.1/src/networks.js). Use the ECPair associated with the `M/1/0` address to sign.
* **at** - `string` (optional) - Access Token (json web token). Required if authentication is activated. Alternatively, the access token can be passed through the `Authorization` HTTP header (with the `Bearer` scheme).

### Example

```
POST /xpub/xpub0123456789/lock?address=1address&message=lock&signature=Base64X==
```

#### Success
Status code 200 with JSON response:
```json
{
  "status": "ok",
  "data": {
    "derivation": "LOCKED BIP49, etc"
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
