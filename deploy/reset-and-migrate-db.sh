#!/usr/bin/env bash
set -euo pipefail

MYSQL_CONTAINER="${MYSQL_CONTAINER:-biocollect-prod-mysql-1}"
APP_CONTAINER="${APP_CONTAINER:-biocollect-prod-app-1}"

echo ">>> Resetting biocollect database..."
docker exec "$MYSQL_CONTAINER" sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "DROP DATABASE IF EXISTS biocollect; CREATE DATABASE biocollect; GRANT ALL PRIVILEGES ON biocollect.* TO \"$MYSQL_USER\"@\"%\"; FLUSH PRIVILEGES;"'

echo ">>> Running Drizzle migrations..."
docker cp /tmp/migrate-db.mjs "$APP_CONTAINER:/app/apps/api/migrate-db.mjs"
docker exec -w /app/apps/api "$APP_CONTAINER" node migrate-db.mjs

echo ">>> Done"
