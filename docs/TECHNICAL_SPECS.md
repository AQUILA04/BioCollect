# Spécifications Techniques : BioCollect

## 1. Stack Technologique (Backend & Frontend)

L'architecture de BioCollect repose sur une stack moderne, conçue pour la haute disponibilité et la scalabilité.

| Composant | Technologie | Justification |
| :--- | :--- | :--- |
| **Backend Core** | Spring Boot (Java 21) | Robustesse, intégration native avec le starter ScaleBiometrics, écosystème riche pour les API d'entreprise. |
| **Base de Données Relationnelle** | PostgreSQL 16 | Fiabilité ACID, gestion des JSONB pour les schémas de formulaires dynamiques. |
| **Stockage Objets (S3)** | MinIO | Stockage performant et auto-hébergeable pour les millions d'images biométriques. |
| **File de Synchronisation** | RabbitMQ | Gestion de la montée en charge lors de la synchronisation simultanée de milliers d'appareils hors-ligne. |
| **Application Mobile** | React Native | Codebase unique (iOS/Android), écosystème riche, capacité à intégrer des modules natifs (Java) pour les SDK des scanners d'empreintes. |
| **Base de Données Mobile** | WatermelonDB | Optimisée pour React Native, gère la synchronisation asynchrone et les grands volumes de données hors-ligne. |
| **Back-office Web** | React (Next.js) + Tailwind CSS | Interface réactive, composants modernes (Shadcn UI), rendu côté serveur (SSR) pour les performances. |

## 2. Modèle de Données (Schéma Logique)

Le modèle de données sépare la définition des formulaires (schéma) des données collectées (instances).

1.  **Table `Project`** : Contient les métadonnées du projet (nom, description, date de fin).
2.  **Table `FormSchema`** : Stocke la définition du formulaire au format JSON (questions, types, logique conditionnelle). Lié à un projet.
3.  **Table `BiometricConfig`** : Stocke les règles de capture (doigts requis, seuil NFIQ minimum, seuil de matching). Lié à un projet.
4.  **Table `Submission` (Le Dossier)** :
    *   `id` (UUID) : Identifiant unique de la soumission.
    *   `project_id` (FK) : Lien vers le projet.
    *   `data` (JSONB) : Les réponses textuelles au formulaire.
    *   `status` (Enum) : SYNCED, PROCESSING, VALIDATED, SUSPECTED_DUPLICATE, REJECTED.
    *   `created_at`, `updated_at`.
5.  **Table `BiometricAttachment`** :
    *   `id` (UUID).
    *   `submission_id` (FK).
    *   `finger_type` (Enum : RIGHT_THUMB, LEFT_INDEX, etc.).
    *   `image_path` (String) : Chemin vers l'image dans MinIO.
    *   `nfiq_score` (Integer) : Qualité calculée lors de la capture.
6.  **Table `ConflictResolution`** : Historique des décisions des superviseurs sur les doublons (qui a fusionné/rejeté, quand, et pourquoi).

## 3. Intégration Biométrique (Le Module Mobile)

La complexité technique principale réside dans l'application mobile, qui doit dialoguer avec des périphériques USB.

*   **Architecture du Bridge Multi-Vendor (React Native)** : Un pont (Bridge) Java/Kotlin est conçu autour d'une interface `BiometricScannerProvider`. Cela permet d'encapsuler dynamiquement les SDK C/Java fournis par les différents fabricants sans modifier le code React Native.
*   **Intégration Miaxis (Premier Provider)** : L'implémentation initiale utilise le SDK Android Miaxis Justouch (pour les scanners optiques SM-91M/SM-92M via USB OTG).
*   **Processus de Capture Abstrait** :
    1.  L'application React Native demande l'accès à l'USB (Android `UsbManager`).
    2.  Le Bridge détecte le modèle branché (ex: VID/PID de Miaxis) et instancie le provider correspondant (`MiaxisScannerProvider`).
    3.  Appel de la fonction de capture via l'interface unifiée.
    4.  Le SDK natif Miaxis capture l'image brute (RAW/WSQ).
    5.  Le SDK calcule le score NFIQ (1 à 5).
    6.  Le Bridge renvoie l'image encodée en Base64 et le score NFIQ au thread JavaScript (React Native).
    7.  Si le score NFIQ est supérieur au seuil configuré dans la table `BiometricConfig`, la capture est validée et stockée dans WatermelonDB. Sinon, le processus reprend.

## 4. Protocole de Synchronisation (Offline-First)

Le protocole de synchronisation garantit qu'aucune donnée n'est perdue en cas de coupure réseau.

1.  **Pull (Descendant)** : L'application mobile interroge l'API (`GET /api/sync/pull?last_sync=timestamp`) pour récupérer les nouveaux formulaires et configurations.
2.  **Push (Montant)** :
    *   L'application lit les soumissions locales non synchronisées.
    *   Pour chaque soumission, elle envoie d'abord les images biométriques vers MinIO via des URLs présignées (Presigned URLs) pour décharger le backend.
    *   Une fois les images uploadées, elle envoie le JSON de la soumission (`POST /api/sync/push`) contenant les chemins MinIO.
    *   Le backend valide la transaction, sauvegarde en base de données, et retourne un succès.
    *   L'application mobile marque la soumission comme "Synchronisée" et supprime les images lourdes de l'espace de stockage local pour libérer de la place.

## 5. Intégration ScaleBiometrics (Le Backend)

Une fois la soumission reçue, le backend BioCollect orchestre la déduplication.

1.  **Déclenchement** : Un écouteur d'événements (Event Listener) détecte la nouvelle soumission.
2.  **Préparation de la requête** : Le backend récupère les images depuis MinIO.
3.  **Appel du Starter** : Il utilise le bean `ScaleBiometricsClient` (fourni par le starter Maven) pour appeler `submitMatch1NMultipart()`.
4.  **Attente (Webhook)** : La soumission passe en statut `PROCESSING`.
5.  **Réception du Résultat** : Le contrôleur webhook (fourni par le starter) reçoit le résultat. Le service BioCollect implémente `ScaleBiometricsWebhookHandler` pour traiter ce résultat :
    *   Si `match == false` : `status = VALIDATED`.
    *   Si `match == true` : `status = SUSPECTED_DUPLICATE`, enregistrement du `targetRid` en conflit, et émission d'une notification WebSocket vers le back-office pour alerter les superviseurs en temps réel.
