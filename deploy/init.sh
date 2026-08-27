#!/usr/bin/env bash
# =============================================================================
# init.sh — Bootstrap Contabo BioCollect (shared-traefik + common-infra)
# =============================================================================
# Usage (CD via SSH):
#   ./init.sh prod <app_image> [options...]
# =============================================================================
set -euo pipefail
set +H

DEPLOY_DIR="/opt/biocollect/deploy"
GITHUB_REPO="${BIOCOLLECT_GITHUB_REPO:-AQUILA04/BioCollect}"
GITHUB_RAW="https://raw.githubusercontent.com/${GITHUB_REPO}/main/deploy"

ORIG_ARGS=("$@")

ENV=""
APP_IMAGE=""
FORCE_UPDATE=false

DB_USER=""
DB_PASSWORD=""
DB_NAME=""
APP_HOSTNAME_PROD=""
JWT_SECRET=""
OIDC_ISSUER_URI=""
OIDC_CLIENT_ID=""
OWNER_OPEN_ID=""
OWNER_EMAIL=""
KEYCLOAK_URL=""
KEYCLOAK_ADMIN=""
KEYCLOAK_ADMIN_PASSWORD=""
KEYCLOAK_ACTIONS_CLIENT_ID=""
APP_PUBLIC_URL=""
NOTIFICATION_HUB_BASE_URL=""
NOTIFICATION_HUB_FROM=""
NOTIFICATION_HUB_OAUTH_TOKEN_URL=""
NOTIFICATION_HUB_OAUTH_CLIENT_ID=""
NOTIFICATION_HUB_OAUTH_CLIENT_SECRET=""
REDIS_DATABASE=""
GHCR_USERNAME=""
GHCR_TOKEN=""

if [[ "$#" -ge 1 && "$1" != --* && "$1" != -* ]]; then
  ENV="$1"; shift
fi
if [[ "$#" -ge 1 && "$1" != --* && "$1" != -* ]]; then
  APP_IMAGE="$1"; shift
fi

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --force-update|-fu) FORCE_UPDATE=true ;;
    --db-user)                    DB_USER="$2";                    shift ;;
    --db-password)                DB_PASSWORD="$2";                shift ;;
    --db-name)                    DB_NAME="$2";                    shift ;;
    --app-hostname-prod)          APP_HOSTNAME_PROD="$2";          shift ;;
    --jwt-secret)                 JWT_SECRET="$2";                 shift ;;
    --oidc-issuer-uri)            OIDC_ISSUER_URI="$2";            shift ;;
    --oidc-client-id)             OIDC_CLIENT_ID="$2";             shift ;;
    --owner-open-id)              OWNER_OPEN_ID="$2";              shift ;;
    --owner-email)                OWNER_EMAIL="$2";                shift ;;
    --keycloak-url)               KEYCLOAK_URL="$2";               shift ;;
    --keycloak-admin)             KEYCLOAK_ADMIN="$2";             shift ;;
    --keycloak-admin-password)    KEYCLOAK_ADMIN_PASSWORD="$2";    shift ;;
    --keycloak-actions-client-id) KEYCLOAK_ACTIONS_CLIENT_ID="$2"; shift ;;
    --app-public-url)             APP_PUBLIC_URL="$2";             shift ;;
    --notification-hub-base-url)  NOTIFICATION_HUB_BASE_URL="$2";  shift ;;
    --notification-hub-from)      NOTIFICATION_HUB_FROM="$2";      shift ;;
    --notification-hub-oauth-token-url) NOTIFICATION_HUB_OAUTH_TOKEN_URL="$2"; shift ;;
    --notification-hub-oauth-client-id) NOTIFICATION_HUB_OAUTH_CLIENT_ID="$2"; shift ;;
    --notification-hub-oauth-client-secret) NOTIFICATION_HUB_OAUTH_CLIENT_SECRET="$2"; shift ;;
    --redis-database)             REDIS_DATABASE="$2";             shift ;;
    --ghcr-username)              GHCR_USERNAME="$2";              shift ;;
    --ghcr-token)                 GHCR_TOKEN="$2";                 shift ;;
    --github-repo)
      GITHUB_REPO="$2"
      export BIOCOLLECT_GITHUB_REPO="$2"
      GITHUB_RAW="https://raw.githubusercontent.com/${GITHUB_REPO}/main/deploy"
      shift
      ;;
    # Legacy Manus flags (ignored)
    --oauth-server-url|--vite-app-id) shift ;;
    *) echo "Unknown parameter: $1" >&2; exit 1 ;;
  esac
  shift
done

if [[ -z "$ENV" || -z "$APP_IMAGE" ]]; then
  echo "Error: env and app_image are required." >&2
  echo "Usage: $0 <env> <app_image> [options...]" >&2
  exit 1
fi

if [[ "${BIOCOLLECT_INIT_SYNCED:-}" != "1" ]]; then
  echo ">>> [init] Syncing /opt/biocollect/deploy from GitHub (repo is source of truth)..."
  mkdir -p /opt/biocollect
  export BIOCOLLECT_GITHUB_REPO="$GITHUB_REPO"
  bash <(curl -sSL "$GITHUB_RAW/update-deploy.sh")

  curl -sSL "$GITHUB_RAW/init.sh" -o /opt/biocollect/init.sh
  chmod +x /opt/biocollect/init.sh

  export BIOCOLLECT_INIT_SYNCED=1
  echo ">>> [init] Re-executing synced init.sh from $DEPLOY_DIR..."
  exec "$DEPLOY_DIR/init.sh" "${ORIG_ARGS[@]}"
