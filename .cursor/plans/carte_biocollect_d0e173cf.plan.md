---
name: Carte BioCollect
overview: Ajouter BioCollect comme produit disponible sur le site corporate OptimizeSolux, avec un positionnement terrain (collecte type Kobo + biométrie / déduplication), sans exposer le multi-tenant.
todos:
  - id: app-card
    content: Ajouter app-card BioCollect + JSON-LD + lien footer dans index.html
    status: completed
  - id: dns-doc
    content: Documenter biocollect dans docs/DNS-CONVENTION.md
    status: completed
isProject: false
---

# Carte produit BioCollect sur optimizesolux-web

## Positionnement (copy)

Angle : **collecte de données terrain** (réf. mentale KoboToolbox) **+ biométrie** pour fiabiliser identité et dossiers via déduplication — pas « plateforme multi-tenant ».

- **Titre** : BioCollect  
- **Description** : Collecte de données sur le terrain, même hors connexion, avec biométrie intégrée et déduplication pour garantir des identités et dossiers fiables lors d’enquêtes qui l’exigent.  
- **Tags** : Terrain · Offline · Biométrie · Déduplication  
- **Lien** : [https://biocollect.optimizesolux.com](https://biocollect.optimizesolux.com)  
- Pas de mention multi-tenant / espaces d’entité ; parler de collecte **sécurisée** si besoin.

## Fichiers

### 1. [`index.html`](index.html) — section `#solutions`

Ajouter une `app-card` (même structure que Elykia/BCMS/eHealth) après eHealth dans `.apps-stack` :

- `href="https://biocollect.optimizesolux.com"` (+ `target="_blank"` / `rel` comme CleanTrackPro si cohérent ; aligner sur les cartes voisines)
- Pill « Disponible », domaine `biocollect.optimizesolux.com`
- Copy ci-dessus + CTA « Visiter le site produit »

### 2. [`index.html`](index.html) — JSON-LD

Ajouter une `Offer` / `SoftwareApplication` BioCollect avec `url` et une description alignée (terrain + biométrie + déduplication, sans multi-tenant).

### 3. [`index.html`](index.html) — footer Produits

Ajouter le lien BioCollect sous CleanTrackPro / Elykia.

### 4. [`docs/DNS-CONVENTION.md`](docs/DNS-CONVENTION.md)

- Ligne catalogue : BioCollect / `biocollect` / `biocollect.optimizesolux.com` (+ API si le schéma du tableau l’attend)  
- Enregistrement A `biocollect` dans la liste DNS explicite

## Hors scope

- Création DNS / Email Routing Cloudflare (manuel)  
- ScaleBiometrics reste dans la roadmap  
- Commit / deploy sauf demande explicite
