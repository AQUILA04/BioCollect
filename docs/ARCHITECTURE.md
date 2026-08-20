# Architecture Technique : BioCollect

## 1. Vue d'Ensemble du Système

BioCollect est conçu selon une architecture distribuée, séparant clairement la logique de collecte de données, le stockage local hors-ligne, et le traitement biométrique lourd. Le système s'articule autour de trois grands composants : l'Application Mobile (Frontend Terrain), le Backend Core (SaaS), et le Moteur Biométrique (ScaleBiometrics).

## 2. Composants de l'Architecture

### 2.1. Application Mobile (Frontend Terrain)
*   **Technologie** : React Native (ou Flutter) pour le développement multiplateforme, avec des modules natifs (Java/Kotlin) pour l'intégration matérielle des scanners d'empreintes via USB OTG.
*   **Base de Données Locale** : SQLite (via WatermelonDB ou Realm) pour un accès ultra-rapide et un stockage persistant hors-ligne des formulaires, des données collectées et des images biométriques chiffrées.
*   **Moteur de Formulaire** : Un moteur de rendu JSON dynamique (similaire à Enketo) capable d'interpréter les règles de logique conditionnelle et de validation localement.
*   **Module Biométrique Local (Multi-Vendor)** : Architecture basée sur des plugins (Factory Pattern) pour supporter plusieurs fabricants de scanners. Le premier fournisseur intégré est **Miaxis** (série SM-91M/SM-92M). Le module abstrait les appels au SDK natif Android de Miaxis pour la capture, l'extraction de templates et le calcul de la qualité NFIQ (NIST Fingerprint Image Quality) en temps réel sur le téléphone, avant même la synchronisation.

### 2.2. Backend Core (BioCollect SaaS)
*   **Technologie** : Spring Boot (Java/Kotlin) ou Node.js (NestJS), offrant une API REST/GraphQL robuste.
*   **Base de Données Principale** : PostgreSQL pour les données relationnelles (Projets, Utilisateurs, Formulaires, Données Démographiques).
*   **Stockage Objets** : MinIO ou AWS S3 pour le stockage sécurisé des images d'empreintes digitales et autres médias (photos, signatures).
*   **File d'Attente** : RabbitMQ ou Redis Pub/Sub pour gérer les pics de synchronisation lorsque de nombreux enquêteurs se reconnectent simultanément.
*   **Frontend Back-office** : React ou Vue.js pour l'interface d'administration (création de formulaires, suivi, résolution des conflits).

### 2.3. Moteur Biométrique (ScaleBiometrics)
*   BioCollect n'implémente pas son propre moteur de matching. Il agit comme un **client** du SaaS ScaleBiometrics.
*   **Intégration** : BioCollect utilise le `scalebiometrics-spring-boot-starter` pour soumettre des requêtes de déduplication (1:N) de manière asynchrone.
*   **Webhook** : BioCollect expose un endpoint sécurisé pour recevoir les résultats de ScaleBiometrics (MATCH / NO_MATCH) et déclencher la mise à jour des statuts des dossiers.

## 3. Flux de Données (Data Flow)

1.  **Création de Projet** : L'administrateur crée un formulaire et définit les règles biométriques dans le Back-office. Le schéma JSON est sauvegardé dans PostgreSQL.
2.  **Synchronisation Descendante** : L'application mobile télécharge le schéma JSON du formulaire et les configurations via l'API REST.
3.  **Collecte Hors-Ligne** : Les données et les empreintes sont capturées et stockées dans la base de données locale (SQLite) de l'appareil.
4.  **Synchronisation Montante** :
    *   L'application mobile pousse le dossier complet vers l'API BioCollect.
    *   L'API BioCollect sauvegarde les données textuelles dans PostgreSQL et les images d'empreintes dans MinIO.
    *   Le dossier passe en statut "Synchronisé".
5.  **Déduplication Asynchrone** :
    *   Le Backend BioCollect envoie une requête `MatchRequest` (avec les images) à ScaleBiometrics.
    *   Le dossier passe en statut "En Analyse Biométrique".
6.  **Résultat et Mise à jour** :
    *   ScaleBiometrics traite la requête et envoie un webhook à BioCollect.
    *   BioCollect analyse le payload :
        *   Si `NO_MATCH` : Le dossier passe en "Validé".
        *   Si `MATCH` : Le dossier passe en "Doublon Suspecté" et une alerte est générée pour le superviseur.

## 4. Sécurité et Conformité

*   **Chiffrement au repos** : La base de données locale sur l'appareil mobile doit être chiffrée (SQLCipher) pour protéger les données en cas de vol du téléphone.
*   **Chiffrement en transit** : Toutes les communications entre l'application mobile, le Backend BioCollect, et ScaleBiometrics se font via HTTPS (TLS 1.3).
*   **Anonymisation** : Lors de l'envoi des requêtes à ScaleBiometrics, BioCollect n'envoie **aucune donnée démographique** (ni nom, ni âge). Il n'envoie qu'un `probeRid` (UUID anonyme) et les images biométriques, garantissant le respect du RGPD et des lois sur la protection de la vie privée.
