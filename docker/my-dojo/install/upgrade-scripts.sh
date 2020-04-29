#!/bin/bash

if [ -f ./conf/docker-common.conf ]; then
  source ./conf/docker-common.conf
else
  source ./conf/docker-common.conf.tpl
fi

if [ -f ./conf/docker-explorer.conf ]; then
  source ./conf/docker-explorer.conf
else
  source ./conf/docker-explorer.conf.tpl
fi

if [ -f ./conf/docker-whirlpool.conf ]; then
  source ./conf/docker-whirlpool.conf
else
  source ./conf/docker-whirlpool.conf.tpl
fi

source ./conf/docker-bitcoind.conf

# Confirm upgrade operation
get_confirmation() {
  while true; do
    echo "This operation is going to upgrade your Dojo to v$DOJO_VERSION_TAG for $COMMON_BTC_NETWORK."
    read -p "Do you wish to continue? [y/n]" yn
    case $yn in
      [Yy]* ) return 0;;
      [Nn]* ) echo "Upgrade was cancelled."; return 1;;
      * ) echo "Please answer yes or no.";;
    esac
  done
}

# Update configuration files from templates
update_config_files() {
  # Initialize db scripts
  if [ -f ../../db-scripts/1_db.sql ]; then
    rm ../../db-scripts/1_db.sql
    echo "Deleted 1_db.sql"
  fi

  cp ../../db-scripts/2_update.sql.tpl ../../db-scripts/2_update.sql
  echo "Initialized 2_update.sql"

  # Initialize config files for MyDojo
  update_config_file ./conf/docker-common.conf ./conf/docker-common.conf.tpl
  echo "Initialized docker-common.conf"

  update_config_file ./conf/docker-bitcoind.conf ./conf/docker-bitcoind.conf.tpl
  echo "Initialized docker-bitcoind.conf"

  update_config_file ./conf/docker-mysql.conf ./conf/docker-mysql.conf.tpl
  echo "Initialized docker-mysql.conf"

  update_config_file ./conf/docker-node.conf ./conf/docker-node.conf.tpl
  echo "Initialized docker-node.conf"

  update_config_file ./conf/docker-explorer.conf ./conf/docker-explorer.conf.tpl
  echo "Initialized docker-explorer.conf"

  update_config_file ./conf/docker-tor.conf ./conf/docker-tor.conf.tpl
  echo "Initialized docker-tor.conf"

  update_config_file ./conf/docker-indexer.conf ./conf/docker-indexer.conf.tpl
  echo "Initialized docker-indexer.conf"

  update_config_file ./conf/docker-whirlpool.conf ./conf/docker-whirlpool.conf.tpl
  echo "Initialized docker-whirlpool.conf"

  # Initialize config files for nginx and the maintenance tool 
  if [ "$EXPLORER_INSTALL" == "on" ]; then
    cp ./nginx/explorer.conf ./nginx/dojo-explorer.conf
  else
    cp /dev/null ./nginx/dojo-explorer.conf
  fi
  echo "Initialized dojo-explorer.conf (nginx)"

  if [ "$WHIRLPOOL_INSTALL" == "on" ]; then
    cp ./nginx/whirlpool.conf ./nginx/dojo-whirlpool.conf
  else
    cp /dev/null ./nginx/dojo-whirlpool.conf
  fi
  echo "Initialized dojo-whirlpool.conf (nginx)"

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

# Update a configuration file from template
update_config_file() {
  if [ -f $1 ]; then
    sed "s/^#.*//g;s/=.*//g;/^$/d" $1 > ./original.keys.raw
    grep -f ./original.keys.raw $1 > ./original.lines.raw

    cp -p $1 "$1.save"
    cp -p $2 $1

    while IFS='=' read -r key val ; do 
      if [[ $OSTYPE == darwin* ]]; then
        sed -i "" "s~$key=.*~$key=$val~g" "$1"
      else
        sed -i "s~$key=.*~$key=$val~g" "$1"
      fi
    done < ./original.lines.raw

    rm ./original.keys.raw
    rm ./original.lines.raw
  else
    cp $2 $1
  fi
}

# Update dojo database
update_dojo_db() {
  docker exec -d db /update-db.sh
}

# Clean-up
cleanup() {
  #################
  # Clean-up v1.3.0
  #################

  # Remove deprecated torrc file
  if [ -f ./tor/torrc ]; then
    rm ./tor/torrc
  fi

  #################
  # Clean-up v1.1.0
  #################

  # Remove deprecated bitcoin.conf file
  if [ -f ./bitcoin/bitcoin.conf ]; then
    rm ./bitcoin/bitcoin.conf
  fi
  
}
