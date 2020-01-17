#!/bin/bash
set -e

echo "## Start bitcoind #############################"

bitcoind_options=(
  -bind=172.28.1.5
  -datadir=/home/bitcoin/.bitcoin
  -dbcache=$BITCOIND_DB_CACHE
  -disablewallet=1
  -dns=$BITCOIND_DNS
  -dnsseed=$BITCOIND_DNSSEED
  -externalip=$(cat /var/lib/tor/hsv2bitcoind/hostname)
  -listen=1
  -maxconnections=$BITCOIND_MAX_CONNECTIONS
  -maxmempool=$BITCOIND_MAX_MEMPOOL
  -mempoolexpiry=$BITCOIND_MEMPOOL_EXPIRY
  -minrelaytxfee=$BITCOIND_MIN_RELAY_TX_FEE
  -port=8333
  -proxy=172.28.1.4:9050
  -rpcallowip=::/0
  -rpcbind=172.28.1.5
  -rpcpassword=$BITCOIND_RPC_PASSWORD
  -rpcport=28256
  -rpcthreads=$BITCOIND_RPC_THREADS
  -rpcuser=$BITCOIND_RPC_USER
  -server=1
  -txindex=1
  -zmqpubhashblock=tcp://0.0.0.0:9502
  -zmqpubrawtx=tcp://0.0.0.0:9501
)

if [ "$BITCOIND_RPC_EXTERNAL" == "on" ]; then
  bitcoind_options+=(-zmqpubhashtx=tcp://0.0.0.0:9500)
  bitcoind_options+=(-zmqpubrawblock=tcp://0.0.0.0:9503)
fi

if [ "$COMMON_BTC_NETWORK" == "testnet" ]; then
  bitcoind_options+=(-testnet)
fi

bitcoind "${bitcoind_options[@]}"

# Keep the container up
while true
do
  sleep 1
done
