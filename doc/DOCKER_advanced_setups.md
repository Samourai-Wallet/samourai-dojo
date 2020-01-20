# MyDojo - Advanced Setups


The configuration files of Dojo provide a few advanced options allowing to tune your setup.

A word of caution, though, the default values of these options try to maximize your privacy at a network level. Some of the advanced setups described in this document may damage your privacy. Use at your own risk!


## Table of Content ##
- [Local indexer of Bitcoin addresses](#local_indexer)
- [Local Electrum server used as data source for imports/rescans](#local_electrum)
- [External Bitcoin full node](#external_bitcoind)
- [bitcoind RPC API ans ZMQ notifications exposed to external apps](#exposed_rpc_zmq)
- [Static onion address for bitcoind hidden service](#static_onion)
- [Configure Tor Bridges](#tor_bridges)
- [Support of testnet](#testnet)


<a name="local_indexer"/>

## Local indexer of Bitcoin addresses ##

By default, Dojo uses the local full node as its data source for imports and rescans of HD accounts and addresses. While private, this default option has many limitations. MyDojo allows to install a local indexer ([addrindexrs](https://github.com/Samourai-Wallet/addrindexrs)) providing the best of both worlds (no request sent to a third party, fast and real time rescans, complete transactional history is retrieved).


### Requirements ###

To date, the initial installation of the indexer requires 120GB of additionnal disk space.


### Main benefits ###

- Fast, private and exhaustive real time rescans,
- Allows the block explorer to display the detailed activity of Bitcoin addresses


### Known drawbacks ###

* Additionnal disk space consumed by the index,
* Increased duration of upgrades (from 5 to 20 minutes depending on the machine hosting your Dojo),
* Slight increase of startup duration,
* First indexation will require a few hours.


### Procedure ###

```
# Edit the indexer config template file
nano ./conf/docker-indexer.conf.tpl

#
# Set the value of INDEXER_INSTALL to "on"
# Save and exit nano
#

# Edit the nodejs config file (or the corresponding template file if it's your first installation of Dojo)
nano ./conf/docker-node.conf

#
# Set the value of NODE_ACTIVE_INDEXER to "local_indexer"
# Save and exit nano
#

#
# Launch the installation or the upgrade of your Dojo
# with the commands `dojo.sh install` or `dojo.sh upgrade`
#

#
# Be patient!
# First indexation of all Bitcoin addresses will require a few hours.
# Let the indexer complete all these operations before trying to use it for an import or a rescan.
# You can follow the progress made by the indexer with the commands:
#   `dojo.sh logs`
# or
#   `dojo.sh logs indexer`
#
```


<a name="local_electrum"/>

## Local Electrum server used as data source for imports/rescans ##

If you're running an instance of ElectrumX or Electrs on your local network, Dojo allows you to define this instance as the data source used for imports and rescans. This setup is an alternative to the local indexer provided by MyDojo.

Important: Do not use an Electrum server operated by a third party or hosted on a different local network.


### Procedure ###

```
# Edit the indexer config template file
nano ./conf/docker-indexer.conf.tpl

#
# Set the value of INDEXER_INSTALL to "off"
# Set the value of INDEXER_IP with the IP address of your Electrum server
# Set the value of INDEXER_RPC_PORT with the port used by the RPC API of your Electrum server (default= 50001)
# Set the value of INDEXER_BATCH_SUPPORT to "active" if your Electrum server is ElectrumX, otherwise set the value to "inactive"
# Save and exit nano
#

# Edit the nodejs config file (or the corresponding template file if it's your first installation of Dojo)
nano ./conf/docker-node.conf

#
# Set the value of NODE_ACTIVE_INDEXER to "local_indexer"
# Save and exit nano
#
```


<a name="external_bitcoind"/>

## External Bitcoin full node ##

By default, Dojo installs and runs a Bitcoin full node in Docker.

The following procedure allows to bypass the installation of this full node by telling Dojo to rely on an external bitcoind running on your host machine.


### Requirements ###

The external full node mustn't be pruned.

The external full node must be configured for the support of Dojo. Edit the bitcoin.conf file of your external full node and check that the following lines are properly initialized.

```
# Force bitcoind to accept JSON-RPC commands
server=1

# Force bitcoind to index all the transactions
txindex=1

# Check that bitcoind accepts connections from 127.0.0.1 (linux)
# or from the IP address of the Docker Virtual Machine (MacOS, Windows)
rpcallowip=... 

# Check that a port is defined for the RPC API (or 8332 will be used as default value)
rpcport=...

# Check that the RPC API listens on an IP address accessible from the nodejs container
rpcbind=...

# Check that the RPC user is set
rpcuser=...

# Check that the RPC password is set
rpcpassword=

# Enable publish hash block on an IP address accessible from the nodejs container
zmqpubhashblock=...

# Enable publish raw transaction on an IP address accessible from the nodejs container
zmqpubrawtx=...
```


### Procedure ###

#### Configuration of Dojo ####

```
# Edit the bitcoin config template file
nano ./conf/docker-bitcoind.conf.tpl

#
# Set the value of BITCOIND_INSTALL to "off"
# Set the value of BITCOIND_IP with the IP address of you bitcoin full node
# Set the value of BITCOIND_RPC_PORT with the port used by your bitcoin full node for the RPC API
# Set the value of BITCOIND_ZMQ_RAWTXS with the port used by your bitcoin full node for ZMQ notifications of raw transactions
#   (i.e. port defined for -zmqpubrawtx in the bitcoin.conf of your full node)
# Set the value of BITCOIND_ZMQ_BLK_HASH with the port used by your bitcoin full node for ZMQ notifications of block hashes
#   (i.e. port defined for -zmqpubhashblock in the bitcoin.conf of your full node)
#
# Save and exit nano
#
```

### Fast import of block headers in Dojo (optional) ###

When Dojo is installed for the first time, the Tracker imports the block headers in the database.

Follow these steps if you want to speed up this operation by preloading an archive of the block headers.

```
# Download the archive [https://samouraiwallet.com/static/share/2_blocks.sql.gz](https://samouraiwallet.com/static/share/2_blocks.sql.gz) to the "<dojo_dir>/db-scripts/" directory. Don't modify the name of the archive.
```


#### Start the installation of Dojo ####

```
./dojo.sh install
```


<a name="exposed_rpc_zmq"/>

## bitcoind RPC API ans ZMQ notifications exposed to external apps ##

By default, access to the RPC API of your bitcoind is restricted to Docker containers hosted on the "dojonet" network.

The following steps allow to expose the RPC API and ZMQ notifications to applications running on your local machine but outside of Docker.

```
# 
# If your Docker runs on macos or windows,
# retrieve the local IP address of the VM
# hosting your Docker containers
#

# Stop your Dojo
./dojo.sh stop

# Edit the bitcoin config file
nano ./conf/docker-bitcoind.conf

#
# Set the value of BITCOIND_RPC_EXTERNAL to "on"
#
# If your Docker runs on macos or windows,
# set the value of BITCOIND_RPC_EXTERNAL_IP to the IP address of the VM
#
# Save and exit nano
#

# Start your Dojo
./dojo.sh start
```

With this setting, external applications running on your local machine should be able to access the following ports:
* 9500: bitcoind zmqpubhashtx notifications
* 9501: bitcoind zmqpubrawtx notifications
* 9502: bitcoind zmqpubhashblock notifications
* 9503: bitcoind zmqpubrawblock notifications
* 28256: bitcoind RPC API

Note: this option has no effect if your setup relies on a external full node (i.e. if BITCOIND_INSTALL is set to "off").


<a name="static_onion"/>

## Static onion address for bitcoind hidden service ##

By default, Dojo creates a new onion address for your bitcoind at each startup. 

The following steps allow to keep a static onion address (not recommended).

```
# Stop your Dojo
./dojo.sh stop

# Edit the bitcoin config file
nano ./conf/docker-bitcoind.conf

#
# Set the value of BITCOIND_EPHEMERAL_HS to "off"
#

# Start your Dojo
./dojo.sh start
```

Note: this option has no effect if your setup relies on a external full node (i.e. if BITCOIND_INSTALL is set to "off").


<a name="tor_bridges"/>

## Configure Tor Bridges ##

By default, Dojo doesn't try to hide that Tor is being used. For the majority of Dojo users, connecting to Tor with the default configuration is appropriate and will work successfully. For some users, it may be appropriate to configure Tor Bridges in order to circumvent censorship enforced by ISP, censorship enforcement bodies and other interested parties.

The following steps allow to activate the use of Tor bridges by Dojo.

```
# Stop your Dojo
./dojo.sh stop

# Head over to https://bridges.torproject.org
# Click on "Get bridges", then you will see a form with "Advanced Options" header
# Leave the Pluggable Transport as "obfs4" and click on "Get Bridges" button
# Solve the captcha, you will get the bridge addresses, usually three lines:
#   obfs4 24.106.248.94:65531 B9EFBC5... cert=yrX... iat-mode=0
#   obfs4 ...
#   obfs4 ...

# Edit the tor config file
nano ./conf/docker-tor.conf

#
# Set the value of TOR_USE_BRIDGES to "on"
#
# Set the values of TOR_BRIDGE_n properties with info returned by the website
# For instance, if the first line generated by the website is:
#   obfs4 24.106.248.94:65531 B9EFBC5... cert=yrX... iat-mode=0
# You will have to set:
#   TOR_BRIDGE_1=obfs4 24.106.248.94:65531 B9EFBC5... cert=yrX... iat-mode=0
#
# Save and exit nano
#
```


<a name="testnet"/>

## Support of testnet ##

By default, Dojo is installed for running on Bitcoin mainnet.

The following steps allow to install an instance of Dojo running on Bitcoin testnet.

```
# Edit the common config template file
nano ./conf/docker-common.conf.tpl

#
# Set the value of COMMON_BTC_NETWORK to "testnet"
#
# Save and exit nano
#
```

Note: This option must be set before the first installation of Dojo and mustn't be changed after this first installation.

Known limitation: A single instance of Dojo can be run per machine (a same machine can't host both a mainnet and a testnet instance of Dojo).
