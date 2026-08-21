# Sélections hiérarchiques réutilisables

## Objectif

Un espace peut définir un **type de sélection hiérarchique** nommé, par exemple « Géolocalisation ». Ce type est composé de niveaux ordonnés tels que Région, Préfecture, Commune, Canton et Localité. Lorsqu’il est ajouté à un formulaire, un seul champ métier génère en collecte les sélecteurs successifs nécessaires, chaque liste étant filtrée par le choix de son parent.

## Contrat métier

| Élément | Responsabilité |
|---|---|
| `SelectionType` | Décrit un type réutilisable, son nom, sa clé stable et l’ordre de ses niveaux. |
| `SelectionTypeLevel` | Décrit un niveau nommable, comme « Région » ou « Commune ». |
| `SelectionTypeNode` | Porte le code métier, le libellé affiché, le niveau et le parent éventuel. |
| `hierarchical selection` | Nouveau type de champ qui référence un `SelectionType` matérialisé à la publication du formulaire. |
| `HierarchicalSelectionAnswer` | Conserve les nœuds choisis à chaque niveau, avec le nœud feuille final. |

Chaque nœud est isolé par tenant. Le code est persistant et utilisable par les systèmes aval ; le libellé est présenté aux enquêteurs. La relation parent-enfant permet de remonter de la Localité vers ses niveaux précédents sans déductions implicites.

## Modèle de persistance

Les types sont stockés dans une table tenant-scopée `selectionTypes`. Les nœuds sont stockés séparément dans `selectionTypeNodes`, afin de conserver les relations parent-enfant, de limiter la taille des documents JSON et de rendre les recherches de descendants efficaces. La définition de niveaux reste un JSON ordonné dans le type ; les nœuds sont reliés par `selectionTypeId`, `levelId` et `parentNodeId`.

Les formulaires publiés reçoivent un **instantané** de la définition du type. Ainsi, un changement ultérieur dans le référentiel de l’espace ne modifie pas silencieusement les collectes déjà engagées, y compris en mode hors ligne.

## Règles de validation

| Règle | Effet |
|---|---|
| Clé de type unique dans un espace | Empêche les collisions de types personnalisés. |
| Au moins deux niveaux, ordres continus | Garantit une véritable sélection en cascade. |
| Code unique par type et niveau | Assure une valeur métier déterministe. |
| Parent du niveau immédiatement précédent | Empêche les arbres incomplets ou ambigus. |
| Nœud racine uniquement au premier niveau | Garantit le point de départ de la cascade. |
| Tous les niveaux requis avant validation | Évite les réponses hiérarchiques partielles. |

## Parcours utilisateur

Dans **Référentiels**, l’administrateur crée un type, ajoute et nomme ses niveaux, puis ajoute les nœuds avec leur code, leur libellé et leur parent. Dans le Form Builder, chaque type est visible dans la bibliothèque comme un champ personnalisé. Sur le terrain, le premier sélecteur affiche les racines ; chaque sélection révèle et filtre le niveau suivant. La réponse finale enregistre l’ensemble de la chaîne et le nœud feuille.

## Compatibilité

Les champs `multiple choice` existants et leurs référentiels plats restent inchangés. L’éditeur manuel de listes plates évolue uniquement au niveau de l’interface : les options restent stockées sous la forme normalisée `{ value, label }`.
