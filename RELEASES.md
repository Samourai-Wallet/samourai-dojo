# Release Notes


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


#### Security ####

- [#5](https://github.com/Samourai-Wallet/samourai-dojo/pull/5) mydojo - install nodejs
- [#6](https://github.com/Samourai-Wallet/samourai-dojo/pull/6) Remove deprecated "new Buffer" in favor of "Buffer.from"


#### Documentation ####

- [#13](https://github.com/Samourai-Wallet/samourai-dojo/pull/13) Included Mac instructions
- [92097d8](https://github.com/Samourai-Wallet/samourai-dojo/commit/92097d8ec7f9488ce0318c452356994315f4be72) doc
- [de4c9b5](https://github.com/Samourai-Wallet/samourai-dojo/commit/de4c9b5e5078b673c7b199503d48e7ceca328285) doc - minor updates 
- [fead0bb](https://github.com/Samourai-Wallet/samourai-dojo/commit/fead0bb4b2b6174e637f5cb8c57edd9b55c3a1c7) doc - add link to MacOS install doc


#### Misc ####

- [a382e42](https://github.com/Samourai-Wallet/samourai-dojo/commit/a382e42469b884d2eda9fa6f5a3c8ce93a7cd39a) add sql scripts and config files to gitignore 


### Credits ###

- 05nelsonm
- clarkmoody
- kenshin-samourai
- LaurentMT
- michel-foucault
- pxsocs
