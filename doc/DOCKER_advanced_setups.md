# MyDojo - Advanced Setups


The configuration files of Dojo provide a few advanced options allowing to tune your setup.

A word of caution, though, the default values of these options try to maximize your privacy at a network level. Some of the advanced setups described in this document may damage your privacy. Use at your own risk!


## Table of Content ##
- [Local indexer of Bitcoin addresses](#local_indexer)
- [Local Electrum server used as data source for imports/rescans](#local_electrum)
- [Local Whirlpool client](#local_whirlpool)
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
# If you're installing a new Dojo or if you're upgrading from a Dojo version <= 1.4.1, edit the docker-indexer.conf.tpl file
nano ./conf/docker-indexer.conf.tpl

# Otherwise, edit the docker-indexer.conf file
nano ./conf/docker-indexer.conf

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
# If you're installing a new Dojo or if you're upgrading from a Dojo version <= 1.4.1, edit the docker-indexer.conf.tpl file
nano ./conf/docker-indexer.conf.tpl

# Otherwise, edit the docker-indexer.conf file
nano ./conf/docker-indexer.conf

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


<a name="local_whirlpool"/>

## Local Whirlpool client ##

This setup allows to install and run a [Whirlpool client](https://github.com/Samourai-Wallet/whirlpool-client-cli) inside MyDojo.

The client can be configured and controlled through a REST API exposed as a Tor hidden service.


### Procedure ###

```
# If you're installing a new Dojo or if you're upgrading from a Dojo version < 1.6, edit the docker-whirlpool.conf.tpl file
nano ./conf/docker-whirlpool.conf.tpl

# Otherwise, edit the docker-whirlpool.conf file
nano ./conf/docker-whirlpool.conf

#
# Set the value of WHIRLPOOL_INSTALL to "on"
## Save and exit nano
#
```

### Installation of Whirlppol GUI ###

The [Whirlpool GUI application]((https://github.com/Samourai-Wallet/whirlpool-gui)) provides a graphical interface for your Whirlpool client.  

These steps describe how to install the Whirlpool GUI application how a computer and how to connect it to your Whirlpool client.


**Requirements**

- MyDojo has been fully initialized,
- Whirlpool client has been activated in MyDojo,
- Your Samourai Wallet is paired to MyDojo,
- MyDojo is running.
- Tor browser is installed on the computer that will run the Whirlpool GUI application. 


**Procedure**

- Retrieve the onion address of the API provided by your Whirlpool client

  ```
  # Open a terminal console on the computer hosting your Dojo
  
  # Retrieve the onion address of the Whirlpool API
  ./dojo.sh onion
  ```

- Install and configure the Whirlpool GUI application

  ```
  # If needed, install Tor browser on the computer that will run the Whirlpool GUI application

  # Install the Whirlpool GUI application on the computer and launch it.
  
  # Select 'Connect to remote CLI'.
  # Insert the onion address of the Whirlpool API, **prefixed by HTTP**, in the first block
  # Set the port to 80 
  # Let the API pairing key BLANK.
  # Click 'Connect'.

  # Paste the pairing payload from your mobile device when prompted:
  #   Select the Samourai Wallet Menu (3 dots top right),
  #   Go to Settings -> Transactions -> Pair to Whirlpool GUI,
  #   Copy the payload and send to your main computer using any method you prefer,
  #   Paste the payload. 
  
  # The GUI will restart and prompt for you to enter your Samourai Wallet passphrase.
  # You are all set and ready to mix!
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
# If you're installing a new Dojo, edit the docker-bitcoind.conf.tpl file
nano ./conf/docker-bitcoind.conf.tpl

# Otherwise, edit the docker-bitcoind.conf file
nano ./conf/docker-bitcoind.conf

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

# If you're installing a new Dojo, edit the docker-bitcoind.conf.tpl file
nano ./conf/docker-bitcoind.conf.tpl

# Otherwise, edit the docker-bitcoind.conf file
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

# If you're installing a new Dojo, edit the docker-bitcoind.conf.tpl file
nano ./conf/docker-bitcoind.conf.tpl

# Otherwise, edit the docker-bitcoind.conf file
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

# If you're installing a new Dojo, edit the docker-tor.conf.tpl file
nano ./conf/docker-tor.conf.tpl

# Otherwise, edit the docker-tor.conf file
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
# Edit the docker-common.conf.tpl file
nano ./conf/docker-common.conf.tpl

#
# Set the value of COMMON_BTC_NETWORK to "testnet"
#
# Save and exit nano
#
```

Note: This option must be set before the first installation of Dojo and mustn't be changed after this first installation.

Known limitation: A single instance of Dojo can be run per machine (a same machine can't host both a mainnet and a testnet instance of Dojo).
