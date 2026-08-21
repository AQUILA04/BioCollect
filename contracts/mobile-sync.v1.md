# Contrat mobile de synchronisation — v1

L’application `apps/mobile` conserve localement les projets, les formulaires publiés et les dossiers à transmettre. Toute requête doit porter l’en-tête `Authorization: Bearer <jeton-agent>`. L’API vérifie que le `tenantId` est accessible à l’agent authentifié et limite le téléchargement aux campagnes **actives** pour lesquelles cet agent est désigné **opérateur de saisie**.

| Flux | Méthode et route | Corps / réponse attendue |
|---|---|---|
| Pull | `GET /api/mobile/sync/pull?tenantId=<id>` | Réponse `{ projects: ProjectSnapshot[], serverTime: number }`. Chaque projet contient la configuration biométrique, les formulaires publiés et `campaigns`, la liste des affectations actives `{ campaignId, campaignName, teamId, teamName }` de l’opérateur. |
| Push | `POST /api/mobile/sync/push` | Corps `{ tenantId, campaignId, totalOffline, selectedForSync, submissions }`. Le lot concerne une seule campagne et un seul projet. Chaque soumission porte aussi le même `campaignId`. Réponse `{ syncSessionId, acceptedSubmissionIds: string[], rejected: { id, reason }[] }`. |

## Session de synchronisation

Le serveur crée une session avant de traiter le lot dès lors que l’agent est l’opérateur de l’équipe active de la campagne. La session mémorise le nombre de dossiers présents hors ligne (`totalOffline`), le nombre effectivement choisi (`selectedForSync`), puis met à jour progressivement le volume réceptionné, le nombre d’échecs et le nombre de déduplications réussies. Une session reçoit le statut `COMPLETED` à la fin du lot ou `FAILED` en cas d’erreur globale.

| Compteur | Signification |
|---|---|
| `receivedCount` | Nombre de dossiers acceptés par l’API et transmis au pipeline biométrique. |
| `failedCount` | Nombre de dossiers rejetés individuellement avec un motif exploitable par l’opérateur. |
| `deduplicationSuccessCount` | Nombre de dossiers pour lesquels le pipeline de déduplication se termine avec le statut `VALIDATED`. |

Les pièces jointes des soumissions sont des références `minioPath` ; le mobile ne transmet pas les octets dans ce contrat. Chaque empreinte comporte également `fingerType` et `nfiqScore`, validés selon le projet. Les photos restent référencées dans les données du formulaire. Une soumission confirmée est supprimée de la file locale ; une soumission rejetée est conservée et son compteur de tentatives augmente afin de permettre une reprise visible à l’agent.
