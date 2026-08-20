# Multi-tenancy BioCollect

BioCollect isole les données métier par **espace d’entité** (tenant). Une entité est propriétaire de ses projets, formulaires, soumissions, pièces biométriques, indicateurs et conflits. Le tenant n’est jamais une valeur de filtrage exclusivement côté client : chaque procédure métier vérifie l’appartenance et les droits de l’utilisateur sur le serveur.

| Élément | Responsabilité |
|---|---|
| `tenants` | Identité, slug, statut et créateur de l’entité |
| `tenantMemberships` | Lien utilisateur–tenant et rôle local `Administrateur`, `Superviseur` ou `Enquêteur` |
| `projects.tenantId` | Frontière de rattachement des projets et de toutes leurs données dérivées |
| `Superadmin` | Rôle global capable de lister et créer les tenants depuis le back-office |

## Règles d’accès

Un utilisateur authentifié peut créer un espace. Il devient alors **Administrateur** de cet espace. Les procédures `projects`, `forms`, `dashboard`, `conflicts` et `sync` reçoivent obligatoirement `tenantId`, puis vérifient l’appartenance avant toute lecture ou écriture. Le `Superadmin` dispose d’un accès transversal, tout en utilisant les mêmes procédures tenant-aware.

L’ancien contenu est conservé dans l’espace de transition `legacy-tenant`, dont l’existence et l’appartenance initiale sont assurées par la migration `0002_married_microchip.sql`.

## Parcours utilisateur

1. La landing page publique explique le produit et lance la connexion OAuth à la demande.
2. Après connexion, la personne accède à `/spaces`, crée son premier espace ou sélectionne un espace existant.
3. La sélection est mémorisée localement pour l’ergonomie et persistée côté serveur dans `users.activeTenantId`, après vérification d’appartenance.
4. Un `Superadmin` retrouve tous les tenants dans le même écran, peut les créer, les renommer et les activer ou désactiver.

## Validation

Les tests d’intégration vérifient qu’une synchronisation est refusée hors tenant, qu’un conflit ne peut pas traverser deux tenants, et que seules les sessions `Superadmin` peuvent créer des tenants dans le back-office.
