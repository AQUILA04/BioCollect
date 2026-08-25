# Secrets GitHub + DNS — BioCollect (OptimizeSolux Contabo)

Prérequis VPS : **shared-traefik** (+ **optimize-common-infra** recommandé pour Redis/MinIO/OTel).

Auth produit : **Manus OAuth** (`OAUTH_SERVER_URL`) — pas de host `biocollect-auth`.

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
| `OAUTH_SERVER_URL` | URL du serveur OAuth Manus (API) |
| `VITE_OAUTH_PORTAL_URL` | URL portail OAuth (bake CI image) |
| `VITE_APP_ID` | App ID Manus (bake CI image) |

Créer aussi l’**environment** GitHub Actions nommé `prod`.

## 3. Hosts runtime

| URL | Rôle |
|-----|------|
| https://biocollect.optimizesolux.com | App (SPA + API same-origin) |

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
