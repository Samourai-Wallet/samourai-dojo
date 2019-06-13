#!/bin/bash
set -e

echo "## Start bitcoind #############################"
bitcoind -datadir=/home/bitcoin/.bitcoin \
  -server=1 \
  -listen=1 \
  -bind=172.28.1.5 \
  -port=8333 \
  -proxy=172.28.1.4:9050 \
  -rpcport=28256 \
  -rpcallowip=::/0 \
  -rpcbind=172.28.1.5 \
  -txindex=1 \
  -disablewallet=1 \
  -zmqpubhashblock=tcp://0.0.0.0:9502 \
  -zmqpubrawtx=tcp://0.0.0.0:9501 \
  -dbcache=$BITCOIND_DB_CACHE \
  -dnsseed=$BITCOIND_DNSSEED \
  -dns=$BITCOIND_DNS \
  -rpcuser=$BITCOIND_RPC_USER \
  -rpcpassword=$BITCOIND_RPC_PASSWORD \
  -maxconnections=$BITCOIND_MAX_CONNECTIONS \
  -maxmempool=$BITCOIND_MAX_MEMPOOL \
  -mempoolexpiry=$BITCOIND_MEMPOOL_EXPIRY \
  -minrelaytxfee=$BITCOIND_MIN_RELAY_TX_FEE \
  -externalip=$(cat /var/lib/tor/hsv2bitcoind/hostname)