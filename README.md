# Samourai Dojo

Samourai Dojo is the backing server for Samourai Wallet. Provides HD account & loose addresses (BIP47) balances & transactions lists. Provides unspent output lists to the wallet. PushTX endpoint broadcasts transactions through the backing bitcoind node.

[View API documentation](../master/doc/README.md)


## Installation ##

### MyDojo (installation with Docker and Docker Compose)

This setup is recommended to Samourai users who feel comfortable with a few command lines.

It provides in a single command the setup of a full Samourai backend composed of:

* a bitcoin full node only accessible as an ephemeral Tor hidden service,
* the backend database,
* the backend modules with an API accessible as a static Tor hidden service,
* a maintenance tool accessible through a Tor web browser.

See [the documentation](./doc/DOCKER_setup.md) for detailed setup instructions.


### Manual installation (developers only)

A full manual setup isn't recommended if you don't intend to install a local development environment.


## Theory of Operation

Tracking wallet balances via `xpub` requires conforming to [BIP44](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki), [BIP49](https://github.com/bitcoin/bips/blob/master/bip-0049.mediawiki) or [BIP84](https://github.com/bitcoin/bips/blob/master/bip-0084.mediawiki) address derivation scheme. Public keys received by Dojo correspond to single accounts and derive all addresses in the account and change chains. These addresses are at `M/0/x` and `M/1/y`, respectively.

Dojo relies on the backing bitcoind node to maintain privacy.


### Architecture

Dojo is composed of 3 modules:
* API (/account): web server providing a REST API and web sockets used by Samourai Wallet and Sentinel.
* PushTx (/pushtx): web server providing a REST API used to push transactions on the Bitcoin P2P network.
* Tracker (/tracker): process listening to the bitcoind node and indexing transactions of interest.

API and PushTx modules are able to operate behind a web server (e.g. nginx) or as frontend http servers (not recommended). Both support HTTP or HTTPS (if SSL has been properly configured in /keys/index.js). These modules can also operate as a Tor hidden service (recommended).

Authentication is enforced by an API key and Json Web Tokens.


### Implementation Notes

**Tracker**

* ZMQ notifications send raw transactions and block hashes. Keep track of txids with timestamps, clearing out old txids after a timeout
* On realtime transaction:
  * Query database with all output addresses to see if an account has received a transaction. Notify client via WebSocket.
  * Query database with all input txids to see if an account has sent coins. Make proper database entries and notify via WebSocket.
* On a block notification, query database for txids included and update confirmed height
* On a blockchain reorg (orphan block), previous block hash will not match last known block hash in the app. Need to mark transactions as unconfirmed and rescan blocks from new chain tip to last known hash. Note that many of the transactions from the orphaned block may be included in the new chain.
* When an input spending a known output is confirmed in a block, delete any other inputs referencing that output, since this would be a double-spend.


**Import of HD Accounts and data sources**

* First import of an unknown HD account relies on a data source (local bitcoind or OXT). After that, the tracker will keep everything current.

* Default option relies on the local bitcoind and makes you 100% independent of Samourai Wallet's infrastructure. This option is recommended for better privacy.

* Activation of bitcoind as the data source:
  * Edit /keys/index.js and set "explorers.bitcoind" to "active". OXT API will be ignored.

* Activation of OXT as the data source (through socks5):
  * Edit /keys/index.js and set "explorers.bitcoind" to "inactive".

* Main drawbacks of using your local bitcoind for these imports:
  * This option is considered as experimental. 
  * It doesn't return the full transactional history associated to an HD account or to an address but only transactions having an unspent output controlled by the HD account or the address.
  * It's slightly slower than using the option relying on the OXT API.
  * It may fail to correctly import an existing wallet if this wallet had a large activity.
  * If you use bitcoind and if the import seems to return an invalid balance, you can use the "XPUB rescan" function provided by the maintenance tool. This function allows you to force the minimum number of addresses to be derived and the start index for the derivation.
  * As a rule of thumb, we recommend to use bitcoind as the source of imports and to setup your Dojo with a new clean wallet. It increases your privacy and it removes all potential issues with the import of a large wallet.
  
