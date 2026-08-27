#!/usr/bin/env bash
# =============================================================================
# setup-server.sh — One-time Contabo setup for BioCollect
# Prérequis: shared-traefik (+ optimize-common-infra recommandé).
# =============================================================================
set -euo pipefail
set +H

DEPLOY_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="/opt/biocollect"

echo "=== BioCollect Server Setup ==="

echo "[1/5] Checking Docker installation..."
if ! command -v docker &>/dev/null; then
  echo "      Docker not found. Installing..."
  apt-get update -y
  apt-get install -y ca-certificates curl gnupg git
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    | tee /etc/apt/sources.list.d/docker.list > /dev/null
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  echo "      Docker installed successfully."
else
  echo "      Docker already installed."
fi

echo "[2/5] Creating directory structure..."
mkdir -p "$ROOT/prod/releases"
mkdir -p "$ROOT/deploy"
if [[ "$DEPLOY_DIR" != "$ROOT/deploy" ]]; then
  cp -a "$DEPLOY_DIR"/. "$ROOT/deploy/"
  chmod +x "$ROOT/deploy"/*.sh 2>/dev/null || true
fi
echo "      Directories created."

echo "[3/5] Creating Docker networks..."
for net in traefik-public optimizesolux-common; do
  if docker network inspect "$net" > /dev/null 2>&1; then
    echo "      Network '$net' already exists, skipping."
  else
    docker network create "$net"
    echo "      Network '$net' created."
  fi
done

if [[ ! -d /opt/optimizesolux/common-infra ]]; then
  echo "      WARNING: /opt/optimizesolux/common-infra not found."
  echo "      Install optimize-common-infra before relying on shared Redis/MinIO/OTel."
else
  echo "      Tip: ensure common-infra is up: sudo /opt/optimizesolux/common-infra/install.sh"
fi

env_quote() {
  local val="$1"
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
  # Minimal encode for DATABASE_URL password
  python3 -c 'import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=""))' "$1" 2>/dev/null \
    || printf '%s' "$1"
}

echo "[4/5] Creating .env files..."

_db_user="${BC_DB_USER:-biocollect}"
_db_pass="${BC_DB_PASSWORD:-CHANGE_ME_prod_db_password}"
_db_name="${BC_DB_NAME:-biocollect}"
_app_host="${BC_APP_HOSTNAME_PROD:-biocollect.optimizesolux.com}"
_jwt="${BC_JWT_SECRET:-CHANGE_ME_openssl_rand_base64_32}"
_oidc_issuer="${BC_OIDC_ISSUER_URI:-https://auth.optimizesolux.com/realms/biocollect}"
_oidc_client="${BC_OIDC_CLIENT_ID:-biocollect-web}"
_owner="${BC_OWNER_OPEN_ID:-}"
_owner_email="${BC_OWNER_EMAIL:-francis.ahonsou@gmail.com}"
_kc_url="${BC_KEYCLOAK_URL:-https://auth.optimizesolux.com}"
_kc_admin="${BC_KEYCLOAK_ADMIN:-}"
_kc_admin_password="${BC_KEYCLOAK_ADMIN_PASSWORD:-}"
_kc_actions_client="${BC_KEYCLOAK_ACTIONS_CLIENT_ID:-biocollect-web}"
_app_public_url="${BC_APP_PUBLIC_URL:-https://biocollect.optimizesolux.com}"
_nh_base="${BC_NOTIFICATION_HUB_BASE_URL:-https://notification-api.optimizesolux.com}"
_nh_from="${BC_NOTIFICATION_HUB_FROM:-notifications@optimizesolux.com}"
_nh_token_url="${BC_NOTIFICATION_HUB_OAUTH_TOKEN_URL:-https://auth.optimizesolux.com/realms/notification-hub/protocol/openid-connect/token}"
_nh_client_id="${BC_NOTIFICATION_HUB_OAUTH_CLIENT_ID:-biocollect-notification-sender}"
_nh_client_secret="${BC_NOTIFICATION_HUB_OAUTH_CLIENT_SECRET:-}"
_redis_db="${BC_REDIS_DATABASE:-7}"

_db_pass_enc="$(urlencode "$_db_pass")"
_database_url="mysql://${_db_user}:${_db_pass_enc}@mysql:3306/${_db_name}"

_db_pass_q="$(env_quote "$_db_pass")"
_jwt_q="$(env_quote "$_jwt")"
_oidc_issuer_q="$(env_quote "$_oidc_issuer")"
_kc_url_q="$(env_quote "$_kc_url")"
_kc_admin_q="$(env_quote "$_kc_admin")"
_kc_admin_password_q="$(env_quote "$_kc_admin_password")"
_app_public_url_q="$(env_quote "$_app_public_url")"
_nh_base_q="$(env_quote "$_nh_base")"
_nh_token_url_q="$(env_quote "$_nh_token_url")"
_nh_client_secret_q="$(env_quote "$_nh_client_secret")"
_database_url_q="$(env_quote "$_database_url")"

PROD_ENV="$ROOT/prod/.env"
if [[ ! -f "$PROD_ENV" ]]; then
  cat > "$PROD_ENV" << EOF
# =============================================================================
# BioCollect PROD — $ROOT/prod/.env
# Auth: Keycloak OIDC (realm biocollect). Notifications: notification-hub.
# Redis index reserved: ${_redis_db}
# =============================================================================
DB_USER=${_db_user}
DB_PASSWORD=${_db_pass_q}
DB_NAME=${_db_name}
DATABASE_URL=${_database_url_q}

APP_HOSTNAME=${_app_host}
JWT_SECRET=${_jwt_q}
OIDC_ISSUER_URI=${_oidc_issuer_q}
OIDC_CLIENT_ID=${_oidc_client}
OWNER_OPEN_ID=${_owner}
OWNER_EMAIL=${_owner_email}

KEYCLOAK_URL=${_kc_url_q}
KEYCLOAK_ADMIN=${_kc_admin_q}
KEYCLOAK_ADMIN_PASSWORD=${_kc_admin_password_q}
KEYCLOAK_ACTIONS_CLIENT_ID=${_kc_actions_client}
APP_PUBLIC_URL=${_app_public_url_q}

NOTIFICATION_HUB_BASE_URL=${_nh_base_q}
NOTIFICATION_HUB_FROM=${_nh_from}
NOTIFICATION_HUB_OAUTH_TOKEN_URL=${_nh_token_url_q}
NOTIFICATION_HUB_OAUTH_CLIENT_ID=${_nh_client_id}
NOTIFICATION_HUB_OAUTH_CLIENT_SECRET=${_nh_client_secret_q}

REDIS_DATABASE=${_redis_db}

APP_IMAGE=
EOF
  chmod 600 "$PROD_ENV"
  echo "      Created $PROD_ENV"
else
  echo "      $PROD_ENV already exists, leaving untouched."
fi

echo "[5/5] Setup complete."
echo "      Next: run init.sh / deploy.sh from CD, or manually:"
echo "      docker compose -f $ROOT/deploy/docker-compose.prod.yml --project-name biocollect-prod --env-file $PROD_ENV up -d"
