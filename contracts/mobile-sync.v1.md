# Contrat mobile de synchronisation — v1

L’application `apps/mobile` conserve les projets, formulaires et dossiers localement. Les requêtes vers l’API doivent porter l’en-tête `Authorization: Bearer <jeton-agent>` et l’API doit vérifier que le `tenantId` appartient à l’agent authentifié.

| Flux | Méthode et route | Corps / réponse attendue |
|---|---|---|
| Pull | `GET /api/mobile/sync/pull?tenantId=<id>` | Réponse `{ projects: ProjectSnapshot[], serverTime: number }`. Chaque projet comprend sa configuration biométrique et les formulaires publiés. |
| Push | `POST /api/mobile/sync/push` | Corps `{ tenantId, submissions }`. Réponse `{ acceptedSubmissionIds: string[], rejected: { id, reason }[] }`. |

Les pièces jointes des soumissions sont des références `minioPath` ; le mobile ne transmet pas les octets dans ce contrat. Chaque empreinte comporte aussi `fingerType` et `nfiqScore`, validés selon le projet. Les photos restent référencées dans les données de formulaire. Un dossier confirmé est supprimé de la file locale. Un dossier rejeté est conservé et son compteur de tentatives augmente afin de permettre une reprise explicitement visible à l’agent.
