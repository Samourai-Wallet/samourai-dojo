#!/bin/bash

# Confirm uninstallation
get_confirmation() {
  while true; do
    echo "This operation is going to uninstall Dojo from your computer."
    echo "Warning: This will delete from disk all the data stored by your Dojo (blockchain data, Dojo db, etc)."
    read -p "Do you wish to continue? [y/n]" yn
    case $yn in
      [Yy]* ) return 0;;
      [Nn]* ) echo "Uninstallation was cancelled."; return 1;;
      * ) echo "Please answer yes or no.";;
    esac
  done
}
