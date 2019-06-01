# Delete HD Account

Remove an HD account from the server. All addresses and transactions associated with the HD account will be removed. Transactions that are also associated with another `xpub` will remain.

Note: this endpoint uses the HTTP `DELETE` verb.

```
DELETE /xpub/:xpub
```

## Parameters
* **address** - `string` - The first address of the internal chain for this `xpub`, derivation path `M/1/0`. Use compressed P2PHK address regardless of HD derivation scheme.
* **signature** - `string` - The base64-encoded signature of the double SHA256 hash of `[varuint length of xpub string, xpub string]`. Signature scheme follows [bitcoinjs-message](https://github.com/bitcoinjs/bitcoinjs-message/blob/master/index.js) with a message prefix matching the [coin type](https://github.com/bitcoinjs/bitcoinjs-lib/blob/v3.1.1/src/networks.js). Use the ECPair associated with the `M/1/0` address to sign.
* **at** - `string` (optional) - Access Token (json web token). Required if authentication is activated.

### Example

```
DELETE /xpub/xpub0123456789?address=1address&signature=Base64X==
```

#### Success
Status code 200 with JSON response:
```json
{
  "status": "ok"
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
