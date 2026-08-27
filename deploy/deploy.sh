#!/usr/bin/env bash
set -euo pipefail
set +H

# Usage:
#   deploy.sh [--force-update | -fu] <env> [app_image]
#   env = prod

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 [--force-update | -fu] <env> [app_image]" >&2
  exit 2
fi

if [[ "$1" == "--force-update" || "$1" == "-fu" ]]; then
  echo ">>> [deploy] Force update requested. Updating deploy scripts from GitHub..."
  REPO="${BIOCOLLECT_GITHUB_REPO:-AQUILA04/BioCollect}"
  curl -sSL "https://raw.githubusercontent.com/${REPO}/main/deploy/update-deploy.sh" | bash
  shift
  if [ "$#" -lt 1 ]; then
    echo "Error: Missing environment argument after --force-update." >&2
    exit 2
  fi
  echo ">>> [deploy] Re-executing updated deploy.sh..."
  exec /opt/biocollect/deploy/deploy.sh "$@"
fi

ENV="$1"
APP_ARG="${2:-}"

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.$ENV.yml"
STACK_DIR="/opt/biocollect/$ENV"
ENV_FILE="$STACK_DIR/.env"
RELEASES_DIR="$STACK_DIR/releases"
PROJECT_NAME="biocollect-$ENV"
mkdir -p "$RELEASES_DIR"

env_quote() {
  local val="$1"
  if [[ "$val" == *[$'\n\r']* ]]; then
    echo "Error: newline in env value for key" >&2
    return 1
  fi
  if [[ "$val" =~ ^[A-Za-z0-9._:/+-]+$ ]]; then
    printf '%s' "$val"
  else
    local escaped="${val//\\/\\\\}"
    escaped="${escaped//\"/\\\"}"
    escaped="${escaped//\$/\\$}"
    escaped="${escaped//\`/\\\`}"
    printf '"%s"' "$escaped"
  fi
}

urlencode() {
  python3 -c 'import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=""))' "$1" 2>/dev/null \
    || printf '%s' "$1"
}

safe_source_env() {
  local file="$1"
  [[ -f "$file" ]] || return 0
  set +u
  set -a
  # shellcheck disable=SC1090
  source "$file"
  set +a
  set -u
}

set_env_var() {
  local key="$1"
  local val="$2"
  local file="$ENV_FILE"
  local stored line found=false
  stored="$(env_quote "$val")"
  local tmp
  tmp=$(mktemp)

  if [[ -f "$file" ]]; then
    while IFS= read -r line || [[ -n "$line" ]]; do
      if [[ "$line" == "${key}="* ]] && [[ "$found" == false ]]; then
        printf '%s=%s\n' "$key" "$stored"
        found=true
      else
        printf '%s\n' "$line"
      fi
    done < "$file" > "$tmp"
  fi

  if [[ "$found" == false ]]; then
    printf '%s=%s\n' "$key" "$stored" >> "$tmp"
  fi

  cat "$tmp" > "$file"
  rm -f "$tmp"
}

set_env_var_if_missing() {
  local key="$1"
  local val="$2"
  if ! grep -q -E "^${key}=" "$ENV_FILE" 2>/dev/null; then
    set_env_var "$key" "$val"
    echo "  + added missing $key"
  elif grep -q -E "^${key}=$" "$ENV_FILE" 2>/dev/null && [[ -n "$val" ]]; then
    set_env_var "$key" "$val"
    echo "  + filled empty $key"
  fi
}

rebuild_database_url() {
  safe_source_env "$ENV_FILE"
  local user="${DB_USER:-biocollect}"
  local pass="${DB_PASSWORD:-}"
  local name="${DB_NAME:-biocollect}"
  local enc
  enc="$(urlencode "$pass")"
  set_env_var "DATABASE_URL" "mysql://${user}:${enc}@mysql:3306/${name}"
}

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Error: compose file not found: $COMPOSE_FILE" >&2
  exit 1
fi

if [[ -f "$ENV_FILE" ]]; then
  safe_source_env "$ENV_FILE"
else
  echo "Warning: $ENV_FILE not found. Run setup-server.sh or init.sh first." >&2
fi

if [[ -n "$APP_ARG" ]]; then
  APP_IMAGE="$APP_ARG"
