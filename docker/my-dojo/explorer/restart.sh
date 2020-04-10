#!/bin/bash

cd /home/node/app

explorer_options=(
  --port 3002
  --host 172.28.1.7
  --basic-auth-password "$EXPLORER_KEY"
  --coin BTC
  --bitcoind-host "$BITCOIND_IP"
  --bitcoind-port "$BITCOIND_RPC_PORT"
  --bitcoind-user "$BITCOIND_RPC_USER"
  --bitcoind-pass "$BITCOIND_RPC_PASSWORD"
  --no-rates
  --privacy-mode
  --slow-device-mode
)

# Blacklist all functions provided by the RPC API
explorer_options+=(--rpc-blacklist "addnode,analyzepsbt,clearbanned,combinepsbt,combinerawtransaction,converttopsbt,createmultisig,createpsbt,createrawtransaction,decodepsbt,decoderawtransaction,decodescript,deriveaddresses,disconnectnode,echo,echojson,estimaterawfee,estimatesmartfee,finalizepsbt,generatetoaddress,generatetodescriptor,getaddednodeinfo,getbestblockhash,getblock,getblockchaininfo,getblockcount,getblockfilter,getblockhash,getblockheader,getblockstats,getblocktemplate,getchaintips,getchaintxstats,getconnectioncount,getdescriptorinfo,getdifficulty,getmemoryinfo,getmempoolancestors,getmempooldescendants,getmempoolentry,getmempoolinfo,getmininginfo,getnettotals,getnetworkhashps,getnetworkinfo,getnodeaddresses,getpeerinfo,getrawmempool,getrawtransaction,getrpcinfo,gettxout,gettxoutproof,gettxoutsetinfo,help,invalidateblock,joinpsbts,listbanned,logging,ping,preciousblock,prioritisetransaction,pruneblockchain,reconsiderblock,savemempool,scantxoutset,sendrawtransaction,setban,setmocktime,setnetworkactive,signmessagewithprivkey,signrawtransactionwithkey,stop,submitblock,submitheader,syncwithvalidationinterfacequeue,testmempoolaccept,uptime,utxoupdatepsbt,validateaddress,verifychain,verifymessage,verifytxoutproof,waitforblock,waitforblockheight,waitfornewblock")

# Use the local indexer if one is defined for Dojo
if [ "$NODE_ACTIVE_INDEXER" == "local_indexer" ]; then
  explorer_options+=(--address-api electrumx)
  explorer_options+=(--electrumx-servers "tcp://$INDEXER_IP:$INDEXER_RPC_PORT")

  # Wait for the local indexer
  timeout="720"
  i="0"
  while [ $i -lt $timeout ]
  do
    nc -z "$INDEXER_IP" "$INDEXER_RPC_PORT" > /dev/null
    if [ $? -eq 0 ] ; then
      break
    fi
    sleep 1
    i=$[$i+1]
  done
  if [ $i -eq $timeout ]; then
    echo "Operation timed out"
    exit 1
  fi
fi

node ./bin/cli.js "${explorer_options[@]}" > /data/logs/explorer-error.log  2> /data/logs/explorer-output.log
