# Keycloak themes — BioCollect / OptimizeSolux

Source of truth: `images/keycloak/themes/` in **optimize-common-infra**.

## Themes

| Theme | Type | Usage |
|-------|------|--------|
| `biocollect` | login | Realm `biocollect` (`loginTheme` in `biocollect-realm.json`) |
| `optimizesolux` | welcome | Root `https://auth.optimizesolux.com/` — redirect BioCollect, no admin console |
| `optimizesolux` | login | Fallback for **master** realm errors (realm missing, 404 OIDC) |

## Deploy

1. Rebuild/publish image Keycloak (themes baked in Dockerfile).
2. Ensure realm JSON is present under `images/keycloak/realms/`.
3. On Contabo:

```bash
cd /opt/optimizesolux/common-infra
git pull
sudo ./install.sh --force-update keycloak
```

4. **Master realm (one-time ops)** : Realm settings → Themes → Login theme = `optimizesolux`  
   → les erreurs sans realm valide affichent le branding BioCollect au lieu de la page Keycloak par défaut.

## Local BioCollect

Copies under `BioCollect/deploy/keycloak/` — resync after editing common-infra.
