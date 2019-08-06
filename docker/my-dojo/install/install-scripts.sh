#!/bin/bash

if [ -f ./conf/docker-bitcoind.conf ]; then
  source ./conf/docker-bitcoind.conf
else
  source ./conf/docker-bitcoind.conf.tpl
fi

if [ -f ./conf/docker-common.conf ]; then
  source ./conf/docker-common.conf
else
  source ./conf/docker-common.conf.tpl
fi

# Confirm installation
get_confirmation() {
  while true; do
    echo "This operation is going to install Dojo v$DOJO_VERSION_TAG for $COMMON_BTC_NETWORK on your computer."
    read -p "Do you wish to continue? [y/n]" yn
    case $yn in
      [Yy]* ) return 0;;
      [Nn]* ) echo "Installation was cancelled."; return 1;;
      * ) echo "Please answer yes or no.";;
    esac
  done
}

# Initialize configuration files from templates
init_config_files() {
  # Initialize db scripts
  cp ../../db-scripts/1_db.sql.tpl ../../db-scripts/1_db.sql
  echo "Initialized 1_db.sql"

  if [ -f ../../db-scripts/2_update.sql ]; then
    rm ../../db-scripts/2_update.sql
    echo "Deleted 2_update.sql"
  fi

  # Initialize config files for MyDojo
  cp ./conf/docker-common.conf.tpl ./conf/docker-common.conf
  echo "Initialized docker-common.conf"

  cp ./conf/docker-bitcoind.conf.tpl ./conf/docker-bitcoind.conf
  echo "Initialized docker-bitcoind.conf"
  
  cp ./conf/docker-mysql.conf.tpl ./conf/docker-mysql.conf
  echo "Initialized docker-mysql.conf"
  
  cp ./conf/docker-node.conf.tpl ./conf/docker-node.conf
  echo "Initialized docker-node.conf"

  # Initialize config files for nginx and the maintenance tool 
  if [ "$COMMON_BTC_NETWORK" == "testnet" ]; then
    cp ./nginx/testnet.conf ./nginx/dojo.conf
    echo "Initialized dojo.conf (nginx)"
    cp ../../static/admin/conf/index-testnet.js ../../static/admin/conf/index.js
    echo "Initialized index.js (admin module)"
  else
    cp ./nginx/mainnet.conf ./nginx/dojo.conf
    echo "Initialized dojo.conf (nginx)"
    cp ../../static/admin/conf/index-mainnet.js ../../static/admin/conf/index.js
    echo "Initialized index.js (admin module)"
  fi
}
