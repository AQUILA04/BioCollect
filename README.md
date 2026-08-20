# BioCollect

**BioCollect** est une plateforme de collecte de données terrain orientée identité, conçue pour enregistrer des dossiers hors connexion, associer des empreintes digitales stockées dans MinIO et traiter la déduplication biométrique de façon asynchrone.

## État du MVP

Le MVP met en œuvre la gestion des projets biométriques, la conception de formulaires, la synchronisation protégée, le workflow de dossier, un mock autonome de déduplication, le tableau de supervision et la résolution de conflits. Il inclut également une landing page publique et une isolation multi-tenant : chaque entité possède son propre espace de données. Le rôle global **Superadmin** peut créer et administrer les tenants.

| Zone | Responsabilité | Éléments implémentés |
|---|---|---|
| `apps/web` | Back-office React | Tableau de bord, projets, Form Builder et résolution de conflits |
| `apps/api` | API TypeScript | Schéma Drizzle, RBAC, synchronisation Pull/Push et mock ScaleBiometrics |
| `apps/mobile` | Client terrain React Native | Service offline de file d’attente et de synchronisation indépendant du framework |
| `packages/form-engine` | Logique de formulaires | Évaluation des règles de visibilité conditionnelle |
| `packages/biometric-sdk-bridge` | Abstraction matérielle | Contrat de provider biométrique pour Miaxis et fournisseurs futurs |
| `contracts` | Contrats inter-applications | Contrat de synchronisation versionné |
| `docs/MULTI_TENANCY.md` | Sécurité d’accès | Modèle de tenants, appartenances et règles d’isolation |

## Pré-requis et commandes

Le monorepo nécessite Node.js 22 et pnpm 10. Après avoir cloné le dépôt, l’installation, la vérification statique et la suite de tests s’exécutent depuis la racine.

```bash
pnpm install
pnpm check
pnpm test
pnpm dev
```

La commande `pnpm dev` démarre l’API et son intégration Vite avec le back-office. La commande `pnpm mobile:start` est prévue pour lancer le shell Expo lorsque l’environnement mobile est installé.

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

La migration PostgreSQL de référence est disponible dans `apps/api/db/postgres/0001_biocollect_mvp.sql`. Elle définit les six tables du MVP avec des types ENUM, JSONB, contraintes de qualité et index. Le runtime de prévisualisation utilise la base relationnelle gérée disponible dans l’environnement ; sa migration Drizzle équivalente est placée dans `apps/api/drizzle`.

Le test de la plateforme couvre les transitions interdites, le mock de déduplication, la validation des chemins MinIO, les autorisations de rôles, le pipeline Push complet et les décisions de conflit. La suite Vitest contient actuellement **13 tests**.

Les choix d’architecture complémentaires sont documentés dans [`docs/MONOREPO_IMPLEMENTATION.md`](docs/MONOREPO_IMPLEMENTATION.md), et les spécifications produit d’origine restent disponibles dans le dossier [`docs`](docs).
