# Spécification Visuelle et UX : BioCollect

## 1. Philosophie de Design
Le design de BioCollect adopte une esthétique **SaaS moderne, fluide et premium**, en rupture totale avec les interfaces datées souvent rencontrées dans les outils gouvernementaux ou de terrain (pas de style Bootstrap 3).
L'interface doit inspirer confiance, robustesse et clarté, tout en minimisant la charge cognitive pour des utilisateurs qui traitent de grands volumes de données.

## 2. Système de Conception (Design System)

### 2.1. Palette de Couleurs (Thème : SaaS Moderne & Confiance)
*   **Couleur Primaire (Action & Focus)** : Bleu Électrique `#2563EB` (Tailwind `blue-600`). Transmet le professionnalisme et la technologie.
*   **Couleur Secondaire (Validation & Succès)** : Vert Émeraude `#10B981` (Tailwind `emerald-500`). Utilisé pour les dossiers "Validés" et les succès de synchronisation.
*   **Couleur d'Alerte (Doublons & Erreurs)** : Rouge Corail `#EF4444` (Tailwind `red-500`). Utilisé pour les "Doublons Suspectés" et les rejets de qualité biométrique.
*   **Fond Principal (Back-office)** : Gris Très Clair `#F8FAFC` (Tailwind `slate-50`).
*   **Surfaces (Cartes & Modales)** : Blanc Pur `#FFFFFF` avec des ombres douces (Tailwind `shadow-sm`).
*   **Texte Principal** : Gris Ardoise Sombre `#0F172A` (Tailwind `slate-900`).
*   **Texte Secondaire** : Gris Ardoise Moyen `#64748B` (Tailwind `slate-500`).

### 2.2. Typographie
*   **Police Principale** : `Inter` ou `Roboto` (sans-serif, géométrique, excellente lisibilité sur écran).
*   **Hiérarchie** :
    *   Titres (H1/H2) : Semi-bold (600), pour structurer clairement les sections.
    *   Corps de texte : Regular (400), taille de base 16px (1rem) pour une lecture confortable.
    *   Labels et Métadonnées : Medium (500), taille 14px (0.875rem), couleur secondaire.

### 2.3. Éléments d'Interface (UI Components)
*   **Boutons** : Coins légèrement arrondis (`rounded-md`), effet de survol subtil (changement de teinte et légère élévation). Pas d'ombres lourdes.
*   **Cartes (Cards)** : Bords arrondis (`rounded-xl`), fond blanc, bordure très fine (`border-slate-200`).
*   **Icônes** : Utilisation d'une bibliothèque vectorielle moderne et épurée comme `Lucide Icons` ou `Phosphor Icons`. Aucune utilisation d'émojis.
*   **Feedback Visuel** : Utilisation de "Toasts" (notifications non bloquantes en bas de l'écran) pour confirmer les actions (ex: "Projet sauvegardé", "Synchronisation terminée").

## 3. Expérience Utilisateur (UX) par Application

### 3.1. Application Mobile (Enquêteur)
*   **Mode Sombre (Dark Mode) par défaut** : Pour économiser la batterie sur le terrain et réduire l'éblouissement en extérieur.
*   **Navigation par Étapes (Wizard)** : Le formulaire de collecte est divisé en écrans simples (1. Démographie -> 2. Photo -> 3. Empreintes -> 4. Validation) plutôt qu'une longue page défilante, réduisant le taux d'erreur.
*   **Capture Biométrique Guidée** :
    *   Animation visuelle montrant quel doigt poser.
    *   Jauge de qualité circulaire (vert = bon, rouge = mauvais) réagissant en temps réel (NFIQ).
    *   Retour haptique (vibration) lors d'une capture réussie.
*   **Indicateur de Synchronisation** : Une icône "Nuage" bien visible dans la barre de navigation indique le nombre de dossiers en attente de synchronisation.

### 3.2. Back-office (Superviseur & Administrateur)
*   **Layout** : Barre de navigation latérale (Sidebar) rétractable à gauche, contenu principal à droite. En-tête (Header) avec recherche globale et profil utilisateur.
*   **Tableau de Bord (Dashboard)** :
    *   Cartes de statistiques en haut (Total Enrôlés, Doublons en attente, Synchronisations du jour).
    *   Graphiques d'évolution temporelle (via Recharts ou Chart.js) au centre.
*   **Vue de Résolution des Conflits (La plus critique)** :
    *   Disposition en 3 colonnes (Split View) : Nouveau Dossier à gauche, Score de similarité au centre, Dossier Existant à droite.
    *   Mise en surbrillance automatique (Highlighting) des différences textuelles entre les deux dossiers pour accélérer la décision du superviseur.
    *   Boutons d'action ("Rejeter", "Fusionner", "Forcer Faux Positif") flottants et toujours visibles (Sticky footer) en bas de l'écran.
*   **Créateur de Formulaire (Form Builder)** : Interface de type "Glisser-Déposer" (Drag & Drop). Panneau des composants à gauche, zone de prévisualisation au centre, panneau des propriétés (logique, validations) à droite.

## 4. Stack Technologique Recommandée (Frontend)
*   **Framework** : React.js (Back-office) et React Native (Mobile).
*   **Style** : Tailwind CSS (pour une implémentation rapide et cohérente du Design System).
*   **Composants UI** : Shadcn UI ou Radix UI (composants non stylés, accessibles et hautement personnalisables).
*   **Gestion d'État** : Zustand ou Redux Toolkit.