else
  APP_IMAGE="${APP_IMAGE:-}"
fi

if [[ -z "$APP_IMAGE" ]]; then
  echo "Error: APP_IMAGE must be provided as arg or in $ENV_FILE" >&2
  exit 1
fi

touch "$ENV_FILE"
chmod 600 "$ENV_FILE" || true

[[ -n "$APP_ARG" ]] && set_env_var "APP_IMAGE" "$APP_IMAGE"

echo "Ensuring $ENV_FILE has required keys..."
if [[ "$ENV" == "prod" ]]; then
  set_env_var_if_missing APP_HOSTNAME "biocollect.optimizesolux.com"
  set_env_var_if_missing DB_USER "biocollect"
  set_env_var_if_missing DB_NAME "biocollect"
  set_env_var_if_missing REDIS_DATABASE "7"
fi

if [[ "${BC_UPDATE_ENV_SECRETS:-}" == "true" ]]; then
  echo "BC_UPDATE_ENV_SECRETS=true — applying secret overrides from init/CD..."
  [[ -n "${BC_APP_HOSTNAME_PROD:-}" ]] && set_env_var APP_HOSTNAME "$BC_APP_HOSTNAME_PROD"
  [[ -n "${BC_DB_USER:-}" ]] && set_env_var DB_USER "$BC_DB_USER"
  [[ -n "${BC_DB_PASSWORD:-}" ]] && set_env_var DB_PASSWORD "$BC_DB_PASSWORD"
  [[ -n "${BC_DB_NAME:-}" ]] && set_env_var DB_NAME "$BC_DB_NAME"
  [[ -n "${BC_JWT_SECRET:-}" ]] && set_env_var JWT_SECRET "$BC_JWT_SECRET"
  [[ -n "${BC_OIDC_ISSUER_URI:-}" ]] && set_env_var OIDC_ISSUER_URI "$BC_OIDC_ISSUER_URI"
  [[ -n "${BC_OIDC_CLIENT_ID:-}" ]] && set_env_var OIDC_CLIENT_ID "$BC_OIDC_CLIENT_ID"
  [[ -n "${BC_OWNER_OPEN_ID:-}" ]] && set_env_var OWNER_OPEN_ID "$BC_OWNER_OPEN_ID"
  [[ -n "${BC_OWNER_EMAIL:-}" ]] && set_env_var OWNER_EMAIL "$BC_OWNER_EMAIL"
  [[ -n "${BC_KEYCLOAK_URL:-}" ]] && set_env_var KEYCLOAK_URL "$BC_KEYCLOAK_URL"
  [[ -n "${BC_KEYCLOAK_ADMIN:-}" ]] && set_env_var KEYCLOAK_ADMIN "$BC_KEYCLOAK_ADMIN"
  [[ -n "${BC_KEYCLOAK_ADMIN_PASSWORD:-}" ]] && set_env_var KEYCLOAK_ADMIN_PASSWORD "$BC_KEYCLOAK_ADMIN_PASSWORD"
  [[ -n "${BC_KEYCLOAK_ACTIONS_CLIENT_ID:-}" ]] && set_env_var KEYCLOAK_ACTIONS_CLIENT_ID "$BC_KEYCLOAK_ACTIONS_CLIENT_ID"
  [[ -n "${BC_APP_PUBLIC_URL:-}" ]] && set_env_var APP_PUBLIC_URL "$BC_APP_PUBLIC_URL"
  [[ -n "${BC_NOTIFICATION_HUB_BASE_URL:-}" ]] && set_env_var NOTIFICATION_HUB_BASE_URL "$BC_NOTIFICATION_HUB_BASE_URL"
  [[ -n "${BC_NOTIFICATION_HUB_FROM:-}" ]] && set_env_var NOTIFICATION_HUB_FROM "$BC_NOTIFICATION_HUB_FROM"
  [[ -n "${BC_NOTIFICATION_HUB_OAUTH_TOKEN_URL:-}" ]] && set_env_var NOTIFICATION_HUB_OAUTH_TOKEN_URL "$BC_NOTIFICATION_HUB_OAUTH_TOKEN_URL"
  [[ -n "${BC_NOTIFICATION_HUB_OAUTH_CLIENT_ID:-}" ]] && set_env_var NOTIFICATION_HUB_OAUTH_CLIENT_ID "$BC_NOTIFICATION_HUB_OAUTH_CLIENT_ID"
  [[ -n "${BC_NOTIFICATION_HUB_OAUTH_CLIENT_SECRET:-}" ]] && set_env_var NOTIFICATION_HUB_OAUTH_CLIENT_SECRET "$BC_NOTIFICATION_HUB_OAUTH_CLIENT_SECRET"
  [[ -n "${BC_REDIS_DATABASE:-}" ]] && set_env_var REDIS_DATABASE "$BC_REDIS_DATABASE"
