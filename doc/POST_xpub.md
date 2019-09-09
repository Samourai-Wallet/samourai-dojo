# Add HD Account

Notify the server of the new HD account for tracking. When new accounts are sent, there is no need to rescan the addresses for existing transaction activity. SegWit support is provided via [BIP49](https://github.com/bitcoin/bips/blob/master/bip-0049.mediawiki) or [BIP84](https://github.com/bitcoin/bips/blob/master/bip-0084.mediawiki).

Response time for restored accounts might be long if there is much previous activity.


```
POST /xpub
```

Parameters must be passed in the body of the request as url encoded arguments.


## Parameters
* **xpub** - `string` - The extended public key for the HD Account
* **type** - `string` - Whether this is a newly-created account or one being restored. Recognized values are `'new'` and `'restore'`.
* **segwit** - `string` (optional) - What type of SegWit support for this xpub, if any. Valid values: `'bip49'` and `'bip84'`
* **force** - `boolean` (optional) - Force an override of derivation scheme even if xpub is locked. Used for `'restore'` operation.
* **at** - `string` (optional) - Access Token (json web token). Required if authentication is activated. Alternatively, the access token can be passed through the `Authorization` HTTP header (with the `Bearer` scheme).


### Example

```
POST /xpub

xpub=xpub0123456789&type=restore&segwit=bip84
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
