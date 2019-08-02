#!/bin/bash

# Confirm installation
get_confirmation() {
  while true; do
    echo "This operation is going to install Dojo v$DOJO_VERSION_TAG on your computer."
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
  cp ../../db-scripts/1_db.sql.tpl ../../db-scripts/1_db.sql
  echo "Initialized 1_db.sql"

  if [ -f ../../db-scripts/2_update.sql ]; then
    rm ../../db-scripts/2_update.sql
    echo "Deleted 2_update.sql"
  fi

  cp ./conf/docker-bitcoind.conf.tpl ./conf/docker-bitcoind.conf
  echo "Initialized docker-bitcoind.conf"
  
  cp ./conf/docker-mysql.conf.tpl ./conf/docker-mysql.conf
  echo "Initialized docker-mysql.conf"
  
  cp ./conf/docker-node.conf.tpl ./conf/docker-node.conf
  echo "Initialized docker-node.conf"
}
