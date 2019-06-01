# PushTX

Push a transaction to the network.

```
POST /pushtx/
```

## Parameters
* **tx** - `hex string` - The raw transaction hex
* **at** - `string` (optional) - Access Token (json web token). Required if authentication is activated.

### Example

```
POST /pushtx/?tx=abcdef0123456789
```

#### Success
Status code 200 with JSON response:
```json
{
  "status": "ok",
  "data": "<txid>"
}
```

#### Failure
Status code 400 with JSON response:
```json
{
  "status": "error",
  "error": {
    "message": "<error message>",
    "code": "<error code>"
  }
}
```
