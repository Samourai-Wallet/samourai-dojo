#!/bin/bash

DIRPATH=$(dirname -- $(readlink -fn -- "$0"))

forever stop 0
forever stop 0
forever stop 0
forever stop 0

cd $DIRPATH/accounts
forever start -a -l forever.log -o output.log -e error.log index.js
cd $DIRPATH/pushtx
forever start -a -l forever.log -o output.log -e error.log index.js
forever start -a -l forever.log -o output.log -e error.log index-orchestrator.js
cd $DIRPATH/tracker
forever start -a -l forever.log -o output.log -e error.log index.js
