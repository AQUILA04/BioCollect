# Contrat de synchronisation v1

Le mobile appelle les procédures tRPC exposées sous `/api/trpc`. Le contrat fonctionnel est volontairement isolé pour que l’application mobile, l’API et les tests partagent les mêmes attentes.

| Opération | Procédure | Autorisation | Entrée | Sortie attendue |
|---|---|---|---|---|
| Pull | `biocollect.sync.pull` | Enquêteur | `projectId` | Projet actif, dernier formulaire publié et `BiometricConfig` |
| Push | `biocollect.sync.push` | Enquêteur | Dossier, réponses et chemins `minio://` | Dossier passé automatiquement de `DRAFT` à `SYNCED`, puis à `PROCESSING` et à son résultat de déduplication |
| Webhook simulé | Interne à l’API | Système | Soumission reçue | `MATCH` ou `NO_MATCH`, sans dépendance externe |

Une soumission dont un chemin MinIO contient `duplicate` déclenche un `MATCH` déterministe lorsqu’un dossier `VALIDATED` existe déjà pour le projet. Cette convention fournit un scénario de test reproductible, sans reproduire les images biométriques.
