# Plan d’implémentation du MVP BioCollect

Le MVP est structuré comme un monorepo pnpm. Le back-office React est situé dans `apps/web`, l’API TypeScript et ses migrations dans `apps/api`, et le client terrain expose un service de synchronisation offline dans `apps/mobile`. Les packages `form-engine` et `biometric-sdk-bridge` isolent les capacités réutilisables.

| Étape | Objectif | Réalisation |
|---|---|---|
| 1 | Établir le socle métier | Rôles, statuts, modèle de données, contrats inter-applications |
| 2 | Construire le pipeline de collecte | Pull/Push, validation MinIO, contrôle NFIQ et mock de déduplication |
| 3 | Construire le back-office | Projets, configuration biométrique, Form Builder, dashboard et conflits |
| 4 | Isoler les capacités mobiles | File offline testable et contrat d’abstraction scanner |
| 5 | Vérifier | Tests unitaires/intégration, compilation et build des applications |

Les scénarios biométriques du MVP n’appellent aucun fournisseur externe. Le mock transmet un résultat `MATCH` lorsqu’un chemin MinIO contenant `duplicate` est synchronisé alors qu’une référence `VALIDATED` existe pour le projet ; il transmet sinon `NO_MATCH`. Cette règle est déterministe et testable.

Les vérifications sont décrites dans le README racine. Les commandes `pnpm check`, `pnpm test` et `pnpm build` constituent la boucle de validation principale.
