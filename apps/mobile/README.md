# BioCollect Terrain

Application Expo/React Native destinée aux **Enquêteurs**. Elle comprend l’activation d’une session agent, le téléchargement de projets et formulaires, la collecte offline, des captures biométriques simulées référencées par chemins MinIO, puis une file de synchronisation Pull/Push.

## Démarrage

```bash
pnpm install
pnpm --dir apps/mobile start
```

Renseignez `expo.extra.biocollectApiUrl` dans `app.json` avec l’URL de l’API qui expose le contrat [mobile-sync.v1.md](../../contracts/mobile-sync.v1.md). Les tests de synchronisation et de parcours offline peuvent être lancés avec `pnpm --dir apps/mobile test`.
