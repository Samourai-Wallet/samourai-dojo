# Installation of Dojo with Docker and Docker Compose

MyDojo is a set of Docker containers providing a full Samourai backend composed of:
* a bitcoin full node accessible as an ephemeral Tor hidden service,
* the backend database,
* the backend modules with an API accessible as a static Tor hidden service,
* a maintenance tool accessible through a Tor web browser.


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
                  Host machine                  | (Tor - port 80)
                 ______________________________ | _____________________________
                |                               |                              |
                |                      -------------------                     |
                |                     |   Tor Container   |                    |
                |                      -------------------                     |
                |                             |        |                       |
                |             -------------------      |                       |
                |            |  Nginx Container  |     |             dmznet    |
                |             -------------------      |                       |
                |- - - - - - - - - - - | - - - - - - - | - - - - - - - - - - - |
                |     --------------------          --------------------       |
                |    |  Nodejs Container  | ------ | Bitcoind Container |      |
                |     --------------------          --------------------       |
                |               |                                              |
                |    -------------------                                       |
                |   |  MySQL Container  |                           dojonet    |
                |    -------------------                                       |
                |______________________________________________________________|



## Requirements ##

* A dedicated computer (host machine) connected 24/7 to internet
* OS: Linux is recommended
* Disk: 500GB (minimal) / 1TB (recommended) - SSD is recommended
* RAM: 4GB (minimal)
* Docker and Docker Compose installed on the host machine (be sure to run a recent version supporting v3.2 of docker-compose files, i.e. Docker Engine v17.04.0+)
* Check that the clock of your computer is properly set (required for Tor)
* Tor Browser installed on the host machine (or on another machine if your host is a headless server)


## First-time Setup ##

This procedure allows to install a new Dojo from scratch.

* Install [Docker and Docker Compose](https://docs.docker.com/compose/install/) on the host machine and check that your installation is working.

* Install [Tor Browser](https://www.torproject.org/projects/torbrowser.html.en) on the host machine.

* Download the most recent version of Dojo from [Github](https://github.com/Samourai-Wallet/samourai-dojo/archive/master.zip)

* Uncompress the archive on the host machine in a temporary directory of your choice (named /tmp_dir in this doc)

* Create a directory for Dojo (named /dojo_dir in this doc)

* Copy the content of the "/tmp_dir/samourai-dojo-master" directory into the "/dojo_dir" directory

* Customize the configuration of your Dojo

  * Go to the "/dojo_dir/docker/my_dojo/conf" directory

  * Edit docker-bitcoin.conf and provide a new value for the following parameters:
      * BITCOIND_RPC_USER = login protecting the access to the RPC API of your full node,
      * BITCOIND_RPC_PASSWORD = password protecting the access to the RPC API of your full node.
      * If your machine has a lot of RAM, it's recommended that you increase the value of BITCOIND_DB_CACHE for a faster Initial Block Download.

  * Edit docker-mysql.conf and provide a new value for the following parameters:
      * MYSQL_ROOT_PASSWORD = password protecting the root account of MySQL,
      * MYSQL_USER = login of the account used to access the database of your Dojo,
      * MYSQL_PASSWORD = password of the account used to access the database of your Dojo.

  * Edit docker-node.conf and provide a new value for the following parameters:
      * NODE_API_KEY = API key which will be required from your Samourai Wallet / Sentinel for its interactions with the API of your Dojo,
      * NODE_ADMIN_KEY = API key which will be required from the maintenance tool for accessing a set of advanced features provided by the API of your Dojo,
      * NODE_JWT_SECRET = secret used by your Dojo for the initialization of a cryptographic key signing Json Web Tokens.
    These parameters will protect the access to your Dojo. Be sure to provide alphanumeric values with enough entropy.

* Open the docker quickstart terminal or a terminal console and go to the "/dojo_dir/docker/my_dojo" directory. This directory contains a script named dojo.sh which will be your entrypoint for all operations related to the management of your Dojo.


* Launch the installation of your Dojo with

```
./dojo.sh install
```

Docker and Docker Compose are going to build the images and containers of your Dojo. This operation will take a few minutes (download and setup of all required software components). After completion, your Dojo will be launched and will begin the initialization of the full node (Bitcoin Initial Block Download and syncing of the database). This step will take several hours/days according to the specs of your machine. Be patient. Use CTRL+C to stop the display of the full logs.


* Monitor the progress made for the initialization of the database with this command displaying the logs of the tracker

```
./dojo.sh logs tracker
```

Exit the logs with CTRL+C when the syncing of the database has completed.


* Retrieve the Tor onion addresses (v2 and v3) of the API of your Dojo

```
./dojo.sh onion
```

* Restrict the access to your host machine as much as possible by configuring its firewall.


## Upgrade ##

This procedure allows to upgrade your Dojo with a new version.

* Stop your Dojo with

```
./dojo.sh stop
```

* Download the most recent release of Dojo from [Github](https://github.com/Samourai-Wallet/samourai-dojo/releases)

* Uncompress the archive on the host machine in a temporary directory of your choice (named /tmp_dir in this doc)

* Copy the content of the "/tmp_dir/samourai-dojo-1.x.y" directory into the "/dojo_dir" directory (overwrite).

* Launch the upgrade of your Dojo with

```
./dojo.sh upgrade
```

Docker and Docker Compose are going to build new images and containers for your Dojo. After completion, the updated version of your Dojo will be launched automatically.


## Dojo shell script ##

dojo.sh is a multifeature tool allowing to interact with your Dojo.

```
Usage: ./dojo.sh command [module] [options]

Available commands:

  help                          Display the help message.

  bitcoin-cli                   Launch a bitcoin-cli console for interacting with bitcoind RPC API.

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

                                Available options (for api, tracker, pushtx and pushtx-orchest modules):
                                  -d [VALUE]                  : select the type of log to be displayed.
                                                                VALUE can be output (default) or error.
                                  -n [VALUE]                  : display the last VALUE lines

  onion                         Display the Tor onion address allowing your wallet to access your Dojo.

  restart                       Restart your Dojo.

  start                         Start your Dojo.

  stop                          Stop your Dojo.

  uninstall                     Delete your Dojo. Be careful! This command will also remove all data.

```


## Dojo maintenance tool ##

A maintenance tool is accessible through your Tor browser at the url: <v2_onion_address>/admin

The maintenance tool requires that you allow javascript for the site.

Sign in with the value entered for NODE_ADMIN_KEY.



## Pairing ##

Once the database has finished syncing, you can pair your Samourai Wallet with your Dojo in 2 steps:

* Open the maintenance tool in a Tor browser and sign in with your admin key.

* Get your smartphone and launch the Samourai Wallet app. Scan the QRCode displayed in the "Pairing" tab of the maintenance tool.



## Network connections ##

The API of your Dojo is accessed as a Tor hidden service (static onion address).

If OXT is selected as the default source for imports, OXT clearnet API is accessed through the Tor local proxy.

The maintenance tool is accessed as a Tor hidden service (static onion address).

The Bitcoin node only allows incoming connections from Tor (dynamic onion address).

The Bitcoin node attempts outgoing connections to both Tor and clearrnet nodes (through the Tor local proxy).
