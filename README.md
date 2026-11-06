# HotKB

Des courses de dactylographie brûlantes, en temps réel, pour les élèves du primaire et du secondaire — comme un Kahoot, mais pour la vitesse de frappe.

Projet réalisé pour le cours **Web V — Paradigme de programmation fonctionnelle et intégration back-end**.

**En ligne : https://hotkb.onrender.com** (plan gratuit : le premier chargement peut prendre environ 50 s, le temps que le serveur se réveille).
**Compte de démonstration** : `demo` / `demo1234` (avec un historique de courses). Un invité peut aussi rejoindre une salle avec un simple nom.

## Ce que fait l'application

1. **Accueil** : jouer en invité, créer un compte (ou se connecter), saisir un code de salle, lancer une **course rapide**, parcourir les **salles publiques**.
2. **Salle d'attente** : code de salle bien visible, liste des joueurs, choix joueur/spectateur, **réglages de l'hôte** (durée, langue du texte, type et longueur, difficulté, ponctuation, chiffres, majuscules, accents, caractères inclus/exclus, mode d'erreur, bonus, visibilité, capacité), **bots** de cinq niveaux, **liens d'invitation** à usage unique, expulsion.
3. **Course** : décompte synchronisé, zone de frappe où les lettres changent de couleur (façon Monkeytype), **piste de course en direct** avec tous les coureurs, bonus de remontée annoncés à l'écran, abandon avec confirmation.
4. **Résultats** : podium, tableau (MPM net et brut, précision, erreurs, temps), courbe de MPM, clavier des touches ratées, badge de record personnel ; l'hôte relance, revient à la salle ou ferme.
5. **Profil** : photo, nom affiché, statistiques, courbe de progression, historique paginé et **détail de chaque course**.
6. Interface **français / anglais**, thème clair / sombre.

## Structure du monorepo

```
.
├── client/   # Next.js (App Router) + React + TypeScript + Tailwind
├── server/   # Express + Socket.IO + Drizzle ORM + PostgreSQL (héberge aussi Next.js)
│   ├── src/race/      # logique pure : frappes, classement, bots, bonus, textes
│   ├── src/rooms/     # salles, protocole Socket.IO, persistance
│   └── migrations/    # migrations SQL versionnées
├── e2e/      # tests Playwright
└── docs/     # démarche créative, architecture, exigences, IA, qualité
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
npm run build && npx playwright test   # bout en bout (Chromium)
```

Exécutés automatiquement en CI sur chaque push (voir `.github/workflows/ci.yml`).

## Déploiement

Le projet est déployé sur [Render](https://render.com) (plan gratuit) via le Blueprint `render.yaml` : un service web (build client + serveur, HTTPS automatique) et une base PostgreSQL managée. Voir `render.yaml` et l'ADR-001 (doc d'architecture) pour la justification du choix.

En ligne : **https://hotkb.onrender.com**

## Documentation du projet

- [Démarche créative](docs/DEMARCHE-CREATIVE.md) : nom, logo, direction artistique (DES-01 à DES-03).
- [Architecture](docs/ARCHITECTURE.md) : modèle de données, machine à états, ADR temps réel, protocole, bots, bonus.
- [Exigences](docs/EXIGENCES.md) : statut honnête de chaque exigence de l'énoncé, avec fichiers et tests.
- [Qualité](docs/QUALITE.md) : tests, Lighthouse, accessibilité, sécurité.
- [Usage de l'IA](docs/IA.md) : comment l'IA a été utilisée, ce qu'elle a mal fait, réflexion.
- [CLAUDE.md](CLAUDE.md) : consignes de travail données à l'assistant IA.

## Pile technique

- **Frontend** : Next.js (App Router), React, TypeScript strict, Tailwind CSS, Socket.IO client
- **Backend** : Node.js, Express, Socket.IO, PostgreSQL avec Drizzle ORM, Zod, JWT, bcrypt, OAuth Discord/GitHub
- **Temps réel** : WebSocket via Socket.IO (voir ADR-001 dans la doc d'architecture)
- **Tests** : Vitest (client + serveur), Supertest, Testing Library, Playwright
- **CI/CD** : GitHub Actions (lint, tests, build) ; déploiement Render
