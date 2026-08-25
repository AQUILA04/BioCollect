# TODO — Onboarding post-création d’espace

**Statut :** reporté (hors itération Keycloak / Google SSO).

Après `tenants.create`, l’utilisateur arrive sur `/app` avec un espace vide. Prévoir un **wizard post-création** (3–4 étapes) :

1. Créer un premier **projet**
2. Créer un **formulaire** minimal (ou modèle)
3. (Optionnel) Créer une **équipe** terrain
4. Terminer → dashboard du projet

Ne pas bloquer le flow actuel (auth → `/spaces` → create → `/app`) en attendant ce wizard.
