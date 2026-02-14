#!/bin/bash

nvm use node

BASE_DIR="kubot"

echo ""
echo "======================================"
echo "Updating dependencies and running migrations for all projects..."
echo "======================================"

for dir in "$BASE_DIR"/*/; do
  if [ -d "${dir}backend" ]; then
    project=$(basename "$dir")
    echo ""
    echo ">>> Processing $project"
    
    echo "  - Installing backend dependencies..."
    cd "${dir}backend" || continue
    npm i
    
    # Run migrations if migrate-mongo-config.js exists
    if [ -f "migrate-mongo-config.js" ]; then
      echo "  - Running database migrations..."
      npm run migrate:up
    else
      echo "  - No migrations found, skipping..."
    fi
    
    cd - > /dev/null || continue
    
    echo "  ✓ $project updated"
  fi
done

echo ""
echo "======================================"
echo "Restarting all PM2 processes..."
echo "======================================"
pm2 restart all
