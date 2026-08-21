# Formulaires de collecte à étapes

BioCollect permet de construire un parcours de collecte séquentiel propre à chaque enquête, projet et entité. L’ordre, les titres, les champs et la position des captures biométriques sont inclus dans chaque version publiée du formulaire.

## Configuration dans le Form Builder

L’Administrateur crée au moins une étape de type **champs**, lui donne un intitulé métier puis y affecte les champs de la palette. Les boutons de déplacement déterminent l’ordre de collecte. Une étape biométrique facultative peut être ajoutée une seule fois et placée à n’importe quel endroit du parcours. Elle impose les doigts configurés au niveau du projet et le seuil NFIQ existant.

| Règle | Comportement |
|---|---|
| Étape de champs | Doit contenir au moins un champ avant publication. |
| Affectation | Chaque champ appartient à une seule étape. |
| Ordre | Les ordres sont continus et déterminés par la liste du Form Builder. |
| Biométrie | Une seule étape dédiée est autorisée ; elle peut être absente lorsque le projet ne l’utilise pas dans le parcours. |
| Publication | Toute version conserve son propre tableau `steps`; un nouveau formulaire publié reçoit une nouvelle version. |

## Parcours terrain et brouillons

L’application Expo rend une seule étape à la fois. Les champs obligatoires visibles de cette étape doivent être remplis avant l’activation de **Suivant**. À l’étape biométrique, les doigts exigés par le projet doivent être capturés avant de poursuivre. **Précédent** ne supprime aucune donnée.

À chaque réponse, capture ou changement d’étape, l’application enregistre localement un brouillon contenant les réponses, les pièces jointes et l’identifiant de l’étape courante. Seule la validation de la dernière étape déplace le dossier vers la file de synchronisation. Pull et Push préservent ces brouillons.

## Compatibilité

Les formulaires historiques ne possédant pas de tableau `steps` sont automatiquement exposés au terrain comme une unique étape implicite nommée avec le titre du formulaire. Ainsi, aucune collecte existante ne doit être republiée pour rester utilisable.

## Contrat technique

Une étape stockée dans `FormSchema.steps` possède la forme suivante :

```ts
type FormStep = {
  id: string;
  label: string;
  order: number;
  kind: "fields" | "biometrics";
  fieldIds: string[];
};
```

Le package `@biocollect/form-engine` fournit `normalizeFormSteps`, `fieldsForStep` et `validateFormSteps`. Toute intégration future doit employer ces helpers afin de conserver les mêmes règles de compatibilité et de validation.
