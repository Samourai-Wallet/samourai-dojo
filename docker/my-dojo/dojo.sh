#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null && pwd )"

if [ -f "$DIR/conf/docker-bitcoind.conf" ]; then
  source "$DIR/conf/docker-bitcoind.conf"
fi

if [ -f "$DIR/.env" ]; then
  source "$DIR/.env"
fi

  
# Start
start() {
  docker-compose up --remove-orphans -d
}

# Stop
stop() {
  if [ "$BITCOIND_EPHEMERAL_HS" = "on" ]; then
    docker exec -it tor rm -rf /var/lib/tor/hsv2bitcoind
  fi

  docker exec -it bitcoind  bitcoin-cli \
    -rpcconnect=bitcoind \
    --rpcport=28256 \
    --rpcuser="$BITCOIND_RPC_USER" \
    --rpcpassword="$BITCOIND_RPC_PASSWORD" \
    stop

  echo "Preparing shutdown of dojo. Please wait."
  sleep 15s

  docker-compose down
}

# Restart dojo
restart() {
  if [ "$BITCOIND_EPHEMERAL_HS" = "on" ]; then
    docker exec -it tor rm -rf /var/lib/tor/hsv2bitcoind
  fi

  docker exec -it bitcoind  bitcoin-cli \
    -rpcconnect=bitcoind \
    --rpcport=28256 \
    --rpcuser="$BITCOIND_RPC_USER" \
    --rpcpassword="$BITCOIND_RPC_PASSWORD" \
    stop

  echo "Preparing shutdown of dojo. Please wait."
  sleep 15s

  docker-compose down
  docker-compose up -d
}

# Install
install() {
  source "$DIR/install/install-scripts.sh"

  launchInstall=1

  if [ -z "$1" ]; then
    get_confirmation
    launchInstall=$?
  else
    launchInstall=0
  fi

  if [ $launchInstall -eq 0 ]; then
    init_config_files
    docker-compose up -d --remove-orphans
    docker-compose logs --tail=0 --follow
  fi
}

# Delete everything
uninstall() {
  docker-compose rm
  docker-compose down

  docker image rm samouraiwallet/dojo-db:"$DOJO_DB_VERSION_TAG"
  docker image rm samouraiwallet/dojo-bitcoind:"$DOJO_BITCOIND_VERSION_TAG"
  docker image rm samouraiwallet/dojo-nodejs:"$DOJO_NODEJS_VERSION_TAG"
  docker image rm samouraiwallet/dojo-nginx:"$DOJO_NGINX_VERSION_TAG"
  docker image rm samouraiwallet/dojo-tor:"$DOJO_TOR_VERSION_TAG"

  docker volume prune
}

# Upgrade
upgrade() {
  source "$DIR/install/upgrade-scripts.sh"

  launchUpgrade=1

  if [ -z "$1" ]; then
    get_confirmation
    launchUpgrade=$?
  else
    launchUpgrade=0
  fi

  if [ $launchUpgrade -eq 0 ]; then
    update_config_files
    cleanup
    docker-compose build --no-cache
    docker-compose up -d --remove-orphans
    update_dojo_db
    docker-compose logs --tail=0 --follow
  fi
}

# Display the onion address
onion() {
  V2_ADDR=$( docker exec -it tor cat /var/lib/tor/hsv2dojo/hostname )
  V3_ADDR=$( docker exec -it tor cat /var/lib/tor/hsv3dojo/hostname )
  V2_ADDR_BTCD=$( docker exec -it tor cat /var/lib/tor/hsv2bitcoind/hostname )

  echo "API hidden service address (v3) = $V3_ADDR"
  echo "API hidden service address (v2) = $V2_ADDR"
  echo "bitcoind hidden service address (v2) = $V2_ADDR_BTCD"
}

# Display the version of this dojo
version() {
  echo "Dojo v$DOJO_VERSION_TAG"
}

# Display logs
logs_node() {
  if [ $3 -eq 0 ]; then
    docker exec -ti nodejs tail -f /data/logs/$1-$2.log
  else
    docker exec -ti nodejs tail -n $3 /data/logs/$1-$2.log
  fi 
}

