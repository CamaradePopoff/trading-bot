#!/bin/bash

BASE_DIR="kubot"
for dir in "$BASE_DIR"/*/; do
  if [ -f "${dir}backend/package.json" ]; then
    echo ">>> Installing dependencies in ${dir}backend"
    cd "${dir}backend" || continue
    npm ci
    cd - > /dev/null || exit
  fi
done
