# Intégration continue et publication GHCR

La pipeline GitHub Actions se trouve dans `.github/workflows/ci.yml`. Elle s’exécute sur les pull requests ciblant `main` ou `develop`, ainsi que sur les branches `main`, `develop` et `release/**`.

| Étape | Commande ou mécanisme | Rôle |
|---|---|---|
| Installation | `pnpm install --frozen-lockfile` | Reproduit exactement le graphe de dépendances verrouillé. |
| Quality gate | `pnpm quality` | Génère les locales, exécute le typage API/mobile, les tests API/mobile, le build de production et l’export web Expo. |
| Publication | `docker/build-push-action` | Construit l’image composite API + back-office puis l’envoie vers GHCR. |
| Audit de sécurité | `pnpm security:audit` | Remonte les vulnérabilités connues de dépendances de production. |

L’image publiée est `ghcr.io/aquila04/biocollect`. Chaque publication reçoit un tag immuable `sha-<commit>` ; `latest` est ajouté sur la branche par défaut et un tag de branche est produit pour les branches de publication. L’application Expo est validée par un export web dans le quality gate, mais ne produit pas d’image d’exécution : son livrable est un client mobile natif. L’image copie aussi les liens `apps/api/node_modules` nécessaires à la résolution des dépendances pnpm au runtime.

## Authentification GHCR

Le workflow utilise uniquement le `GITHUB_TOKEN` éphémère associé à son exécution avec la permission minimale `packages: write`. Aucun PAT ne doit être ajouté au dépôt, aux variables ou au fichier de workflow. Si un PAT a été partagé dans un canal non dédié aux secrets, révoquez-le dans GitHub et émettez-en un nouveau uniquement lorsqu’une intégration externe ne peut pas utiliser `GITHUB_TOKEN`.

## État de l’audit de dépendances

La pipeline expose l’audit de sécurité séparément des quality gates fonctionnels. À la mise en place, l’audit global fait remonter deux alertes haute sévérité dans `image-size`, dépendance transitive de Metro/Expo sans version corrigée publiée. Cette bibliothèque appartient au tooling de bundling mobile et n’est pas présente dans l’image GHCR API + back-office. Le job conserve donc une visibilité explicite sans bloquer la publication de l’image serveur. Dependabot surveille le lockfile chaque semaine ; l’alerte doit être supprimée dès qu’Expo/Metro publie une mise à jour corrective.

## Exécution locale

```bash
pnpm install --frozen-lockfile
pnpm quality
```

Le sandbox ne fournit pas le démon Docker. La construction de l’image est donc validée par le job `publish-ghcr` de GitHub Actions, qui utilise le même `Dockerfile` et publie après les quality gates.

## Protection recommandée des branches

Configurez des règles de protection pour `main`, `develop` et `release/**` : interdire les push directs, exiger une pull request avec revue et rendre obligatoire le contrôle **Quality gates**. Cette règle évite qu’une image GHCR soit publiée sans validation préalable.
