# Scheduled PushTX

Schedule the delayed push of an ordered list of transactions (used for programmable Ricochet).


```
POST /pushtx/schedule
```

Parameters must be passed in the body of the request as json encoded arguments.


## Parameters

* **script** - `ScriptStep[]` - An array of ScriptStep objects defining the script.


## ScriptStep structure

* **hop** - `integer` - Index of this step in the script. 
Transactions are pushed by ascending order of **hop** values.

* **nlocktime** - `integer` - Height of the block after which the transaction should be pushed to the network.
This value shouldn't be set too far in the future (default tolerance is currently the height of current tip + 18 blocks).
If step A has a **hop** value higher than step B, then step A MUST have a **nlocktime** greater than or equal to the **nlocktime** of step B.
If step A and step B have the same **hop** value, then they MAY HAVE different **nlocktime** values.

* **tx** - `string` - The raw transaction hex for the transaction to be pushed during this step.
The transaction MUST HAVE its nLockTime field filled with the height of a block.
The height of the block MUST BE equal to the value of the **nlocktime** field of the ScriptStep object.


### Examples

Ricochet-like script

```

tx0 -- tx1 -- tx2 -- tx3 -- tx4

POST /pushtx/schedule

Request Body (JSON-encoded)
{
  "script": [{
    "hop": 0,
    "nlocktime": 549817,
    "tx": "<tx0_raw_hex>"
  }, {
    "hop": 1,
    "nlocktime": 549818,
    "tx": "<tx1_raw_hex>"
  }, {
    "hop": 2,
    "nlocktime": 549820,
    "tx": "<tx2_raw_hex>"
  }, {
    "hop": 3,
    "nlocktime": 549823,
    "tx": "<tx3_raw_hex>"
  },  {
    "hop": 4,
    "nlocktime": 549824,
    "tx": "<tx4_raw_hex>"
  }]
}
```

Serialized script with 2 parallel branches

```
       -- tx1 -- tx3 ---------
tx0 --|                       |-- tx5
       -- tx2 --------- tx4 --


POST /pushtx/schedule

Request Body (JSON-encoded)
{
  "script": [{
    "hop": 0,
    "nlocktime": 549817,
    "tx": "<tx0_raw_hex>"
  }, {
    "hop": 1,
    "nlocktime": 549818,
    "tx": "<tx1_raw_hex>"
  }, {
    "hop": 1,
    "nlocktime": 549818,
    "tx": "<tx2_raw_hex>"
  }, {
    "hop": 2,
    "nlocktime": 549819,
    "tx": "<tx3_raw_hex>"
  }, {
    "hop": 2,
    "nlocktime": 549820,
    "tx": "<tx4_raw_hex>"
  }, {
    "hop": 3,
    "nlocktime": 549821,
    "tx": "<tx5_raw_hex>"
  }]
}
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
