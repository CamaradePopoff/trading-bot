#!/bin/bash

BASE_DIR="kubot"
for dir in "$BASE_DIR"/*/; do
  if [ -d "${dir}.git" ]; then
    echo ">>> Updating $dir"
    cd "$dir" || continue
    git pull
    cd - > /dev/null || exit
  fi
done
