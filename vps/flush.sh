#!/bin/bash

BASE_DIR="kubot"
for dir in "$BASE_DIR"/*/; do
    echo ">>> Flushing logs in $dir"
    rm -rf "${dir}logs" 
    pm2 flush $dir
    cd - > /dev/null || exit
done
