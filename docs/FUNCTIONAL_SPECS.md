# Spécifications Fonctionnelles : BioCollect

## 1. Parcours Utilisateur Principal (L'Enquêteur)

L'enquêteur de terrain est l'utilisateur final du processus de collecte. Son parcours doit être fluide, guidé et résilient aux coupures réseau.

1.  **Authentification et Synchronisation Initiale** : L'enquêteur se connecte à l'application Android avec ses identifiants. Tant qu'il dispose d'une connexion, il synchronise son appareil pour télécharger les derniers formulaires et la configuration biométrique du projet.
2.  **Saisie des Données Démographiques** : En mode hors-ligne, il ouvre un nouveau formulaire de recensement. Il saisit les informations textuelles (nom, âge, adresse) en suivant les règles de validation et la logique conditionnelle définies par l'administrateur.
3.  **Capture Biométrique** : Le formulaire demande la capture d'empreintes. L'enquêteur branche le scanner USB au téléphone. L'application guide l'utilisateur ("Veuillez poser le pouce droit"). Le système évalue la qualité de l'image (NFIQ) en temps réel. Si la qualité est insuffisante, la capture est refusée et l'enquêteur doit recommencer.
4.  **Finalisation et Chiffrement** : Une fois le formulaire complet, l'enquêteur le valide. Le dossier et les images biométriques sont chiffrés et stockés dans la file d'attente locale de l'appareil.
5.  **Synchronisation vers le Serveur** : De retour dans une zone couverte par le réseau (3G/4G/Wi-Fi), l'enquêteur lance la synchronisation. Les dossiers sont transmis au serveur de manière sécurisée et retirés de la file d'attente locale.

## 2. Cycle de Vie d'un Dossier d'Identité

Le produit gère les données non pas comme de simples soumissions de formulaires, mais comme des dossiers d'identité vivants. Chaque dossier traverse plusieurs statuts stricts :

| Statut | Description | Action Possible |
| :--- | :--- | :--- |
| **Brouillon (Local)** | Le dossier est en cours de saisie ou en attente de synchronisation sur l'appareil de l'enquêteur. | Modification par l'enquêteur. |
| **Synchronisé** | Le dossier a été reçu par le serveur central. Les données textuelles sont stockées. | Consultation par le superviseur. |
| **En Analyse Biométrique** | Le serveur a transmis les empreintes à ScaleBiometrics via le Starter Spring Boot et attend le webhook de résultat. | Aucune (attente système). |
| **Validé** | ScaleBiometrics n'a trouvé aucune correspondance (NO_MATCH). L'identité est unique et officiellement enrôlée. | Exportation, mise à jour ultérieure. |
| **Doublon Suspecté** | ScaleBiometrics a trouvé une correspondance (MATCH). Le dossier est mis en quarantaine. | Résolution par le superviseur. |
| **Rejeté** | Le superviseur a confirmé qu'il s'agit d'une tentative de fraude ou d'un doublon avéré. Le dossier est invalidé. | Archivage. |

## 3. Résolution des Conflits (Interface Superviseur)

La gestion des doublons est une fonctionnalité métier critique. Lorsqu'un dossier passe en "Doublon Suspecté", le superviseur accède à une interface dédiée de résolution des conflits.

Cette interface présente une vue comparative côte à côte :
*   À gauche : Le nouveau dossier collecté (Sonde).
*   À droite : Le dossier existant trouvé dans la base de données (Cible), avec son identifiant unique.
*   Au centre : Le score de similarité biométrique fourni par ScaleBiometrics.

Le superviseur dispose de trois actions :
1.  **Confirmer le Doublon (Rejeter le nouveau)** : Le nouveau dossier est marqué comme "Rejeté".
2.  **Fusionner (Mettre à jour l'ancien)** : Les nouvelles informations démographiques viennent enrichir ou remplacer les données du dossier existant.
3.  **Faux Positif (Forcer la validation)** : Si les données démographiques (ex: sexe, âge) prouvent qu'il s'agit de deux personnes différentes malgré une forte similarité biométrique (ex: jumeaux, erreur de capture), le superviseur force la validation du nouveau dossier. Une trace d'audit enregistre cette décision.

## 4. Configuration Biométrique par Projet

L'administrateur dispose d'une flexibilité totale pour définir les exigences biométriques d'un projet, selon le matériel disponible et le niveau de sécurité requis.

Dans l'interface de création du projet, il peut configurer :
*   **Doigts Obligatoires** : Sélection visuelle des doigts à capturer (ex: Pouce droit et Index droit uniquement).
*   **Doigts Optionnels** : Permet à l'enquêteur d'ignorer un doigt si la personne est amputée ou blessée, en justifiant la raison.
*   **Seuil de Qualité (NFIQ)** : Définition de la note de qualité minimale acceptable par le scanner (de 1 - Excellent à 5 - Inutilisable). Le standard recommandé est 3.
*   **Seuil de Matching (Score)** : Définition du score de similarité à partir duquel ScaleBiometrics doit lever une alerte de doublon.
