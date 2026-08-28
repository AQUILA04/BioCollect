# Keycloak themes — BioCollect / OptimizeSolux

Source of truth: `images/keycloak/themes/` in **optimize-common-infra**.

## Themes

| Theme | Type | Usage |
|-------|------|--------|
| `biocollect` | login | Realm `biocollect` (`loginTheme` in `biocollect-realm.json`) |
| `optimizesolux` | welcome | Root `https://auth.optimizesolux.com/` — redirect BioCollect, no admin console |
| `optimizesolux` | login | Fallback for **master** realm errors (realm missing, 404 OIDC) |

## Superadmin vs utilisateur Keycloak

Deux couches distinctes :

| Couche | Où | Comment |
|--------|-----|---------|
| **Compte Keycloak** | Realm `biocollect` → Users | Connexion email / mot de passe (ou inscription) |
| **Rôle Superadmin BioCollect** | Base MySQL BioCollect (`users.role`) | Promotion idempotente si `OWNER_EMAIL` = `francis.ahonsou@gmail.com` au **premier login** dans l’app |

Un redémarrage Keycloak **ne crée pas** le Superadmin BioCollect. Il faut un utilisateur Keycloak, puis une connexion à BioCollect.

### Créer le compte owner Keycloak (prod)

Si le realm existe déjà, `--import-realm` n’ajoute pas les users du JSON. Exécuter une fois :

```bash
cd /opt/optimizesolux/common-infra
git pull
# Définir BIOCOLLECT_OWNER_EMAIL / BIOCOLLECT_OWNER_PASSWORD dans .env si besoin
bash scripts/bootstrap-biocollect-owner.sh
```

Ou manuellement : Keycloak Admin → realm **BioCollect** → Users → **Create new user** avec `francis.ahonsou@gmail.com`.

Ensuite : se connecter sur https://biocollect.optimizesolux.com → le rôle **Superadmin** est attribué automatiquement côté API.

## Deploy

1. Rebuild/publish image Keycloak (themes baked in Dockerfile).
2. Ensure realm JSON is present under `images/keycloak/realms/`.
3. On Contabo (or via GitHub Actions **Optimize Common Infra CD** → `install` + force-update `keycloak`):

```bash
cd /opt/optimizesolux/common-infra
git pull
sudo ./install.sh --force-update keycloak
```

> **CD GitHub** : le workflow sync le repo puis recrée Keycloak. Les thèmes sont montés depuis `images/keycloak/themes/` (pas besoin de rebuild image pour du CSS). Vérifier que le job CD **prod** est bien passé au vert (approbation environment si configurée).

4. **Master realm (one-time ops)** : Realm settings → Themes → Login theme = `optimizesolux`  
   → les erreurs sans realm valide affichent le branding BioCollect au lieu de la page Keycloak par défaut.

## Local BioCollect

Copies under `BioCollect/deploy/keycloak/` — resync after editing common-infra.
