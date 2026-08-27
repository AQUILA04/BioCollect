# Invitations membres d’espace (Keycloak)

Un **Administrateur** d’espace (ou un **Superadmin**) peut inviter des collaborateurs avec le rôle tenant `Administrateur`, `Superviseur` ou `Enquêteur`.

## Flow

1. Back-office → **Membres** → email + rôle (+ nom optionnel)
2. API BioCollect appelle Keycloak Admin API (`findOrCreate` + `execute-actions-email` avec `UPDATE_PASSWORD`)
3. Keycloak envoie l’email de setup du mot de passe (SMTP Keycloak)
4. BioCollect upsert `users` (`openId` = KC `sub`) et ajoute/met à jour `tenantMemberships`

L’email de setup **ne passe pas** par notification-hub.

## Prérequis ops

| Élément | Détail |
|---------|--------|
| SMTP Keycloak | Activé sur le realm / serveur Keycloak (sinon l’invite crée le compte mais `emailSent=false`) |
| Client `biocollect-web` | Redirect URI autorisée : `{APP_PUBLIC_URL}/spaces` (ex. `https://biocollect.optimizesolux.com/spaces`) |
| Secrets app | `KEYCLOAK_ADMIN`, `KEYCLOAK_ADMIN_PASSWORD`, `APP_PUBLIC_URL` (+ `KEYCLOAK_URL` si non dérivé de `OIDC_ISSUER_URI`) |

Variables utiles :

```bash
KEYCLOAK_URL=https://auth.optimizesolux.com
KEYCLOAK_ADMIN=...
KEYCLOAK_ADMIN_PASSWORD=...
KEYCLOAK_ACTIONS_CLIENT_ID=biocollect-web
APP_PUBLIC_URL=https://biocollect.optimizesolux.com
```

Local (`docker compose`) : défauts `admin` / `admin`, `APP_PUBLIC_URL=http://localhost:3000`.

## Smoke test

1. Se connecter comme Administrateur d’un espace
2. Ouvrir `/members`, inviter une adresse e-mail réelle
3. Vérifier réception de l’email Keycloak « Update password »
4. Définir le mot de passe, se connecter → l’espace apparaît dans **Mes espaces**
5. Optionnel : **Renvoyer l’e-mail** si l’utilisateur n’a pas encore finalisé `UPDATE_PASSWORD`

## Notes

- Les rôles invitables sont stockés dans **MySQL** (`tenantMemberships`), pas comme rôles realm Keycloak.
- Impossible de retirer / rétrograder le **dernier** Administrateur de l’espace.
- Voir aussi `deploy/GITHUB-SECRETS-CONTABO.md` pour les secrets CD Contabo.
