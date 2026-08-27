# Notification Hub — BioCollect

BioCollect envoie les emails métier via **notification-hub** (API partagée OptimizeSolux).  
Le realm Keycloak produit (`biocollect`) n’est **pas** modifié : le service account vit dans le realm **`notification-hub`**.

## URLs

| Environnement | API | Token OAuth |
|---------------|-----|-------------|
| Prod | `https://notification-api.optimizesolux.com` | `https://auth.optimizesolux.com/realms/notification-hub/protocol/openid-connect/token` |
| Local hub | `http://localhost:8088` | selon le compose notification-hub |

## Variables BioCollect API

| Variable | Exemple |
|----------|---------|
| `NOTIFICATION_HUB_BASE_URL` | `https://notification-api.optimizesolux.com` |
| `NOTIFICATION_HUB_FROM` | `notifications@optimizesolux.com` |
| `NOTIFICATION_HUB_OAUTH_TOKEN_URL` | `…/realms/notification-hub/protocol/openid-connect/token` |
| `NOTIFICATION_HUB_OAUTH_CLIENT_ID` | `biocollect-notification-sender` |
| `NOTIFICATION_HUB_OAUTH_CLIENT_SECRET` | secret Keycloak (Vault / `.env` Contabo) |

Sans `NOTIFICATION_HUB_BASE_URL`, les envois sont en no-op (warn log) — utile en laptop sans hub.

## Client Keycloak

Défini dans `optimize-common-infra/images/keycloak/realms/notification-hub-realm.json` :

- Client ID : `biocollect-notification-sender`
- Confidential + Service account
- Rôle à assigner sur le service account : `notification-sender` (UI Admin si l’import JSON ne le lie pas automatiquement)
- Claim `tenant_id=biocollect` dans l’access token

Après modification du realm :

```bash
# Sur le VPS common-infra
./install.sh --force-update keycloak
```

Puis copier le **Client secret** dans `/opt/biocollect/prod/.env` → `NOTIFICATION_HUB_OAUTH_CLIENT_SECRET`.

## Smoke test

```bash
TOKEN=$(curl -s -X POST "$TOKEN_URL" \
  -d "grant_type=client_credentials" \
  -d "client_id=biocollect-notification-sender" \
  -d "client_secret=$SECRET" | jq -r .access_token)

curl -s -o /dev/null -w "%{http_code}\n" -X POST "$HUB/v1/notifications" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{"channel":"EMAIL","from":"notifications@optimizesolux.com","to":["francis.ahonsou@gmail.com"],"subject":"BioCollect smoke","body":"<p>OK</p>"}'
```

Attendu : `202`.
