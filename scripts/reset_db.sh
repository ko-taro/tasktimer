#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT_NAME=$(basename "$(pwd)")
VOLUME_NAME="${PROJECT_NAME}_db_data"

echo "Stopping db container..."
docker compose stop db
docker compose rm -f db

echo "Removing db volume..."
docker volume rm "$VOLUME_NAME" 2>/dev/null || true

echo "Starting db container..."
docker compose up -d db
