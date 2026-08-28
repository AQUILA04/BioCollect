#!/usr/bin/env bash
# Apply Drizzle SQL migrations (idempotent via __drizzle_migrations when using migrator).
# For Contabo: run inside app container or pipe SQL into mysql.
set -euo pipefail

MIGRATIONS_DIR="${1:-/app/apps/api/drizzle}"
MYSQL_CONTAINER="${MYSQL_CONTAINER:-biocollect-prod-mysql-1}"
APP_CONTAINER="${APP_CONTAINER:-biocollect-prod-app-1}"

if docker ps --format '{{.Names}}' | grep -qx "$APP_CONTAINER"; then
  for f in $(docker exec "$APP_CONTAINER" sh -c "ls ${MIGRATIONS_DIR}/*.sql" | sort); do
    echo ">>> Applying $(basename "$f")"
    docker exec "$APP_CONTAINER" cat "$f" \
      | docker exec -i "$MYSQL_CONTAINER" sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"'
  done
else
  echo "App container $APP_CONTAINER not running" >&2
  exit 1
fi

echo ">>> migrate-db done"
