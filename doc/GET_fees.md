# Get Fees

Returns `bitcoind`'s estimated fee rates for inclusion in blocks at various delays. Fee rates are in Satoshi/byte.


```
GET /fees
```

## Parameters
* **at** - `string` (optional) - Access Token (json web token). Required if authentication is activated. Alternatively, the access token can be passed through the `Authorization` HTTP header (with the `Bearer` scheme).


### Examples

```
GET /fees
```

#### Success
Status code 200 with JSON response:
```json
{
  "2": 181,
  "4": 150,
  "6": 150,
  "12": 111,
  "24": 62
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
