# Google OIDC (SSO optionnel) — BioCollect / Keycloak

Keycloak (`realm biocollect`) est le **seul** hub d’identité : comptes locaux (email + mot de passe) suffisent.

Google est un **Identity Provider optionnel** sur l’écran de login Keycloak, pour les utilisateurs qui préfèrent le SSO plutôt qu’un compte local. L’application BioCollect ne force jamais Google.

Sans cette configuration Google, le login / register Keycloak fonctionne déjà.

## 1. Google Cloud Console

1. Ouvrir [Google Cloud Console](https://console.cloud.google.com/) → projet OptimizeSolux ou BioCollect.
2. **APIs & Services → OAuth consent screen**
   - Type External (ou Internal si Google Workspace uniquement)
   - Nom d’app : BioCollect (ou OptimizeSolux)
   - Emails support / développeur
   - Scopes : `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`
3. **Credentials → Create credentials → OAuth client ID → Web application**
4. **Authorized redirect URIs** (obligatoire — callback broker Keycloak) :
   - Prod : `https://auth.optimizesolux.com/realms/biocollect/broker/google/endpoint`
   - Local : `http://localhost:8180/realms/biocollect/broker/google/endpoint`
5. Copier **Client ID** et **Client Secret** (ne jamais les committer).

Si Google affiche « App not verified », rester en mode Testing et ajouter des test users, ou lancer la vérification pour la prod.

## 2. Keycloak Admin

1. Realm `biocollect` → **Identity providers → Add provider → Google**
2. Coller Client ID / Client Secret
3. Activer **Trust email**
4. Vérifier le flow **First Broker Login** (création / liaison de compte au premier SSO)
5. Sur l’écran login thémé BioCollect, vérifier : formulaire local **et** bouton Google

## 3. Variables produit (rappel)

| Variable | Rôle |
|----------|------|
| `OIDC_ISSUER_URI` | `https://auth.optimizesolux.com/realms/biocollect` (prod) |
| `OIDC_CLIENT_ID` | `biocollect-web` |
| `VITE_KEYCLOAK_URL` | `https://auth.optimizesolux.com` (bake image) |
| `VITE_KEYCLOAK_REALM` | `biocollect` |
| `VITE_KEYCLOAK_CLIENT_ID` | `biocollect-web` |

Le secret Google reste **uniquement** dans Keycloak (ou Vault), pas dans les secrets BioCollect frontend.

## 4. Déploiement realm / thème

Source de vérité : `optimize-common-infra/images/keycloak/`

- Realm : `realms/biocollect-realm.json` (`loginTheme: biocollect`)
- Thème : `themes/biocollect/`

Après changement : rebuild image Keycloak + `install.sh --force-update keycloak` sur le VPS.
