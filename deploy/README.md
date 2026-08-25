# BioCollect — Deploy Contabo

Stack prod : **MySQL métier** + **app** (`ghcr.io/aquila04/biocollect`) derrière **shared-traefik**.

Voir [GITHUB-SECRETS-CONTABO.md](./GITHUB-SECRETS-CONTABO.md) pour DNS et secrets.

## Layout VPS

```text
/opt/biocollect/
  deploy/          # synchronisé depuis GitHub (source de vérité)
  prod/.env        # secrets runtime (hors git)
  prod/releases/   # métadonnées de release
  init.sh          # bootstrap CD
```

## Première mise en service

1. DNS A `biocollect` → IP Contabo (DNS only)
2. Secrets GitHub + environment `prod`
3. CI a publié au moins une image GHCR
4. Actions → **BioCollect CD** → `workflow_dispatch` → **promote**

Ou manuellement sur le VPS :

```bash
curl -sSL https://raw.githubusercontent.com/AQUILA04/BioCollect/main/deploy/init.sh \
  -o /opt/biocollect/init.sh && chmod +x /opt/biocollect/init.sh
sudo /opt/biocollect/init.sh prod ghcr.io/aquila04/biocollect:latest \
  --ghcr-username … --ghcr-token … \
  --db-user biocollect --db-password … --db-name biocollect \
  --app-hostname-prod biocollect.optimizesolux.com \
  --jwt-secret … --oauth-server-url …
```

## Local

À la racine du monorepo :

```bash
docker compose up --build
```

MySQL local + build Dockerfile (pas de Traefik).