fi

rebuild_database_url

TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
RELEASE_FILE="$RELEASES_DIR/${ENV}_${TIMESTAMP}.txt"

echo "DEPLOY: env=$ENV"
echo "Using compose file: $COMPOSE_FILE"
echo "Using env file:     $ENV_FILE"
echo "Saving release metadata to $RELEASE_FILE"
{
  echo "APP_IMAGE=$APP_IMAGE"
  echo "TIMESTAMP=$TIMESTAMP"
} > "$RELEASE_FILE"

echo "Pulling images..."
if [ -n "${GHCR_USERNAME:-}" ] && [ -n "${GHCR_TOKEN:-}" ]; then
  echo "Logging in to ghcr.io as $GHCR_USERNAME"
  echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin
fi

# Prefer IPv4 for outbound dual-stack (Contabo → GHCR IPv6 resets are common).
# Idempotent; does not disable IPv6 or restart Docker (shared Traefik VPS).
GAI=/etc/gai.conf
if [[ -w "$GAI" ]] || [[ -w /etc ]]; then
  if ! grep -qE '^precedence ::ffff:0:0/96[[:space:]]+100' "$GAI" 2>/dev/null; then
    echo "precedence ::ffff:0:0/96  100" >> "$GAI"
    echo "Preferred IPv4 via /etc/gai.conf (GHCR IPv6 resets on Contabo)"
  fi
fi

PULL_MAX=5
PULL_DELAY=5
PULL_OK=false
for attempt in $(seq 1 "$PULL_MAX"); do
  echo "Pull attempt ${attempt}/${PULL_MAX}..."
  if docker compose \
    -f "$COMPOSE_FILE" \
    --project-name "$PROJECT_NAME" \
    --env-file "$ENV_FILE" \
    pull; then
    PULL_OK=true
    break
  fi
  if [[ "$attempt" -lt "$PULL_MAX" ]]; then
    echo "Pull failed (attempt ${attempt}/${PULL_MAX}); retrying in ${PULL_DELAY}s..."
    sleep "$PULL_DELAY"
    PULL_DELAY=$((PULL_DELAY * 2))
  fi
done
if [[ "$PULL_OK" != "true" ]]; then
  echo "ERROR: docker compose pull failed after ${PULL_MAX} attempts" >&2
  exit 1
fi

echo "Starting services..."
set +e
docker compose \
  -f "$COMPOSE_FILE" \
  --project-name "$PROJECT_NAME" \
  --env-file "$ENV_FILE" \
  up -d --wait --wait-timeout 180
UP_RC=$?
set -e
if [[ "$UP_RC" -ne 0 ]]; then
  echo "ERROR: compose up failed (exit $UP_RC). Status and logs:" >&2
  docker compose \
    -f "$COMPOSE_FILE" \
    --project-name "$PROJECT_NAME" \
    --env-file "$ENV_FILE" \
    ps -a || true
  docker compose \
    -f "$COMPOSE_FILE" \
    --project-name "$PROJECT_NAME" \
    --env-file "$ENV_FILE" \
    logs --no-color --tail=200 || true
  exit "$UP_RC"
fi

ln -sfn "$RELEASE_FILE" "$RELEASES_DIR/${ENV}_current.txt"

if [[ "$ENV" == "prod" ]]; then
  safe_source_env "$ENV_FILE"
  APP_URL="https://${APP_HOSTNAME:-biocollect.optimizesolux.com}"
  echo "HTTP smoke: app=$APP_URL"
  sleep 5
  curl -sk -o /dev/null -w "app=%{http_code}\n" "$APP_URL/" || echo "WARN: app HTTP check failed"
fi

echo "Deployment finished."
cat "$RELEASE_FILE"
echo "Done"
