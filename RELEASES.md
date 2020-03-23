# Release Notes


## Releases ##
- [v1.5.0](#1_5_0)
- [v1.4.1](#1_4_1)
- [v1.4.0](#1_4_0)
- [v1.3.0](#1_3_0)
- [v1.2.0](#1_2_0)
- [v1.1.0](#1_1_0)


<a name="1_5_0"/>

## Samourai Dojo v1.5.0 ##


### Notable changes ###


#### Local indexer of Bitcoin addresses ####

Previous versions of Dojo provided the choice between 2 data sources for import and rescan operations, the local bitcoind and OXT. This version introduces a new optional Docker container running a local indexer ([addrindexrs](https://github.com/Samourai-Wallet/addrindexrs)) that can be used as an alternative to the 2 existing options.

The local indexer provides private, fast and exhaustive imports and rescans.

Warning: The local indexer requires around 120GB of additionnal disk space during its installation, and around 60GB after the compaction of its database.

See this [documentation](https://github.com/Samourai-Wallet/samourai-dojo/blob/master/doc/DOCKER_advanced_setups.md#local_indexer) for the detailed procedure allowing to configure and install the indexer.


#### Local Electrum server used as data source for imports/rescans ####

This version of Dojo introduces the support of a local external Electrum server (ElectrumX or Electrs) as the data source of imports and rescans. This option provides the same benefits as the new local indexer to users running an Electrum server.

See this [documentation](https://github.com/Samourai-Wallet/samourai-dojo/blob/master/doc/DOCKER_advanced_setups.md#local_electrum) for the detailed procedure allowing to configure your Electrum server as the data source of imports and rescans.


#### Improved performances of Dojo upgrades ####

By default, the upgrade process will try to reuse the image layers cached by Docker in order to reduce the duration of upgrades.

A new option for the upgrade command allows to force a complete rebuild of all the containers (equivalemt to the former default behavior of the upgrade process).

```
> ./dojo.sh upgrade --nocache
```


#### Additional controls before installation ####

A few controls and confirmations were added to the installation process in order to avoid multiple calls leading to problems with database credentials. Additionally, a full uninstallation is forced before a new installation is allowed.


#### Upgrade of bitcoind to v0.19.1 ####

Upgrade to Bitcoin Core v0.19.1


### Change log ###


#### MyDojo ####

- [#118](https://github.com/Samourai-Wallet/samourai-dojo/pull/118) add support of local indexers as the data source of imports and rescans
- [#119](https://github.com/Samourai-Wallet/samourai-dojo/pull/119) improve performances of dojo upgrades
- [#120](https://github.com/Samourai-Wallet/samourai-dojo/pull/120) upgrade btc-rpc-explorer to v1.1.8 
- [#121](https://github.com/Samourai-Wallet/samourai-dojo/pull/121) add controls and confirmations before reinstalls and uninstalls
- [#124](https://github.com/Samourai-Wallet/samourai-dojo/pull/124) upgrade bitcoin v0.19.1
- [#125](https://github.com/Samourai-Wallet/samourai-dojo/pull/125) improve support of --auto option in dojo.sh
- [#127](https://github.com/Samourai-Wallet/samourai-dojo/pull/127) upgrade btc-rpc-explorer to v1.1.9
- [#129](https://github.com/Samourai-Wallet/samourai-dojo/pull/129) fix mydojo buster


#### Bug fixes ####

- [#115](https://github.com/Samourai-Wallet/samourai-dojo/pull/115) backport of fix implemented in 1.4.1
- [#131](https://github.com/Samourai-Wallet/samourai-dojo/pull/131) fix issue 130


#### Security ####

- [#126](https://github.com/Samourai-Wallet/samourai-dojo/pull/126) upgrade nodejs packages


#### Credits ###

- BTCxZelko
- Crazyk031
- GuerraMoneta
- kenshin-samourai
- LaurentMT


<a name="1_4_1"/>

## Samourai Dojo v1.4.1 ##


### Notable changes ###


#### Prevents a hang of Dojo on shutdown ####

Since v1.4.0, some users that Dojo is hanging during its shutdown. This release provides a fix for the users affected by this problem.


#### Prevents automatic restarts of bitcoind container ####

This release removes automatic restarts of the bitcoind container when bitcoind has exited with an error.


### Change log ###

#### Bug fixes ####

- [0ff045d](https://github.com/Samourai-Wallet/samourai-dojo/commit/0ff045d1495807902e9fd7dcfbd2fdb4dc21c608) keep bitcoind container up if bitcoind exits with an error
- [bd43526](https://github.com/Samourai-Wallet/samourai-dojo/commit/bd43526bca1f36a1ada07ad799c87b11a897e873) fix for dojo hanging on shutdown 
- [3ee85db](https://github.com/Samourai-Wallet/samourai-dojo/commit/3ee85db3bf69f4312204e502c98d414a4180dc53) force kill of docker exec used for testing bitcoind shutdown if command hangs more than 12s


#### Misc. ####

- [21925f7](https://github.com/Samourai-Wallet/samourai-dojo/commit/21925f7c321974ef7eb55c1ad897a5e02ef52bee) bump versions of dojo and bitcoind container 
- [08342e3](https://github.com/Samourai-Wallet/samourai-dojo/commit/08342e3995c473b589bb2a517e5bc30cf5f7dc9a) add trace in stop() function of dojo.sh


### Credits ###

- BTCxZelko
- Crazyk031
- GuerraMoneta
- kenshin-samourai
- LaurentMT
- mj


<a name="1_4_0"/>

## Samourai Dojo v1.4.0 ##


### Notable changes ###


#### Local block explorer ####

This release adds a new docker container hosting a local block explorer ([BTC RPC Explorer](https://github.com/janoside/btc-rpc-explorer)).

Access to the block explorer is secured by a password defined in /docker/my-dojo/conf/docker-explorer.conf (see `EXPLORER_KEY` configuration parameter).

*Upgrade procedure*

```
# Stop your Dojo

# Download the Dojo archive for this release

# Override the content of your <dojo_dir> with the content of the Dojo archive

# Edit <dojo_dir>/docker/my-dojo/conf/docker-explorer.conf.tpl and set the value of `EXPLORER_KEY` with a custom password.

# Launch the upgrade of your Dojo with: dojo.sh upgrade
```

This local block explorer is available as a Tor hidden service. Its static onion address can be retrieved with the command

```
dojo.sh onion
```


#### Autostart of Dojo ####

Starting with this release, Dojo is automatically launched when the docker daemon starts.


### Change log ###

#### MyDojo ####

- [#101](https://github.com/Samourai-Wallet/samourai-dojo/pull/101) add --auto and --nolog options to install and upgrade commands
- [#102](https://github.com/Samourai-Wallet/samourai-dojo/pull/102) improve performances of transactions imports
- [#107](https://github.com/Samourai-Wallet/samourai-dojo/pull/107) add optional block explorer
- [#108](https://github.com/Samourai-Wallet/samourai-dojo/pull/108) switch restart policies of containers to always
- [#109](https://github.com/Samourai-Wallet/samourai-dojo/pull/109) use port 80 of keyservers
- [#110](https://github.com/Samourai-Wallet/samourai-dojo/pull/110) replace keyserver
- [#111](https://github.com/Samourai-Wallet/samourai-dojo/pull/111) enable autostart of dojo
- [#113](https://github.com/Samourai-Wallet/samourai-dojo/pull/113) check if dojo is running (start and stop commands)


#### Bug fixes ####

- [#100](https://github.com/Samourai-Wallet/samourai-dojo/pull/100) fix issue caused by sed -i on osx


#### Documentation ####

- [#99](https://github.com/Samourai-Wallet/samourai-dojo/pull/99) doc: installation of dojo on synology
- [b12d24d](https://github.com/Samourai-Wallet/samourai-dojo/commit/b12d24d088a95023a8e1c9e8a1b1c4b40491d4a7) update readme


### Credits ###

- anwfr
- jochemin
- kenshin-samourai
- LaurentMT


<a name="1_3_0"/>

## Samourai Dojo v1.3.0 ##


### Notable changes ###


#### Update of configuration parameters ####

Configuration parameter ```NODE_IMPORT_FROM_BITCOIND``` is replaced by ```NODE_ACTIVE_INDEXER```.

The supported values for the new parameter are:
- ```local_bitcoind``` (equivalent to former ```NODE_IMPORT_FROM_BITCOIND=active```)
- ```third_party_explorer``` (equivalent to former ```NODE_IMPORT_FROM_BITCOIND=inactive```)

**Upgrade of Dojo to v1.3.0 automatically sets the parameter to the default value** ```local_bitcoind```.


#### Installation of Tor from source code archives ####

Previous versions of Dojo used the git repository operated by the Tor Project during the build of the Tor container. Starting with this version, Dojo will download an archive of the source code.

Users living in countries blocking the access to resources provided by the Tor Project can easily switch to a mirror site by editing this [line](https://github.com/Samourai-Wallet/samourai-dojo/blob/develop/docker/my-dojo/tor/Dockerfile#L4) before installing or upgrading their Dojo.

The default source used by Dojo is the archive provided by the [Tor Project](https://archive.torproject.org/tor-package-archive).


#### Add support of Tor bridges ####

The Tor container now supports the configuration of Tor bridges. For some users, it may be appropriate to configure Tor bridges in order to circumvent a local censorship of the Tor network. See [this section](https://github.com/Samourai-Wallet/samourai-dojo/blob/develop/doc/DOCKER_advanced_setups.md#tor_bridges) of the documentation for the activation of Tor bridges on your Dojo.


#### Add Blocks rescan feature to the maintenance tool ####

This version introduces a new "Blocks Rescan" feature accessible from the Maintenance Tool.

"Blocks Rescan" allows to rescan a range of blocks for all the addresses currently tracked by your Dojo (loose addresses or addresses derived for your xpubs). This feature comes in handy when the block confirming a missing transaction is known by the user.


#### Add Esplora as the new external data source for testnet ####

The testnet version of Dojo now relies on the Esplora API as its external data source for imports and rescans. 

Previously used API (BTC.COM and Insight) have been removed.

Default URL used for the Esplora API is https://blockstream.info/testnet. A local Esplora instance can be used by editing this [line](https://github.com/Samourai-Wallet/samourai-dojo/blob/develop/docker/my-dojo/.env#L44).


#### Remove support of HTTPS by NodeJS ####

Support of HTTPS by the NodeJS server has been removed.


#### Upgrade of bitcoind to v0.19.0.1 ####

Upgrade to Bitcoin Core v0.19.0.1.


#### Update bitcoinjs to v5.1.4 ####

The bitcoinjs library has been updated to v5.1.4.


### Change log ###

#### MyDojo ####

- [#71](https://github.com/Samourai-Wallet/samourai-dojo/pull/71) update to use latest bitcoinjs
- [#74](https://github.com/Samourai-Wallet/samourai-dojo/pull/74) adding bridge support to tor-container
- [#80](https://github.com/Samourai-Wallet/samourai-dojo/pull/80) add support of blocks rescans in the maintenance tool
- [#83](https://github.com/Samourai-Wallet/samourai-dojo/pull/83) removed unused support of https by nodejs apps
- [#84](https://github.com/Samourai-Wallet/samourai-dojo/pull/84) install tor from source code archive
- [#85](https://github.com/Samourai-Wallet/samourai-dojo/pull/85) add esplora as a data source for testnet imports and rescans
- [#90](https://github.com/Samourai-Wallet/samourai-dojo/pull/90) update the remote importer
- [#91](https://github.com/Samourai-Wallet/samourai-dojo/pull/91) improve the tracking of loose addresses
- [#93](https://github.com/Samourai-Wallet/samourai-dojo/pull/93) increase timeouts defined in docker-compose files (for raspi hardwares)
- [#93](https://github.com/Samourai-Wallet/samourai-dojo/pull/93) upgrade bitcoind to bitcoin core 0.19.0.1


#### Bug fixes ####

- [#73](https://github.com/Samourai-Wallet/samourai-dojo/pull/73) remove unhandled promise error
- [#79](https://github.com/Samourai-Wallet/samourai-dojo/pull/79) retry to send sql requests on detection of a lock
- [#94](https://github.com/Samourai-Wallet/samourai-dojo/pull/94) improve the transaction cache implemented for bitcoind rpc client


#### Documentation ####

- [b5dd967](https://github.com/Samourai-Wallet/samourai-dojo/commit/b5dd9673c159b469fb19f43c33a0c0dd21b2fe5a) update api doc (see #75)
- [16926a8](https://github.com/Samourai-Wallet/samourai-dojo/commit/16926a86fb637fb06510d1418474f62d3570cfd3) update docker doc


#### Misc ####

- [#76](https://github.com/Samourai-Wallet/samourai-dojo/pull/76) pin versions in package-lock.json


### Credits ###

- junderw
- kenshin-samourai
- LaurentMT
- nickodev


<a name="1_2_0"/>

## Samourai Dojo v1.2.0 ##


### Notable changes ###


#### Support of testnet ####

Support of testnet has been added to MyDojo.

See this [doc](./doc/https://github.com/Samourai-Wallet/samourai-dojo/blob/develop/doc/DOCKER_advanced_setups.md#support-of-testnet) for more details.


#### Upgrade of bitcoind to v0.18.1 ####

Upgrade to Bitcoin Core v0.18.1.


#### Fix for issue #59 ####

Fix a bug introduced by Dojo v1.1 when bitcoind is exposed to external apps.

See [issue #59](https://github.com/Samourai-Wallet/samourai-dojo/issues/59).


### Change log ###

#### MyDojo ####

- [#46](https://github.com/Samourai-Wallet/samourai-dojo/pull/46) add testnet support to my-dojo
- [#49](https://github.com/Samourai-Wallet/samourai-dojo/pull/49) add support of auth token passed through the authorization http header
- [#54](https://github.com/Samourai-Wallet/samourai-dojo/pull/54) remove /dump/heap endpoint and dependency on heapdump package
- [#55](https://github.com/Samourai-Wallet/samourai-dojo/pull/55) upgrade bitcoind to bitcoin core 0.18.1 
- [#60](https://github.com/Samourai-Wallet/samourai-dojo/pull/55) fix for #59 (dojo with exposed bitcoind ports doesn't start)


#### Documentation ####

- [#50](https://github.com/Samourai-Wallet/samourai-dojo/pull/50) consolidated Mac Instructions
- [#58](https://github.com/Samourai-Wallet/samourai-dojo/pull/58) add instructions to resolve pairing failure


### Credits ###

- dergigi
- kenshin-samourai
- LaurentMT
- Mark Engelberg
- PuraVida
- pxsocs


<a name="1_1_0"/>

## Samourai Dojo v1.1.0 ##


### Notable changes ###


#### Upgrade mechanism ####

An upgrade mechanism for MyDojo has been added.

See this [doc](./doc/DOCKER_setup.md#upgrade) for more details.


#### Optional support of an external bitcoin full node ####

Optional support of an existing Bitcoin full node running outside of Docker has been added.

This setup can be configured thanks to new options defined in ./docker/my-dojo/conf/docker-bitcoind.conf. When this option is activated, the install command skips the installation of bitcoind in Docker.

Note: The Bitcoin full node installed by MyDojo is configured for taking care of your privacy at a network level. You may lose the benefits provided by the default setup if your external full node isn't properly configured. Use at your own risk.

See this [doc](./doc/DOCKER_advanced_setups.md#external_bitcoind) for more details.


#### Optional support of external apps ####

New options defined in ./docker/my-dojo/conf/docker-bitcoind.conf allow to expose the RPC API and ZMQ notifications provided by the full node of MyDojo to applications runnnig outside of Docker.

Note: Exposing the full node of MyDojo to external applications may damage your privacy. Use at your own risk.

See this [doc](./doc/DOCKER_advanced_setups.md#exposed_rpc_zmq) for more details.


#### Optional support of a static onion address for the full node ####

A new option defined in ./docker/my-dojo/conf/docker-bitcoind.conf allows to keep a static onion address for your full node.

By default, MyDojo generates a new onion address at each startup. We recommend to keep this default setup for better privacy.

See this [doc](./doc/DOCKER_advanced_setups.md#static_onion) for more details.


#### Clean-up of Docker images ####

A new "clean" command has been added to Dojo shell script for deleting old Docker images of MyDojo.

This command allows to free disk space on the Docker host.


#### Documentation ####

Added a new [doc](./doc/DOCKER_advanced_setups.md) for advanced setups.

Added a new [doc](./doc/DOCKER_mac_setup.MD) for MacOS users.


### Change log ###

#### MyDojo ####

- [#1](https://github.com/Samourai-Wallet/samourai-dojo/pull/1) my-dojo upgrade mechanism
- [#7](https://github.com/Samourai-Wallet/samourai-dojo/pull/7) support of inbound connections through Tor
- [#8](https://github.com/Samourai-Wallet/samourai-dojo/pull/8) add config option exposing the rpc api and zmq notifications to external apps
- [#10](https://github.com/Samourai-Wallet/samourai-dojo/pull/10) add an option allowing to run dojo on top of an external bitcoind
- [#11](https://github.com/Samourai-Wallet/samourai-dojo/pull/11) clean-up
- [#12](https://github.com/Samourai-Wallet/samourai-dojo/pull/12) extend support of external apps
- [#15](https://github.com/Samourai-Wallet/samourai-dojo/pull/15) fix issue introduced by #10
- [#19](https://github.com/Samourai-Wallet/samourai-dojo/pull/19) fix bitcoind port in torrc
- [#20](https://github.com/Samourai-Wallet/samourai-dojo/pull/20) increase nginx timeout
- [#25](https://github.com/Samourai-Wallet/samourai-dojo/pull/25) force the tracker to derive next indices if a hole is detected
- [#27](https://github.com/Samourai-Wallet/samourai-dojo/pull/27) rework external loop of Orchestrator
- [#28](https://github.com/Samourai-Wallet/samourai-dojo/pull/28) rework RemoteImporter
- [#32](https://github.com/Samourai-Wallet/samourai-dojo/pull/32) change the conditions switching the startup mode of the tracker
- [#33](https://github.com/Samourai-Wallet/samourai-dojo/pull/33) check authentication with admin key 
- [#37](https://github.com/Samourai-Wallet/samourai-dojo/pull/37) automatic redirect of onion address to maintenance tool
- [#38](https://github.com/Samourai-Wallet/samourai-dojo/pull/38) dojo shutdown - replace sleep with static delay by docker wait


#### Security ####

- [#5](https://github.com/Samourai-Wallet/samourai-dojo/pull/5) mydojo - install nodejs
- [#6](https://github.com/Samourai-Wallet/samourai-dojo/pull/6) remove deprecated "new Buffer" in favor of "Buffer.from"
- [#41](https://github.com/Samourai-Wallet/samourai-dojo/pull/41) update nodejs packages


#### Documentation ####

- [#13](https://github.com/Samourai-Wallet/samourai-dojo/pull/13) included Mac instructions
- [92097d8](https://github.com/Samourai-Wallet/samourai-dojo/commit/92097d8ec7f9488ce0318c452356994315f4be72) doc
- [de4c9b5](https://github.com/Samourai-Wallet/samourai-dojo/commit/de4c9b5e5078b673c7b199503d48e7ceca328285) doc - minor updates 
- [fead0bb](https://github.com/Samourai-Wallet/samourai-dojo/commit/fead0bb4b2b6174e637f5cb8c57edd9b55c3a1c7) doc - add link to MacOS install doc
- [#42](https://github.com/Samourai-Wallet/samourai-dojo/pull/42) fix few typos, add backticks for config values
- [#43](https://github.com/Samourai-Wallet/samourai-dojo/pull/43) add missing `d` in `docker-bitcoind.conf`


#### Misc ####

- [a382e42](https://github.com/Samourai-Wallet/samourai-dojo/commit/a382e42469b884d2eda9fa6f5a3c8ce93a7cd39a) add sql scripts and config files to gitignore 


### Credits ###

- 05nelsonm
- clarkmoody
- dergigi
- hkjn
- kenshin-samourai
- LaurentMT
- michel-foucault
- pxsocs
- Technifocal
