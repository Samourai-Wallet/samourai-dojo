#!/bin/bash
set -e

whirlpool_options=(
  --listen
  --cli.dojo.enabled=true
  --cli.tor=true
  --cli.torConfig.executable=/usr/local/bin/tor
  --cli.torConfig.coordinator.enabled=true
  --cli.torConfig.coordinator.onion=true
  --cli.torConfig.backend.enabled=false
  --cli.torConfig.backend.onion=false
  --logging.file="/home/whirlpool/.whirlpool-cli/whirlpool-output.log"
)

if [ "$COMMON_BTC_NETWORK" == "testnet" ]; then
  whirlpool_options+=(--cli.server="TESTNET")
  whirlpool_options+=(--cli.dojo.url="http://172.30.1.3:80/test/v2/")
else
  whirlpool_options+=(--cli.server="MAINNET")
  whirlpool_options+=(--cli.dojo.url="http://172.30.1.3:80/v2/")
fi

cd /home/whirlpool/.whirlpool-cli
java -jar /usr/local/whirlpool-cli/whirlpool-client-cli-run.jar "${whirlpool_options[@]}"
