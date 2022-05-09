#!/bin/bash
PROC=`netstat -peanut 2> /dev/null | grep 3000 | cut -f 70 --output-delimiter=","  -d " " | cut -f 1 -d "/"`
kill $PROC 2> /dev/null
pushd .. 
rsync -a topologrjs/ topologrjs.dist/
pushd topologrjs.dist
PORT=3000 nohup node topologrjs-app.js 2>&1 >> topologr.log &
popd 
popd 