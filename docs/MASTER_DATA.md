# Référentiels de sélection

BioCollect permet à chaque entité de constituer des **référentiels réutilisables** pour les champs de sélection. Un référentiel appartient strictement à un tenant : il ne peut ni être consulté, ni être associé à un formulaire d’un autre espace. Les administrateurs peuvent le créer manuellement ou l’importer ; les enquêteurs reçoivent dans leur synchronisation une copie des options nécessaires aux formulaires publiés.

| Élément | Règle retenue |
| --- | --- |
| Identité | Un référentiel possède un identifiant interne, un nom lisible et un type unique dans son espace. |
| Option | Chaque option contient un `value` enregistré par le backend et un `label` affiché dans les interfaces. |
| Champ de formulaire | Un champ `multiple choice` utilise soit des options manuelles, soit un `referenceDataSetId`. Le formulaire publié reçoit toujours un instantané normalisé des options. |
| Collecte mobile | L’application affiche `label` et enregistre uniquement `value` dans le brouillon, la file hors ligne et la soumission. |
| Évolution | Toute modification du référentiel prend effet lors de la publication d’une nouvelle version de formulaire. Les formulaires déjà publiés restent reproductibles grâce à leur instantané. |

## Formats acceptés

Les imports acceptent les extensions `.txt`, `.csv`, `.xls` et `.xlsx`. Seule la première feuille d’un classeur est utilisée. Les fichiers sont limités à 5 Mo et à 10 000 options afin de préserver la synchronisation hors ligne. Le fichier d’origine est conservé dans le stockage objet ; la base de données ne conserve que sa clé, ses métadonnées et les options normalisées.

| En-têtes détectés | Interprétation |
| --- | --- |
| `code` ou `value` + `label` ou `name` | La première colonne alimente `value` et la seconde `label`. |
| Deux colonnes sans en-tête reconnu | Première colonne : `value` ; seconde colonne : `label`. |
| Une colonne | Sa valeur est utilisée à la fois pour `value` et `label`. |

Les lignes vides sont ignorées. Les valeurs sont nettoyées, les valeurs métier dupliquées sont refusées, et un import dépourvu d’option exploitable échoue avant toute écriture. Les libellés peuvent être répétés ; les valeurs ne le peuvent pas au sein d’un même référentiel.

Avant le stockage définitif, le back-office envoie le fichier pour **prévisualisation**. La réponse montre le nombre d’options détectées ainsi qu’un échantillon de paires `code` / `libellé` normalisées. Le bouton de confirmation reste désactivé tant que cette prévisualisation n’est pas valide. Cette étape empêche l’enregistrement d’un fichier dont le séparateur, les colonnes ou les valeurs ne correspondent pas au mapping attendu.

## Contrat de champ

```ts
type SelectionOption = {
  value: string;
  label: string;
};

type FormField = {
  id: string;
  label: string;
  type: "text" | "date" | "multiple choice" | "photo";
  required: boolean;
  options?: SelectionOption[];
  referenceDataSetId?: string;
};
```

Les anciens formulaires dont les options sont des chaînes restent supportés : une chaîne est automatiquement normalisée en option `{ value: chaîne, label: chaîne }` au moment de la synchronisation et de l’affichage.

> Un référentiel n’est pas directement relu par l’application de terrain lors d’une saisie. Son instantané dans la version du formulaire garantit que la collecte reste entièrement utilisable hors connexion et auditable dans le temps.
