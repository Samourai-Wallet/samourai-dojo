# Installation of Dojo with Docker and Docker Compose

MyDojo is a set of Docker containers providing a full Samourai backend composed of:
* a bitcoin full node accessible as an ephemeral Tor hidden service,
* a backend database,
* backend modules with an API accessible as a static Tor hidden service,
* a maintenance tool accessible through a Tor web browser,
* an optional block explorer ([BTC RPC Explorer](https://github.com/janoside/btc-rpc-explorer)) accessible as a static Tor hidden service.


## Table of Content ##
- [Architecture](#architecture)
- [Requirements](#requirements)
- [Configuration files](#config_files)
- [First-time install procedure](#install)
- [Upgrade procedure](#upgrade)
- [Dojo shell script](#shell_script)
- [Dojo maintenance tool](#maintenance_tool)
- [Block explorer](#explorer)
- [Pairing your wallet to your Dojo](#pairing)
- [Network connections](#network)


<a name="architecture"/>

## Architecture ##


                -------------------    -------------------      --------------------
               |  Samourai Wallet  |  |     Sentinel      |    | Bitcoin full nodes |
                -------------------    -------------------      --------------------
                        |_______________________|_______________________|
                                                |
                                          ------------

                                          Tor network

                                          ------------
                                                |
                  Host machine                  | (Tor hidden services)
                 ______________________________ | _____________________________
                |                               |                              |
                |                      -------------------           dmznet    |
                |                     |   Tor Container   |                    |
                |                      -------------------                     |
                |                             |        |                       |
                |             -------------------      |                       |
                |            |  Nginx Container  |     |                       |
                |             -------------------      |                       |
                |- - - - - - - - - - - | - - -|- - - - | - - - - - - - - - - - |
                |     --------------------    |     --------------------       |
                |    |  Nodejs Container  | ------ | Bitcoind Container |      |
                |     --------------------    |     --------------------       |
                |               |             |               |                |
                |     --------------------    |     --------------------       |
                |    |  MySQL Container   |   ---- |  BTC RPC Explorer  |      |
                |     --------------------          --------------------       |
                |                                                              |
                |                                                  dojonet     |
                |______________________________________________________________|


<a name="requirements"/>

## Requirements ##

* A dedicated computer (host machine) connected 24/7 to internet
* OS: Linux is recommended
* Disk: 500GB (minimal) / 1TB (recommended) - SSD is recommended
* RAM: 4GB (minimal)
* Docker and Docker Compose installed on the host machine (be sure to run a recent version supporting v3.2 of docker-compose files, i.e. Docker Engine v17.04.0+)
* Check that the clock of your computer is properly set (required for Tor)
* Tor Browser installed on the host machine (or on another machine if your host is a headless server)


<a name="config_files"/>

## Configuration files ##

Each new release of Dojo is packaged with 6 template files stored in the `<dojo_dir>/docker/my-dojo/conf` directory:
- docker-common.conf.tpl
- docker-bitcoin.conf.tpl
- docker-explorer.conf.tpl
- docker-mysql.conf.tpl
- docker-node.conf.tpl
- docker-tor.conf.tpl

These template files define default values for configuration options of your Dojo.

During the first-time installation (dojo.sh install) these templates are used to initialize the configuration files (files with .conf extension) that will be used by your Dojo.

During an upgrade (dojo.sh upgrade), the content of the template files is merged with the content of the configuration files, preserving the values that you may have modified in the configuration files. A backup of the configuration files is saved in the same directory (files with .save extension).

Most options provided in the configuration files can be later modified. New values will become active after a call to

```
./dojo.sh restart
```


<a name="install"/>

## First-time Setup ##

For MacOS, see this detailed [installation guide](./DOCKER_mac_setup.MD).

For Synology, see this detailed [installation guide](./DOCKER_synology_setup.md).

This procedure allows to install a new Dojo from scratch.

* Install [Docker and Docker Compose](https://docs.docker.com/compose/install/) on the host machine and check that your installation is working.

* Install [Tor Browser](https://www.torproject.org/projects/torbrowser.html.en) on the host machine.

* Download the most recent release of Dojo from [Github](https://github.com/Samourai-Wallet/samourai-dojo/archive/master.zip)

* Uncompress the archive on the host machine in a temporary directory of your choice (named `<tmp_dir>` in this doc)

* Create a directory for Dojo (named `<dojo_dir>` in this doc)

* Copy the content of the `<tmp_dir>/samourai-dojo-master` directory into the `<dojo_dir>` directory

* Customize the configuration of your Dojo

  * Go to the `<dojo_dir>/docker/my-dojo/conf` directory

  * Edit docker-bitcoind.conf.tpl and provide a new value for the following parameters:
      * `BITCOIND_RPC_USER` = login protecting the access to the RPC API of your full node,
      * `BITCOIND_RPC_PASSWORD` = password protecting the access to the RPC API of your full node.
      * If your machine has a lot of RAM, it's recommended that you increase the value of `BITCOIND_DB_CACHE` for a faster Initial Block Download.

  * Edit docker-mysql.conf.tpl and provide a new value for the following parameters:
      * `MYSQL_ROOT_PASSWORD` = password protecting the root account of MySQL,
      * `MYSQL_USER` = login of the account used to access the database of your Dojo,
      * `MYSQL_PASSWORD` = password of the account used to access the database of your Dojo.
    Note: These values can't be changed after the first installation.

  * Edit docker-node.conf.tpl and provide a new value for the following parameters:
      * `NODE_API_KEY` = API key which will be required from your Samourai Wallet / Sentinel for its interactions with the API of your Dojo,
      * `NODE_ADMIN_KEY` = API key which will be required from the maintenance tool for accessing a set of advanced features provided by the API of your Dojo,
      * `NODE_JWT_SECRET` = secret used by your Dojo for the initialization of a cryptographic key signing Json Web Tokens.
    These parameters will protect the access to your Dojo. Be sure to provide alphanumeric values with enough entropy.

  * If you want to activate the local block explorer, edit docker-explorer.conf.tpl:
      * set the value of `EXPLORER_INSTALL` to `on`,
      * set the value of `EXPLORER_KEY` with a password that will be required to access the block explorer.
    See this [section](#explorer) for more details.

* Dojo provides a few additional settings for advanced setups: 
  * static onion address for your full node,
  * bitcoind RPC API exposed to external apps,
  * use of an external full node,
  * use of Tor Bridges,
  * support of testnet.
  See this [doc](./DOCKER_advanced_setups.md) for more details.

* Open the docker quickstart terminal or a terminal console and go to the `<dojo_dir>/docker/my-dojo` directory. This directory contains a script named dojo.sh which will be your entrypoint for all operations related to the management of your Dojo.


* Launch the installation of your Dojo with

```
./dojo.sh install
```

Docker and Docker Compose are going to build the images and containers of your Dojo. This operation will take several minutes (download and setup of all required software components). After completion, your Dojo will be launched and will begin the initialization of the full node (Bitcoin Initial Block Download and syncing of the database). This step will take several hours/days according to the specs of your machine. Be patient. Use CTRL+C to stop the display of the full logs.


* Monitor the progress made for the initialization of the database with this command displaying the logs of the tracker

```
./dojo.sh logs tracker
```

Exit the logs with CTRL+C when the syncing of the database has completed.


* Retrieve the Tor onion addresses (v3) of the API and block explorer of your Dojo

```
./dojo.sh onion
```

* Restrict the access to your host machine as much as possible by configuring its firewall.


<a name="upgrade"/>

## Upgrade ##

This procedure allows to upgrade your Dojo with a new version.

* Stop your Dojo with

```
./dojo.sh stop
```

* Download the most recent release of Dojo from [Github](https://github.com/Samourai-Wallet/samourai-dojo/releases)

* Uncompress the archive on the host machine in a temporary directory of your choice (named `<tmp_dir>` in this doc)

* Copy the content of the `<tmp_dir>/samourai-dojo-1.x.y` directory into the `<dojo_dir>` directory (overwrite).

* Launch the upgrade of your Dojo with

```
./dojo.sh upgrade
```

Docker and Docker Compose are going to build new images and containers for your Dojo. After completion, the updated version of your Dojo will be launched automatically.

Note: The upgrade process will override all manual modifications of the files stored under the `<dojo_dir>` directory with an exception for the configuration files stored in the `<dojo_dir>/docker/my-dojo/conf` directory.


<a name="shell_script"/>

## Dojo shell script ##

dojo.sh is a multifeature tool allowing to interact with your Dojo.

```
Usage: ./dojo.sh command [module] [options]

Available commands:

  help                          Display the help message.

  bitcoin-cli                   Launch a bitcoin-cli console for interacting with bitcoind RPC API.

  clean                         Free disk space by deleting docker dangling images and images of previous versions.

  install                       Install your Dojo.

  logs [module] [options]       Display the logs of your Dojo. Use CTRL+C to stop the logs.

                                Available modules:
                                  dojo.sh logs                : display the logs of all containers
                                  dojo.sh logs bitcoind       : display the logs of bitcoind
                                  dojo.sh logs db             : display the logs of the MySQL database
                                  dojo.sh logs tor            : display the logs of tor
                                  dojo.sh logs api            : display the logs of the REST API (nodejs)
                                  dojo.sh logs tracker        : display the logs of the Tracker (nodejs)
                                  dojo.sh logs pushtx         : display the logs of the pushTx API (nodejs)
                                  dojo.sh logs pushtx-orchest : display the logs of the Orchestrator (nodejs)
                                  dojo.sh logs explorer       : display the logs of the Explorer

                                Available options (for api, tracker, pushtx, pushtx-orchest and explorer modules):
                                  -d [VALUE]                  : select the type of log to be displayed.
                                                                VALUE can be output (default) or error.
                                  -n [VALUE]                  : display the last VALUE lines

  onion                         Display the Tor onion addresses allowing to access the API, maintenance tool and block explorer of your Dojo.

  restart                       Restart your Dojo.

  start                         Start your Dojo.

  stop                          Stop your Dojo.

  uninstall                     Delete your Dojo. Be careful! This command will also remove all data.

  upgrade                       Upgrade your Dojo.

  version                       Display the version of dojo.
```


<a name="maintenance_tool"/>

## Dojo maintenance tool ##

A maintenance tool is accessible through your Tor browser at the url: <v3_onion_address>/admin

The maintenance tool requires that you allow javascript for the site.

Sign in with the value entered for `NODE_ADMIN_KEY`.


<a name="explorer"/>

## Block explorer ##

An optional block explorer ([BTC RPC Explorer](https://github.com/janoside/btc-rpc-explorer)) is accessible through your Tor browser.

You can retrieve the onion address of the block explorer with the command

```
./dojo.sh onion
```

Sign in with a login (can be any value) and the password set in your Dojo configuration (value entered for `EXPLORER_KEY`).

Notes:

* Current version doesn't support the display of detailed information for a Bitcoin address,

* Calls to the RPC API of your bitcoind through the interface of the block explorer are deactivated.


<a name="pairing"/>

## Pairing your wallet to your Dojo ##

Once the database has finished syncing, you can pair your Samourai Wallet with your Dojo in 2 steps:

1. Open the maintenance tool in a Tor browser (Tor v3 onion address) and sign in with your admin key.

2. Get your smartphone and launch the Samourai Wallet app. Scan the first QRCode displayed in the "Pairing" tab of the maintenance tool. 

If you experience any problems when pairing, try re-installing the app and select "Connect to existing Dojo" from the [⋮] menu.


## Pairing your wallet to your local block explorer (coming "soon") ##

You can pair your Samourai Wallet with your local block explorer in 2 steps:

1. Open the maintenance tool in a Tor browser (Tor v3 onion address) and sign in with your admin key.

2. Get your smartphone and launch the Samourai Wallet app. Scan the second QRCode displayed in the "Pairing" tab of the maintenance tool. 


<a name="network"/>

## Network connections ##

The API of your Dojo is accessed as a Tor hidden service (static onion address).

If OXT is selected as the default source for imports, OXT clearnet API is accessed through the Tor local proxy.

The maintenance tool is accessed as a Tor hidden service (static onion address).

The block explorer is accessed as a Tor hidden service (static onion address).

The Bitcoin node only allows incoming connections from Tor (ephemeral onion address).

The Bitcoin node attempts outgoing connections to both Tor and clearnet nodes (through the Tor local proxy).