logs() {
  case $1 in
    db )
      docker-compose logs --tail=50 --follow db
      ;;
    bitcoind )
      docker exec -ti bitcoind tail -f /home/bitcoin/.bitcoin/debug.log
      ;;
    tor )
      docker-compose logs --tail=50 --follow tor
      ;;
    api | pushtx | pushtx-orchest | tracker )
      logs_node $1 $2 $3
      ;;
    * )
      docker-compose logs --tail=0 --follow
      ;;
  esac
}

# Display the help
help() {
  echo "Usage: dojo.sh command [module] [options]"
  echo "Interact with your dojo."
  echo " "
  echo "Available commands:"
  echo " "
  echo "  help                          Display this help message."
  echo " "
  echo "  bitcoin-cli                   Launch a bitcoin-cli console allowing to interact with your full node through its RPC API."
  echo " "
  echo "  install                       Install your dojo."
  echo " "
  echo "  logs [module] [options]       Display the logs of your dojo. Use CTRL+C to stop the logs."
  echo " "
  echo "                                Available modules:"
  echo "                                  dojo.sh logs                : display the logs of all the Docker containers"
  echo "                                  dojo.sh logs bitcoind       : display the logs of bitcoind"
  echo "                                  dojo.sh logs db             : display the logs of the MySQL database"
  echo "                                  dojo.sh logs tor            : display the logs of tor"
  echo "                                  dojo.sh logs api            : display the logs of the REST API (nodejs)"
  echo "                                  dojo.sh logs tracker        : display the logs of the Tracker (nodejs)"
  echo "                                  dojo.sh logs pushtx         : display the logs of the pushTx API (nodejs)"
  echo "                                  dojo.sh logs pushtx-orchest : display the logs of the pushTx Orchestrator (nodejs)"
  echo " "
  echo "                                Available options (only available for api, tracker, pushtx and pushtx-orchest modules):"
  echo "                                  -d [VALUE]                  : select the type of log to be displayed."
  echo "                                                                VALUE can be output (default) or error."
  echo "                                  -n [VALUE]                  : display the last VALUE lines"
  echo " "
  echo "  onion                         Display the Tor onion address allowing your wallet to access your dojo."
  echo " "
  echo "  restart                       Restart your dojo."
  echo " "
  echo "  start                         Start your dojo."
  echo " "
  echo "  stop                          Stop your dojo."
  echo " "
  echo "  uninstall                     Delete your dojo. Be careful! This command will also remove all data."
  echo " "
  echo "  upgrade                       Upgrade your dojo."
  echo " "
  echo "  version                       Display the version of dojo"
}


#
# Parse options to the dojo command
#
while getopts ":h" opt; do
  case ${opt} in
    h )
      help
      exit 0
      ;;
   \? )
     echo "Invalid Option: -$OPTARG" 1>&2
     exit 1
     ;;
  esac
done

shift $((OPTIND -1))


subcommand=$1; shift

case "$subcommand" in
  bitcoin-cli )
    docker exec -it bitcoind bitcoin-cli \
      -rpcconnect=bitcoind \
      --rpcport=28256 \
      --rpcuser="$BITCOIND_RPC_USER" \
      --rpcpassword="$BITCOIND_RPC_PASSWORD" \
      $1 $2 $3 $4 $5
    ;;
  help )
    help
    ;;
  install )
    install $1
    ;;
  logs )
    module=$1; shift
    display="output"
    numlines=0

    # Process package options
    while getopts ":d:n:" opt; do
      case ${opt} in
        d )
          display=$OPTARG
          ;;
        n )
          numlines=$OPTARG
          ;;
        \? )
          echo "Invalid Option: -$OPTARG" 1>&2
          exit 1
          ;;
        : )
          echo "Invalid Option: -$OPTARG requires an argument" 1>&2
          exit 1
          ;;
      esac
    done
    shift $((OPTIND -1))

    logs $module $display $numlines
    ;;
  onion )
    onion
    ;;
  restart )
    restart
    ;;
  start )
    start
    ;;
  stop )
    stop
    ;;
  uninstall )
    uninstall
    ;;
  upgrade )
    upgrade $1
    ;;
  version )
    version
    ;;
esac