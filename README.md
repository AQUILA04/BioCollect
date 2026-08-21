# BioCollect

**BioCollect** est une plateforme de collecte de données terrain orientée identité, conçue pour enregistrer des dossiers hors connexion, associer des empreintes digitales stockées dans MinIO et traiter la déduplication biométrique de façon asynchrone.

## État du MVP

Le MVP met en œuvre la gestion des projets biométriques, la conception de formulaires, la synchronisation protégée, le workflow de dossier, un mock autonome de déduplication, le tableau de supervision et la résolution de conflits. Les interfaces de supervision sont accessibles aux rôles **Administrateur** et **Superviseur**, tandis que les procédures de synchronisation sont réservées au rôle **Enquêteur**.

| Zone | Responsabilité | Éléments implémentés |
|---|---|---|
| `apps/web` | Back-office React | Tableau de bord, projets, Form Builder et résolution de conflits |
| `apps/api` | API TypeScript | Schéma Drizzle, RBAC, synchronisation Pull/Push et mock ScaleBiometrics |
| `apps/mobile` | Client terrain Expo / React Native | Activation agent, sélection de formulaires, collecte offline, captures biométriques simulées, file locale et synchronisation Pull/Push |
| `packages/form-engine` | Logique de formulaires | Évaluation des règles de visibilité conditionnelle |
| `packages/biometric-sdk-bridge` | Abstraction matérielle | Contrat de provider biométrique pour Miaxis et fournisseurs futurs |
| `packages/i18n` | Traductions partagées | Contrat typé, français/anglais, repli français et registre de langues |
| `contracts` | Contrats inter-applications | Contrat de synchronisation versionné |

## Pré-requis et commandes

Le monorepo nécessite Node.js 22 et pnpm 10. Après avoir cloné le dépôt, l’installation, la vérification statique et la suite de tests s’exécutent depuis la racine.

```bash
pnpm install
pnpm check
pnpm test
pnpm dev
```

La commande `pnpm dev` démarre l’API et son intégration Vite avec le back-office. La commande `pnpm mobile:start` démarre le client Expo : utilisez ensuite Expo Go sur appareil ou `w` pour sa prévisualisation web.

## Application mobile terrain

Le client `apps/mobile` met en œuvre le parcours Enquêteur : activation locale par tenant et jeton, téléchargement de projets et formulaires publiés, saisie offline, capture biométrique simulée avec référence `minio://`, file de dossiers persistée localement et reprise Pull/Push. Le protocole HTTP est décrit dans [`contracts/mobile-sync.v1.md`](contracts/mobile-sync.v1.md) et servi par l’API sur `GET /api/mobile/sync/pull` et `POST /api/mobile/sync/push` avec authentification Bearer et contrôle d’appartenance au tenant.

## Modèle métier

Les tables principales sont `Project`, `FormSchema`, `BiometricConfig`, `Submission`, `BiometricAttachment` et `ConflictResolution`. Les images d’empreintes ne sont jamais stockées en base : chaque `BiometricAttachment` ne conserve qu’un chemin `minio://` et les métadonnées de qualité NFIQ.

| Élément | Valeurs et règles |
|---|---|
| Rôles | `Administrateur`, `Superviseur`, `Enquêteur` |
| Statuts de dossier | `DRAFT` → `SYNCED` → `PROCESSING` → `VALIDATED` ou `SUSPECTED_DUPLICATE` → `REJECTED` |
| Actions de conflit | `Rejeter`, `Fusionner`, `Forcer Faux Positif` |
| Contrôle de qualité | Les empreintes soumises doivent respecter les doigts requis, le seuil NFIQ et un chemin MinIO valide |

## Synchronisation et mock de déduplication

Le contrat `contracts/sync.v1.md` décrit les opérations `biocollect.sync.pull` et `biocollect.sync.push`. La procédure Push crée le dossier, le fait progresser vers `SYNCED` puis `PROCESSING`, et déclenche le mock sans dépendance externe. Lorsqu’un dossier `VALIDATED` existe déjà sur le même projet, un chemin MinIO contenant `duplicate` produit un résultat `MATCH` déterministe ; le dossier entrant passe alors à `SUSPECTED_DUPLICATE`. Tous les autres scénarios produisent `NO_MATCH` et passent à `VALIDATED`.

## Base de données et tests

Les migrations Drizzle de l’API sont placées dans `apps/api/drizzle`. Le test de la plateforme couvre les transitions interdites, le mock de déduplication, la validation des chemins MinIO, les autorisations de rôles, le pipeline Push complet et les décisions de conflit. Le client mobile ajoute des scénarios de persistance locale, Pull, Push, rejet et parcours offline complet.

Les choix d’architecture complémentaires sont documentés dans [`docs/MONOREPO_IMPLEMENTATION.md`](docs/MONOREPO_IMPLEMENTATION.md), et les spécifications produit d’origine restent disponibles dans le dossier [`docs`](docs).

## Internationalisation

Le back-office et l’application terrain partagent le package `@biocollect/i18n`. Le français et l’anglais sont disponibles par défaut, avec détection et persistance locale du choix de langue. Le guide [`docs/I18N.md`](docs/I18N.md) détaille le contrat TypeScript, les tests et l’ajout d’une langue.
