# HotKB 🔥

Des courses de dactylographie brûlantes, en temps réel, pour les élèves du primaire et du secondaire — comme un Kahoot, mais pour la vitesse de frappe.

Projet réalisé pour le cours **Web V — Paradigme de programmation fonctionnelle et intégration back-end**.

## Structure du monorepo

```
.
├── client/   # Next.js (App Router) + React + TypeScript + Tailwind
├── server/   # Express + Socket.IO + Drizzle ORM + PostgreSQL (héberge aussi Next.js)
│   └── migrations/  # migrations SQL versionnées
```

## Démarrage local

### Prérequis

- Node.js 22+
- PostgreSQL (local ou distant)

### Installation

```bash
npm install
```

### Base de données

1. Crée une base PostgreSQL (ex. `hotkb`).
2. Copie `server/.env.example` vers `server/.env` et renseigne `DATABASE_URL`.
3. Applique le schéma :
   ```bash
   npm run migrate
   ```

### Données de démonstration

```bash
npm run seed   # corpus de textes (FR/EN), compte « demo » / « demo1234 » et historique de courses
```

### Lancer en développement

Un seul processus sert Next.js, l'API REST et Socket.IO (port 4000) :

```bash
npm run dev    # http://localhost:4000
```

### Tests

```bash
npm run test -w server   # Vitest + Supertest (nécessite PostgreSQL, voir ci-dessus)
npm run test -w client   # Vitest + Testing Library
```

Exécutés automatiquement en CI sur chaque push (voir `.github/workflows/ci.yml`).

## Déploiement

Le projet est déployé sur [Render](https://render.com) (plan gratuit) via le Blueprint `render.yaml` : un service web (build client + serveur, HTTPS automatique) et une base PostgreSQL managée. Voir `render.yaml` et l'ADR-001 (doc d'architecture) pour la justification du choix.

En ligne : **https://hotkb.onrender.com**

## Documentation du projet

- Cahier des charges : voir le document remis séparément.
- Direction artistique / identité : artefact Claude « Identité HotKB ».
- Architecture (modèle de données, machine à états, ADR temps réel) : artefact Claude « Architecture HotKB ».
- [Matrice des exigences](docs/matrice-exigences.md) : état d'implémentation de chaque exigence du cahier des charges.

## Pile technique

- **Frontend** : Next.js (App Router), React, TypeScript strict, Tailwind CSS, Socket.IO client
- **Backend** : Node.js, Express, Socket.IO, PostgreSQL avec Drizzle ORM, Zod, JWT, bcrypt, OAuth Discord/GitHub
- **Temps réel** : WebSocket via Socket.IO (voir ADR-001 dans la doc d'architecture)
- **Tests** : Vitest (client + serveur), Supertest, Testing Library
- **CI/CD** : GitHub Actions (lint, tests, build) ; déploiement Render
