#!/bin/bash

nvm use node

BASE_DIR="kubot"

echo ""
echo "======================================"
echo "Installing dependencies and running migrations..."
echo "======================================"

for dir in "$BASE_DIR"/*/; do
  if [ -d "$dir" ]; then
    project=$(basename "$dir")
    echo ""
    echo ">>> Preparing $project"
    
    cd "$dir" || continue
    
    if [ -d "backend" ]; then
      echo "  - Installing backend dependencies..."
      cd backend || continue
      npm i
      
      if [ -f "migrate-mongo-config.js" ]; then
        echo "  - Running database migrations..."
        npm run migrate:up
      fi
      
      cd .. || exit
    fi
    
    cd - > /dev/null || exit
    echo "  ✓ $project ready"
  fi
done

echo ""
echo "======================================"
echo "Starting PM2 processes..."
echo "======================================"

cd "$BASE_DIR"
cd kubot && pm2 start backend/index.js --name kucoin && cd .. && cd binance && pm2 start backend/index.js --name binance && cd .. && cd mexc && pm2 start backend/index.js --name mexc && cd .. && cd bybit && pm2 start backend/index.js --name bybit && cd ..
