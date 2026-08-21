# Rapport d'Implémentation : Gestion des Campagnes et Équipes Terrain

## 1. Introduction

Dans le cadre du projet **BioCollect**, l'intégration de la gestion des campagnes, de la constitution des équipes et du suivi des synchronisations a été réalisée. Ces fonctionnalités répondent aux exigences opérationnelles pour structurer le travail sur le terrain, où les enquêteurs opèrent souvent en équipe (un opérateur de saisie et des appuis) au sein de sessions de collecte définies.

## 2. Modèle Fonctionnel et Architecture de Données

Le schéma de base de données (Drizzle) a été étendu avec de nouvelles entités pour modéliser cette organisation :

| Entité | Rôle et Responsabilité |
|---|---|
| `campaigns` | Représente une session de collecte sur le terrain, rattachée à un projet. Elle définit une période (date de début et de fin) et un statut (`PLANNED`, `ACTIVE`, `COMPLETED`). |
| `teams` | Regroupe des enquêteurs travaillant ensemble au sein d'une campagne spécifique. |
| `teamMembers` | Associe un utilisateur à une équipe avec un rôle métier : `OPERATOR` (celui qui saisit les données sur la tablette) ou `SUPPORT` (les autres membres aidant au bon déroulement). |
| `syncSessions` | Trace chaque lot de synchronisation poussé par un opérateur. Elle enregistre les volumes (hors ligne, sélectionnés, reçus, en échec) et les succès de déduplication. |

Les règles de gestion strictes ont été implémentées côté API :
- Une équipe doit comporter exactement un `OPERATOR` et un ou deux membres `SUPPORT`.
- Un enquêteur ne peut appartenir qu'à une seule équipe au sein d'une même campagne.
- La synchronisation mobile vérifie que l'agent est bien l'opérateur d'une équipe active pour la campagne concernée.

## 3. Évolutions de l'API et du Back-Office

### 3.1. Nouvelles Routes tRPC

Le routeur principal `biocollect.ts` a été enrichi de trois nouveaux sous-routeurs :
- `campaigns` : Création, listage et modification du statut des campagnes.
- `teams` : Constitution et listage des équipes par campagne.
- `syncSessions` : Consultation des sessions de synchronisation.

### 3.2. Interface Web de Pilotage

Une nouvelle page dédiée au pilotage a été ajoutée au back-office (`apps/web/src/pages/FieldOperations.tsx`) et intégrée au menu de navigation.
Cette interface permet aux administrateurs et superviseurs de :
- Créer et planifier des campagnes pour un projet.
- Activer ou clôturer des campagnes.
- Constituer les équipes terrain en sélectionnant les rôles (opérateur et appui).
- Suivre en temps réel les indicateurs de synchronisation (volumes reçus, échecs, déduplications) par équipe et opérateur.

L'interface respecte les recommandations UI/UX établies, avec une mise en page claire, des badges de statut, et des indicateurs chiffrés (KPIs).

## 4. Évolutions de l'Application Mobile

Le contrat de synchronisation mobile (`contracts/mobile-sync.v1.md`) et l'application cliente (`apps/mobile`) ont été adaptés pour supporter cette nouvelle organisation :

1. **Sélection de Campagne** : L'écran des projets (`projects.tsx`) liste désormais les formulaires en fonction des campagnes actives auxquelles l'opérateur est affecté.
2. **Métadonnées de Collecte** : Lors de la saisie (`collect.tsx`), le `campaignId` est rattaché au dossier hors ligne.
3. **Synchronisation Intelligente** : Le service de synchronisation (`sync-service.ts`) regroupe automatiquement les dossiers par campagne lors du `Push`. Il transmet également le nombre total de dossiers en attente (`totalOffline`) et le nombre sélectionné pour ce lot (`selectedForSync`).
4. **Création de Session** : Côté serveur (`sync.ts`), la réception d'un lot déclenche la création d'une `SyncSession`. Les compteurs de succès, d'échecs et de déduplication sont mis à jour au fur et à mesure du traitement du lot, assurant une traçabilité parfaite.

## 5. Validation et Tests

La suite de tests a été exécutée et validée (`pnpm test`). Les tests d'intégration HTTP (`http-routes.integration.test.ts`) et les tests du service de synchronisation (`sync.test.ts`) ont été mis à jour pour intégrer les nouvelles contraintes de campagne et la création des sessions de synchronisation. L'intégrité du code TypeScript a été confirmée (`pnpm check`).

## 6. Conclusion

L'implémentation couvre l'intégralité du besoin exprimé. Les opérations terrain peuvent désormais être planifiées, structurées en équipes, et suivies de manière granulaire, renforçant ainsi la fiabilité et la traçabilité de la collecte de données biométriques dans BioCollect.
