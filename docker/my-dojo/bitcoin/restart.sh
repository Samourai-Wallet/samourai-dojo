#!/bin/bash
set -e

echo "## Start bitcoind #############################"
bitcoind -datadir=/home/bitcoin/.bitcoin \
  -dbcache=$BITCOIND_DB_CACHE \
  -dnsseed=$BITCOIND_DNSSEED \
  -dns=$BITCOIND_DNS \
  -rpcuser=$BITCOIND_RPC_USER \
  -rpcpassword=$BITCOIND_RPC_PASSWORD \
  -maxconnections=$BITCOIND_MAX_CONNECTIONS \
  -maxmempool=$BITCOIND_MAX_MEMPOOL \
  -mempoolexpiry=$BITCOIND_MEMPOOL_EXPIRY \
  -minrelaytxfee=$BITCOIND_MIN_RELAY_TX_FEE
