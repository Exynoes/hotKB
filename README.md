# HotKB 🔥

Des courses de dactylographie brûlantes, en temps réel, pour les élèves du primaire et du secondaire — comme un Kahoot, mais pour la vitesse de frappe.

Projet réalisé pour le cours **Web V — Paradigme de programmation fonctionnelle et intégration back-end**.

## Structure du monorepo

```
.
├── client/   # React + TypeScript + Tailwind (Vite)
├── server/   # Node + Express + Socket.IO + PostgreSQL
└── migrations/ (dans server/) # schéma SQL
```

## Démarrage local

### Prérequis

- Node.js 20+
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

### Lancer en développement

Dans deux terminaux séparés :

```bash
npm run dev:server   # API + WebSocket sur :4000
npm run dev:client   # Interface sur :5173
```

Le client redirige automatiquement `/api` et `/socket.io` vers le serveur (voir `client/vite.config.ts`).

## Documentation du projet

- Cahier des charges : voir le document remis séparément.
- Direction artistique / identité : artefact Claude « Identité HotKB ».
- Architecture (modèle de données, machine à états, ADR temps réel) : artefact Claude « Architecture HotKB ».

## Pile technique

- **Frontend** : React, TypeScript, Tailwind CSS, React Router, Socket.IO client
- **Backend** : Node.js, Express, Socket.IO, PostgreSQL (`pg`), JWT, bcrypt
- **Temps réel** : WebSocket via Socket.IO (voir ADR-001 dans la doc d'architecture)
