# Product Requirements Document (PRD) : BioCollect SaaS

## 1. Vision et Objectifs
**BioCollect** est une plateforme SaaS de collecte de données de terrain, conçue nativement pour intégrer la gestion des identités et la biométrie (empreintes digitales). Elle combine la flexibilité de conception de formulaires hors-ligne d'outils comme KoboToolbox avec la puissance de déduplication biométrique de ScaleBiometrics.

**L'objectif principal** est de fournir aux ONG, gouvernements et entreprises un outil clé en main pour recenser, identifier et suivre des populations (bénéficiaires, électeurs, patients, clients) en garantissant l'unicité absolue de chaque dossier (un individu = un dossier), même dans des zones sans connectivité.

## 2. Utilisateurs Cibles
*   **Administrateurs de Projet** : Conçoivent les formulaires, définissent les règles de collecte et de biométrie, et gèrent les accès.
*   **Superviseurs / Data Managers** : Suivent la collecte en temps réel, valident les dossiers et gèrent les alertes de doublons (résolution des conflits).
*   **Agents de Terrain (Enquêteurs)** : Utilisent l'application mobile hors-ligne pour interviewer les personnes et capturer leurs empreintes digitales.

## 3. Périmètre du MVP (Minimum Viable Product)

### 3.1. Formulaires et Collecte
*   **Form Builder Visuel** : Création de formulaires dynamiques (texte, dates, choix multiples, photos, logique conditionnelle).
*   **Application Mobile (Android)** : Fonctionnement 100% offline-first. Les données et les empreintes sont stockées localement et chiffrées jusqu'à la synchronisation.
*   **Composant Biométrique Natif Multi-Vendor** : Intégration dans le formulaire d'un champ "Capture d'empreintes" communiquant avec des scanners USB/Bluetooth externes via l'application Android. Le système est conçu pour supporter plusieurs fabricants. Le MVP inclut l'intégration native des scanners **Miaxis** (série SM-91M/SM-92M).

### 3.2. Gestion des Identités et Biométrie
*   **Configuration par Projet** : Choix du nombre d'empreintes à capturer (ex: 2 pouces, ou 10 doigts) et définition du seuil de qualité minimum (NFIQ) requis pour valider la capture.
*   **Intégration ScaleBiometrics** : Envoi asynchrone des empreintes capturées vers le moteur ScaleBiometrics lors de la synchronisation.
*   **Déduplication Automatique** : Réception du webhook de ScaleBiometrics. Si un match est trouvé, le dossier passe en statut "Doublon Suspecté" avec un lien vers le dossier d'origine.

### 3.3. Workflow et Back-office
*   **Tableau de bord de suivi** : Statistiques de collecte par agent, par zone, et état des synchronisations.
*   **Gestion des Doublons** : Interface de résolution des conflits pour les superviseurs (fusionner, rejeter, ou forcer l'acceptation en cas de faux positif).
*   **Statuts de Dossier** : Brouillon (local), Synchronisé, En cours d'analyse biométrique, Validé, Doublon, Rejeté.

## 4. Ce qui est exclu du MVP
*   Reconnaissance faciale et de l'iris (limité aux empreintes pour le MVP).
*   Intégration de scanners biométriques directement dans les navigateurs web (capture uniquement via l'application Android native).
*   Système de paiement ou de distribution de bénéfices (focus sur la collecte et l'identité).

## 5. Mesures de Succès (KPIs)
*   Temps de création d'un projet biométrique (Cible : < 15 minutes).
*   Taux de faux doublons résolus sans intervention technique.
*   Capacité à synchroniser 1000 dossiers (données + images biométriques) en moins de 5 minutes sur une connexion 4G standard.
