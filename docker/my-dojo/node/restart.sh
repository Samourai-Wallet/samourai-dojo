#!/bin/bash

cd /home/node/app/accounts
forever start -a -l /dev/stdout -o /dev/null -e /dev/null index.js "$COMMON_BTC_NETWORK"

cd /home/node/app/pushtx
forever start -a -l /dev/stdout -o /dev/null -e /dev/null index.js "$COMMON_BTC_NETWORK"
forever start -a -l /dev/stdout -o /dev/null -e /dev/null index-orchestrator.js "$COMMON_BTC_NETWORK"

cd /home/node/app/tracker
forever start -a -l /dev/stdout -o /dev/null -e /dev/null index.js "$COMMON_BTC_NETWORK"

# Keep the container up
while true
do
  sleep 1
done