# BioCollect

**BioCollect** est une plateforme SaaS de collecte de données de terrain offline-first, conçue nativement pour intégrer la gestion des identités et la biométrie. Elle garantit l'unicité des dossiers collectés (déduplication) même dans des environnements sans connectivité.

Ce dépôt est un **monorepo** contenant l'ensemble des applications et packages nécessaires au fonctionnement de la plateforme.

## 🏗️ Structure du Monorepo

Le projet est organisé de la manière suivante :

```text
BioCollect/
├── apps/
│   ├── mobile/         # Application Android (React Native) pour les enquêteurs terrain
│   ├── web/            # Back-office (React/Next.js) pour les administrateurs et superviseurs
│   └── api/            # Backend Core (Spring Boot/NestJS) gérant les formulaires et la synchro
├── packages/
│   ├── biometric-sdk-bridge/ # Pont natif React Native (Java/Kotlin) pour les scanners (Miaxis, etc.)
│   └── form-engine/    # Moteur de rendu de formulaires partagé entre web et mobile
└── docs/               # Documentation technique et spécifications (PRD, Architecture, etc.)
```

## 🚀 Fonctionnalités Principales

*   **Offline-First** : Collecte de données et capture biométrique sans connexion internet.
*   **Multi-Vendor Biometrics** : Abstraction permettant de supporter plusieurs fabricants de scanners. Le premier fournisseur intégré est **Miaxis** (SM-91M/SM-92M).
*   **Déduplication Automatique** : Intégration native avec **ScaleBiometrics** pour identifier les doublons dès la synchronisation.
*   **Résolution de Conflits** : Interface back-office dédiée pour gérer les cas de doublons suspectés.

## 📚 Documentation

Pour comprendre la vision, l'architecture et les choix techniques, veuillez consulter les documents suivants dans le dossier `docs/` :

*   [PRD (Product Requirements Document)](docs/PRD.md)
*   [Architecture Technique](docs/ARCHITECTURE.md)
*   [Spécifications Fonctionnelles](docs/FUNCTIONAL_SPECS.md)
*   [Spécifications Techniques](docs/TECHNICAL_SPECS.md)
*   [Spécifications Visuelles & UX](docs/VISUAL_SPECS.md)

## 🛠️ Installation et Développement

*(Les instructions de lancement pour chaque application seront ajoutées au fur et à mesure de l'initialisation des sous-projets).*
