# MyDojo - Advanced Setups


The 3 configuration files of Dojo provide a few advanced options allowing to tune your setup.

A word of caution, though, the default values of these options try to maximize your privacy at a network level. All the advanced setups described in this document may damage your privacy. Use at your own risk!


<a name="external_bitcoind"/>

## External Bitcoin full node ##

By default, Dojo installs and runs a Bitcoin full node in Docker.

The following procedure allows to bypass the installation of this full node by telling Dojo to rely on an external bitcoind running on your host machine.

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

# Start the installation of your Dojo
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
