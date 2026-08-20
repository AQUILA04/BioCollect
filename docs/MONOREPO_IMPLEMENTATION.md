# Alignement de l’implémentation avec le monorepo

Le monorepo est désormais la structure de référence de BioCollect. `apps/web` contient le back-office React, `apps/api` contient le serveur TypeScript, le schéma Drizzle et les procédures tRPC, tandis que `apps/mobile` contient les services partagés du client React Native destinés à la synchronisation hors ligne. Les composants transverses se trouvent dans `packages/form-engine` et `packages/biometric-sdk-bridge`.

| Répertoire | Responsabilité | État du MVP |
|---|---|---|
| `apps/web` | Back-office des Administrateur et Superviseur | Front-end React initialisé ; écrans métier en cours |
| `apps/api` | Données, RBAC, synchronisation et mock de déduplication | Socle serveur et migrations présents |
| `apps/mobile` | File offline et synchronisation de l’Enquêteur | Service de synchronisation indépendant du framework présent |
| `packages/form-engine` | Visibilité conditionnelle des champs | Moteur initial présent |
| `packages/biometric-sdk-bridge` | Contrat d’abstraction scanner | Interface provider présente |
| `contracts` | Contrats entre clients et API | Contrat de synchronisation v1 présent |

Le runtime de développement géré reste utilisé pour prévisualiser l’application pendant la construction, mais les sources applicatives sont rangées selon l’architecture monorepo documentée. Toute évolution de fonctionnalité doit modifier le dossier responsable et, si nécessaire, le contrat correspondant.
