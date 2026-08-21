# BioCollect Terrain

Application Expo/React Native destinée aux **Enquêteurs**. Elle comprend l’activation d’une session agent, le téléchargement de projets et formulaires, la collecte offline, des captures biométriques simulées référencées par chemins MinIO, puis une file de synchronisation Pull/Push.

## Démarrage

```bash
pnpm install
EXPO_PUBLIC_BIOCOLLECT_API_URL=http://localhost:3000 pnpm mobile:start
```

La variable `EXPO_PUBLIC_BIOCOLLECT_API_URL` est injectée dans la configuration Expo et doit désigner l’API qui expose le contrat [mobile-sync.v1.md](../../contracts/mobile-sync.v1.md). Les tests de synchronisation et de parcours offline peuvent être lancés avec `pnpm --dir apps/mobile test`.
