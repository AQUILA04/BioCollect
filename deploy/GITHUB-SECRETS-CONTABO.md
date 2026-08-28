# Secrets GitHub + DNS — BioCollect (OptimizeSolux Contabo)

Prérequis VPS : **shared-traefik** + **optimize-common-infra** (Keycloak realms `biocollect` + `notification-hub`).

Auth produit : **Keycloak OIDC** (`OIDC_ISSUER_URI=https://auth.optimizesolux.com/realms/biocollect`).  
SSO Google optionnel : voir [`docs/GOOGLE-OIDC-SETUP.md`](../docs/GOOGLE-OIDC-SETUP.md).  
Notifications : [`docs/NOTIFICATION-HUB.md`](../docs/NOTIFICATION-HUB.md).  
Invitations membres : [`docs/MEMBER-INVITES.md`](../docs/MEMBER-INVITES.md).  
Thèmes Keycloak : [`docs/KEYCLOAK-THEMES.md`](../docs/KEYCLOAK-THEMES.md).  
Compte owner Keycloak (une fois) : `bash scripts/bootstrap-biocollect-owner.sh` dans common-infra (voir doc ci-dessus).

## 1. DNS Cloudflare

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | `biocollect` | `169.58.127.90` | DNS only (nuage gris) pour Let’s Encrypt HTTP-01 |

Optionnel plus tard : `biocollect-api` si l’API est exposée sur un host dédié.

## 2. Secrets repo (Actions) + environment `prod`

Réutilise la même clé SSH que SharedTraefik / CleanTrack / eHealth si possible.

| Secret | Valeur |
|--------|--------|
| `SSH_PRIVATE_KEY` | contenu de `~\.ssh\optimizesolux_vps_ed25519` |
| `PROD_SERVER_HOST` | `169.58.127.90` |
| `PROD_SERVER_USER` | `root` |
| `GHCR_USERNAME` | user GitHub (ex. `AQUILA04`) |
| `GHCR_TOKEN` | PAT `read:packages` (+ `write:packages` pour CI si besoin) |
| `DB_USER` | `biocollect` |
| `PROD_DB_PASSWORD` | mot de passe fort MySQL |
| `PROD_DB_NAME` | `biocollect` |
| `PROD_APP_HOSTNAME` | `biocollect.optimizesolux.com` |
| `JWT_SECRET` | `openssl rand -base64 32` |
| `OIDC_ISSUER_URI` | `https://auth.optimizesolux.com/realms/biocollect` |
| `OIDC_CLIENT_ID` | `biocollect-web` |
| `VITE_KEYCLOAK_URL` | `https://auth.optimizesolux.com` (bake CI image) |
| `VITE_KEYCLOAK_REALM` | `biocollect` |
| `VITE_KEYCLOAK_CLIENT_ID` | `biocollect-web` |
| `OWNER_EMAIL` | `francis.ahonsou@gmail.com` (Superadmin idempotent) |
| `OWNER_OPEN_ID` | Keycloak `sub` (optionnel, en complément de l’email) |
| `KEYCLOAK_URL` | `https://auth.optimizesolux.com` |
| `KEYCLOAK_ADMIN` | admin master Keycloak (invites membres) |
| `KEYCLOAK_ADMIN_PASSWORD` | mot de passe admin Keycloak |
| `KEYCLOAK_ACTIONS_CLIENT_ID` | `biocollect-web` (optionnel) |
| `APP_PUBLIC_URL` | `https://biocollect.optimizesolux.com` (redirect post-setup) |
| `NOTIFICATION_HUB_BASE_URL` | `https://notification-api.optimizesolux.com` |
| `NOTIFICATION_HUB_FROM` | `notifications@optimizesolux.com` |
| `NOTIFICATION_HUB_OAUTH_TOKEN_URL` | `https://auth.optimizesolux.com/realms/notification-hub/protocol/openid-connect/token` |
| `NOTIFICATION_HUB_OAUTH_CLIENT_ID` | `biocollect-notification-sender` |
| `NOTIFICATION_HUB_OAUTH_CLIENT_SECRET` | secret Keycloak (realm `notification-hub`) |

Créer aussi l’**environment** GitHub Actions nommé `prod`.

## 3. Hosts runtime

| URL | Rôle |
|-----|------|
| https://biocollect.optimizesolux.com | App (SPA + API same-origin) |
| https://auth.optimizesolux.com/realms/biocollect | Keycloak realm produit |
| https://notification-api.optimizesolux.com | notification-hub API |

## 4. Pipelines

| Workflow | Trigger |
|----------|---------|
| **CI** | push / PR → quality + publish `ghcr.io/aquila04/biocollect` |
| **CD** | CI success sur `release/**` **ou** `workflow_dispatch` (promote) → SSH Contabo |

Promote : déploie la dernière image publiée depuis l’historique `main` (tag `sha-…` ou `latest`).

## 5. Source de vérité

- Runtime Docker (compose, scripts) = `deploy/` du dépôt
- À chaque `init.sh`, `/opt/biocollect/deploy/` est resynchronisé depuis GitHub
- Secrets hors git : `/opt/biocollect/prod/.env`
- Template : `deploy/.env.prod.example`
- Redis DB index réservé : `7` (`biocollect:`)
- Realm + thème Keycloak produit : `optimize-common-infra/images/keycloak/`
- Client notifications : realm `notification-hub` → `biocollect-notification-sender`
