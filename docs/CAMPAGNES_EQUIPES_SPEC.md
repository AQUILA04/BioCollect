# Spécifications Fonctionnelles : Campagnes, Équipes et Suivi des Synchronisations

## 1. Contexte et Objectifs
Pour piloter efficacement les opérations de collecte sur le terrain dans BioCollect, il est nécessaire de structurer le travail autour de **Campagnes** (ou sessions terrain).
Une campagne s'inscrit dans un projet. Au sein de cette campagne, les enquêteurs sont organisés en **Équipes** (généralement 2 à 3 membres, dont un opérateur de saisie et des superviseurs/support).
Enfin, un **Suivi détaillé des synchronisations** doit être mis en place pour monitorer les remontées de données de chaque opérateur (volumes, succès, échecs, déduplications) et identifier rapidement les équipes rencontrant des difficultés.

## 2. Modèle de Données (Évolutions)

### 2.1. Entité `Campaign` (Campagne)
Représente une session de collecte sur le terrain.
- `id` (PK)
- `projectId` (FK vers `projects`)
- `name` (Nom de la campagne)
- `startDate` (Date de début)
- `endDate` (Date de fin, optionnelle)
- `status` (PLANNED, ACTIVE, COMPLETED)
- `createdAt`, `updatedAt`

### 2.2. Entité `Team` (Équipe)
Représente un groupe d'enquêteurs travaillant ensemble.
- `id` (PK)
- `campaignId` (FK vers `campaigns`)
- `name` (Nom de l'équipe)
- `createdAt`, `updatedAt`

### 2.3. Entité `TeamMember` (Membre d'équipe)
Associe un utilisateur (enquêteur) à une équipe avec un rôle spécifique.
- `id` (PK)
- `teamId` (FK vers `teams`)
- `userId` (FK vers `users`)
- `role` (OPERATOR, SUPPORT)
- `createdAt`

### 2.4. Entité `SyncSession` (Session de Synchronisation)
Trace chaque tentative de synchronisation d'un opérateur.
- `id` (PK)
- `campaignId` (FK vers `campaigns`, optionnel mais recommandé)
- `teamId` (FK vers `teams`, optionnel)
- `operatorId` (FK vers `users`)
- `totalOffline` (Nombre total d'enregistrements en attente sur l'appareil)
- `selectedForSync` (Nombre d'éléments sélectionnés pour cet envoi)
- `receivedCount` (Nombre d'éléments effectivement reçus par le serveur)
- `failedCount` (Nombre d'éléments en échec)
- `deduplicationSuccessCount` (Nombre de succès de déduplication)
- `startedAt`
- `completedAt` (optionnel)
- `status` (IN_PROGRESS, COMPLETED, FAILED)

## 3. Règles de Gestion

1. **Création de Campagne** : Un administrateur ou superviseur peut créer une campagne dans un projet actif.
2. **Constitution des Équipes** : Dans une campagne, on peut créer des équipes et y affecter des enquêteurs. Un enquêteur peut être désigné comme opérateur de saisie (celui qui utilise la tablette).
3. **Traçabilité de la Synchronisation** :
   - Lors de l'appel à `POST /api/mobile/sync/push`, le client mobile doit envoyer des métadonnées supplémentaires : `totalOffline`, `selectedForSync`, `campaignId` (si applicable).
   - L'API crée une `SyncSession` au début du traitement.
   - Au fur et à mesure du traitement des soumissions, l'API met à jour les compteurs `receivedCount`, `failedCount`, et `deduplicationSuccessCount`.
   - À la fin, la session est marquée comme `COMPLETED` (ou `FAILED` si erreur globale).
4. **Tableau de Bord** : Le back-office web doit permettre de visualiser les campagnes, les équipes, et les sessions de synchronisation pour piloter l'opération.

## 4. Impacts Techniques

- **Base de données (Drizzle)** : Création des tables `campaigns`, `teams`, `teamMembers`, `syncSessions`.
- **API (Express/TypeScript)** :
  - Nouvelles routes CRUD pour Campagnes et Équipes.
  - Modification de `pushOne` et `push` dans `apps/api/server/mobile/sync.ts` pour enregistrer la `SyncSession` et mettre à jour les compteurs.
- **Client Mobile (Expo)** :
  - Sélection de la campagne active (ou attribution automatique via le profil de l'enquêteur).
  - Ajout des métadonnées de synchro dans le payload du Push.
- **Back-office (React)** : Nouvelles pages/composants pour la gestion des campagnes, équipes et le monitoring des synchros.