fi

if [[ "$FORCE_UPDATE" == "true" ]]; then
  echo ">>> [init] --force-update acknowledged (deploy/ already synced)."
fi

if [[ ! -d "$DEPLOY_DIR" ]]; then
  echo "Error: $DEPLOY_DIR missing after sync." >&2
  exit 1
fi

SETUP_MARKER="/opt/biocollect/.server_initialized"

if [[ ! -f "$SETUP_MARKER" ]]; then
  echo ">>> [init] First-time setup detected. Running setup-server.sh..."

  export BC_DB_USER="${DB_USER:-biocollect}"
  export BC_DB_PASSWORD="${DB_PASSWORD:-}"
  export BC_DB_NAME="${DB_NAME:-biocollect}"
  export BC_APP_HOSTNAME_PROD="${APP_HOSTNAME_PROD:-biocollect.optimizesolux.com}"
  export BC_JWT_SECRET="${JWT_SECRET:-}"
  export BC_OIDC_ISSUER_URI="${OIDC_ISSUER_URI:-}"
  export BC_OIDC_CLIENT_ID="${OIDC_CLIENT_ID:-}"
  export BC_OWNER_OPEN_ID="${OWNER_OPEN_ID:-}"
  export BC_OWNER_EMAIL="${OWNER_EMAIL:-francis.ahonsou@gmail.com}"
  export BC_KEYCLOAK_URL="${KEYCLOAK_URL:-}"
  export BC_KEYCLOAK_ADMIN="${KEYCLOAK_ADMIN:-}"
  export BC_KEYCLOAK_ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD:-}"
  export BC_KEYCLOAK_ACTIONS_CLIENT_ID="${KEYCLOAK_ACTIONS_CLIENT_ID:-}"
  export BC_APP_PUBLIC_URL="${APP_PUBLIC_URL:-}"
  export BC_NOTIFICATION_HUB_BASE_URL="${NOTIFICATION_HUB_BASE_URL:-}"
  export BC_NOTIFICATION_HUB_FROM="${NOTIFICATION_HUB_FROM:-}"
  export BC_NOTIFICATION_HUB_OAUTH_TOKEN_URL="${NOTIFICATION_HUB_OAUTH_TOKEN_URL:-}"
  export BC_NOTIFICATION_HUB_OAUTH_CLIENT_ID="${NOTIFICATION_HUB_OAUTH_CLIENT_ID:-}"
  export BC_NOTIFICATION_HUB_OAUTH_CLIENT_SECRET="${NOTIFICATION_HUB_OAUTH_CLIENT_SECRET:-}"
  export BC_REDIS_DATABASE="${REDIS_DATABASE:-7}"

  bash "$DEPLOY_DIR/setup-server.sh"
  touch "$SETUP_MARKER"
  echo ">>> [init] Server setup complete. Marker written to $SETUP_MARKER"
else
  echo ">>> [init] Server already initialized (found $SETUP_MARKER). Skipping setup."
fi

echo ">>> [init] Launching deployment: env=$ENV"
export GHCR_USERNAME="${GHCR_USERNAME:-}"
export GHCR_TOKEN="${GHCR_TOKEN:-}"
export BIOCOLLECT_GITHUB_REPO="$GITHUB_REPO"

export BC_UPDATE_ENV_SECRETS="${BC_UPDATE_ENV_SECRETS:-true}"
export BC_DB_USER="${DB_USER:-}"
export BC_DB_PASSWORD="${DB_PASSWORD:-}"
export BC_DB_NAME="${DB_NAME:-}"
export BC_APP_HOSTNAME_PROD="${APP_HOSTNAME_PROD:-}"
export BC_JWT_SECRET="${JWT_SECRET:-}"
export BC_OIDC_ISSUER_URI="${OIDC_ISSUER_URI:-}"
export BC_OIDC_CLIENT_ID="${OIDC_CLIENT_ID:-}"
export BC_OWNER_OPEN_ID="${OWNER_OPEN_ID:-}"
export BC_OWNER_EMAIL="${OWNER_EMAIL:-}"
export BC_KEYCLOAK_URL="${KEYCLOAK_URL:-}"
export BC_KEYCLOAK_ADMIN="${KEYCLOAK_ADMIN:-}"
export BC_KEYCLOAK_ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD:-}"
export BC_KEYCLOAK_ACTIONS_CLIENT_ID="${KEYCLOAK_ACTIONS_CLIENT_ID:-}"
export BC_APP_PUBLIC_URL="${APP_PUBLIC_URL:-}"
export BC_NOTIFICATION_HUB_BASE_URL="${NOTIFICATION_HUB_BASE_URL:-}"
export BC_NOTIFICATION_HUB_FROM="${NOTIFICATION_HUB_FROM:-}"
export BC_NOTIFICATION_HUB_OAUTH_TOKEN_URL="${NOTIFICATION_HUB_OAUTH_TOKEN_URL:-}"
export BC_NOTIFICATION_HUB_OAUTH_CLIENT_ID="${NOTIFICATION_HUB_OAUTH_CLIENT_ID:-}"
export BC_NOTIFICATION_HUB_OAUTH_CLIENT_SECRET="${NOTIFICATION_HUB_OAUTH_CLIENT_SECRET:-}"
export BC_REDIS_DATABASE="${REDIS_DATABASE:-}"

bash "$DEPLOY_DIR/deploy.sh" "$ENV" "$APP_IMAGE"

echo ">>> [init] Done."
