# Matrice de traçabilité des exigences — HotKB

Chaque exigence de l'énoncé (identifiants officiels) avec son **statut honnête**, les fichiers principaux, les tests associés et les notes de choix. Version initiale du **checkpoint #1** ; mise à jour à chaque étape.

Statuts : **complet** · **partiel** · **non fait**. Rien n'est déclaré « complet » sans être fonctionnel et vérifié.

## Choix et ambiguïtés (section 2.2 de l'énoncé)

- **Hébergement (TECH-05)** : Render (plan gratuit, service web + PostgreSQL managé) plutôt qu'un VPS : HTTPS automatique, coût nul (TECH-08). Un seul processus Node.js persistant, comme un VPS, avec les mêmes contraintes (Socket.IO).
- **Next.js (TECH-01)** : Next.js App Router servi par un **serveur personnalisé** qui héberge aussi Express et Socket.IO (Socket.IO exige un processus persistant, voir `ARCHITECTURE.md`, ADR-001).
- **Migrations (TECH-04)** : migrations SQL versionnées (`server/migrations/`), exécutées au démarrage ; Drizzle ORM pour les requêtes typées (`server/src/schema.ts`).
- **Session invité (AUTH-02)** : jeton JWT conservé côté navigateur (localStorage), et non cookie signé.
- **Persistance de la langue (I18N-02)** : localStorage.

## Contraintes techniques

| ID | Statut | Fichiers principaux | Tests | Notes |
|---|---|---|---|---|
| TECH-01 | complet | `client/src/app/`, `server/src/index.ts` | e2e | Next.js 16, App Router, React 19 |
| TECH-02 | complet | `client/tsconfig.json`, `server/tsconfig.json`, `client/.oxlintrc.json` | CI (`tsc --noEmit`) | `strict: true` partout, aucun `.js`/`.jsx`, règle `no-explicit-any` en erreur. Fichiers de config en `.ts`/`.json` |
| TECH-03 | complet | `client/src/app/globals.css`, `client/postcss.config.json` | — | Tailwind CSS v4 |
| TECH-04 | complet | `server/src/schema.ts`, `server/migrations/`, `server/src/seed.ts` | `server/test/seed.test.ts` | Drizzle + migrations versionnées ; seed idempotent : 4 textes (FR/EN), compte `demo`, historique |
| TECH-05 | partiel | `render.yaml` | `/api/health` | En ligne en HTTPS et fonctionnel, mais sur une plateforme (Render), pas un VPS — voir choix ci-dessus |
| TECH-06 | partiel | `server/src/index.ts`, `server/src/rooms/handlers.ts` | e2e (lobby) | WebSocket (Socket.IO) : lobby en temps réel. La progression pendant une course n'existe pas encore |
| TECH-07 | partiel | `server/src/schemas.ts` | `server/test/schemas.test.ts`, `auth.test.ts` | Zod sur toutes les routes d'auth et les messages existants ; à étendre aux futurs messages de course |
| TECH-08 | complet | `render.yaml` | — | Render gratuit ; OAuth Discord/GitHub gratuits |
| TECH-09 | complet | `.github/workflows/ci.yml` | CI verte | Lint, `tsc --noEmit` (client et serveur), tests unitaires, build, e2e |
| TECH-10 | complet | `server/.env.example` | — | Toutes les variables documentées ; aucun secret versionné |

## Identité visuelle et design

| ID | Statut | Fichiers principaux | Tests | Notes |
|---|---|---|---|---|
| DES-01 | complet | `docs/DEMARCHE-CREATIVE.md` | — | Nom « HotKB » trouvé par l'auteur. Liste des noms envisagés et vérification d'originalité : à compléter dans la démarche créative |
| DES-02 | partiel | `docs/demarche-creative/croquis-logo.png`, `client/public/logo.png` | — | Concept et croquis de l'auteur ; la version numérique actuelle doit être refaite par l'auteur à partir du croquis (en cours) |
| DES-03 | partiel | `docs/DEMARCHE-CREATIVE.md` | — | Palette et typographies documentées ; moodboard (3 à 5 références) à fournir par l'auteur |
| DES-04 | partiel | `client/src/components/`, `FlameBackground.tsx` | — | Palette chaude personnalisée, aucun composant shadcn, aucun emoji en guise d'icône. Piste de progression (élément signature) non faite |
| DES-05 | complet | `client/src/app/layout.tsx`, `client/src/lib/theme.tsx` | e2e | Sélecteur, préférence système par défaut, script avant rendu : aucun flash du mauvais thème |
| DES-06 | partiel | `client/src/components/` | vérifié à 360 px (pas de débordement horizontal) | Message « clavier physique » sur mobile à faire avec la course |

## Comptes et profil

| ID | Statut | Fichiers principaux | Tests | Notes |
|---|---|---|---|---|
| AUTH-01 | partiel | `server/src/routes/auth.ts`, `server/src/routes/oauth.ts`, `AuthPanel.tsx` | `auth.test.ts`, `oauth.test.ts`, `AuthPanel.test.tsx`, e2e | Compte local complet. OAuth Discord et GitHub implémentés et testés (réponses des fournisseurs simulées), mais non activés en production tant que les applications OAuth n'ont pas été créées chez les fournisseurs |
| AUTH-02 | partiel | `server/src/routes/auth.ts` | `schemas.test.ts` | Pseudonyme de 3 à 20 caractères ; session par JWT (non par cookie signé) |
| AUTH-03 | partiel | `server/src/rooms/handlers.ts`, `HomeView.tsx` | e2e | Invité refusé à la création de salle (interface et serveur), sans historique persistant. Avatar généré non fait |
| AUTH-04 | non fait | — | — | Téléversement de photo de profil |
| AUTH-05 | non fait | — | — | Modification du pseudonyme |
| AUTH-06 | non fait | — | — | Page de profil et statistiques |

## Salles et visibilité

| ID | Statut | Fichiers principaux | Tests | Notes |
|---|---|---|---|---|
| SALLE-01 | partiel | `server/src/rooms/handlers.ts` | e2e | Création, l'utilisateur devient hôte. Choix participant/spectateur non fait |
| SALLE-02 | complet | `server/src/rooms/code.ts` | `code.test.ts`, e2e | 6 caractères alphanumériques, sans 0/O/1/I/L |
| SALLE-03 | non fait | — | — | Visibilités publique / sur code / privée (aujourd'hui, toute salle est accessible par code) |
| SALLE-04 | non fait | — | — | Liens d'invitation à usage unique |
| SALLE-05 | non fait | — | — | Capacité maximale configurable |
| SALLE-06 | non fait | — | — | Une seule salle à la fois, garantie en base |
| SALLE-07 | non fait | — | — | Expulsion |
| SALLE-08 | partiel | `server/src/rooms/handlers.ts` | — | L'hôte passe au participant restant le plus ancien ; salle supprimée si vide. Pas de distinction connecté/invité ni de fermeture persistée |
| SALLE-09 | partiel | `server/src/rooms/handlers.ts` | — | Refus de rejoindre une course commencée ; l'écran de résultats n'existe pas encore |
| SALLE-10 | complet | `server/src/rooms/rateLimit.ts` | `rateLimit.test.ts` | 10 tentatives par minute et par IP |

## Rejoindre une course

| ID | Statut | Fichiers principaux | Tests | Notes |
|---|---|---|---|---|
| JOIN-01 | complet | `HomeView.tsx`, `handlers.ts` | e2e | Champ de code dès la page d'accueil |
| JOIN-02 | non fait | — | — | Explorateur de salles publiques |
| JOIN-03 | non fait | — | — | Bouton « Faire une course » |

## Configuration de la course (CONF-01 à CONF-12)

| ID | Statut | Notes |
|---|---|---|
| CONF-01 à CONF-12 | non fait | Configuration de l'hôte (temps, langue, type, longueur, complexité, options, erreurs, bonus, bots, visibilité, diffusion en temps réel) — prévu avec le gameplay de course |

## Déroulement d'une course

| ID | Statut | Fichiers principaux | Tests | Notes |
|---|---|---|---|---|
| COURSE-01 | partiel | `server/src/rooms/handlers.ts`, `docs/ARCHITECTURE.md` | — | Machine à états documentée ; implémentés : `EN_ATTENTE` → `EN_COURSE`. `DECOMPTE`, `RESULTATS`, `FERMEE` à faire |
| COURSE-02 | complet | `handlers.ts` | `Lobby.test.tsx`, e2e | Minimum 2 participants, hôte seulement, vérifié côté serveur (les bots n'existent pas encore) |
| COURSE-03 à COURSE-11 | non fait | — | — | Décompte, zone de frappe, piste en temps réel, serveur autoritaire, abandon, déconnexion, fin et classement, relance/fermeture |

## Bots, bonus, résultats, historique

| ID | Statut | Notes |
|---|---|---|
| BOT-01 à BOT-05 | non fait | Approche prévue dans `ARCHITECTURE.md` (moteur côté serveur, déterministe par graine) |
| BONUS-01 à BONUS-04 | non fait | — |
| RES-01 à RES-05 | non fait | Tables `race_result`, `personal_best`, `key_error_stat` déjà créées (migration 001) |
| HIST-01, HIST-02 | non fait | — |

## Internationalisation

| ID | Statut | Fichiers principaux | Tests | Notes |
|---|---|---|---|---|
| I18N-01 | partiel | `client/src/lib/i18n.tsx` | `Lobby.test.tsx`, `AuthPanel.test.tsx`, e2e | Tous les textes de l'interface existante en FR et EN. Les métadonnées de page (titre, description) sont uniquement en français ; messages d'erreur du serveur en français |
| I18N-02 | complet | `TopBar.tsx`, `i18n.tsx` | e2e | Sélecteur sur la page ; choix conservé (localStorage) ; langue du navigateur par défaut |
| I18N-03 | non fait | — | — | Aucune date ni nombre affiché pour l'instant |

## Qualité

| ID | Statut | Fichiers principaux | Tests | Notes |
|---|---|---|---|---|
| TEST-01 | partiel | `server/test/`, `client/test/` | 26 serveur + 10 client | Logique existante couverte ; la logique de course reste à écrire (donc à tester) |
| TEST-02 | partiel | `e2e/lobby.spec.ts`, `playwright.config.ts` | e2e (2 scénarios) | Playwright en CI : lobby, langue, thème. Parcours de course à ajouter |
| TEST-03 | complet | `e2e/lobby.spec.ts` | e2e | Les tests de bout en bout passent par nom d'utilisateur et mot de passe |
| PERF-01 | non fait | — | — | Lighthouse non mesuré |
| PERF-02, PERF-03 | non fait | — | — | Concernent la piste de progression ; stratégie décrite dans l'ADR-001 |
| A11Y-01 | partiel | `globals.css` | — | Palette choisie avec contraste soigné, non mesuré formellement (WCAG AA) |
| A11Y-02 | partiel | `layout.tsx`, `HomeView.tsx` | — | `<main>`, un `<h1>`, `<button>` pour les actions. `<header>`, `<nav>` et `<footer>` à ajouter |
| A11Y-03 | partiel | `AuthPanel.tsx` | — | Boutons étiquetés ; champs de formulaire identifiés par un `placeholder`, pas encore par un `<label>` |
| A11Y-04 | partiel | — | — | Navigation clavier native des éléments ; indicateur de focus personnalisé à faire |
| SEC-01 | complet | `handlers.ts` | — | Démarrage réservé à l'hôte, vérifié côté serveur (autres actions : à venir) |
| SEC-02 | non fait | — | — | Pas de téléversement pour l'instant |
| SEC-03 | complet | `routes/auth.ts` | `auth.test.ts` | bcrypt ; jamais stocké ni journalisé en clair |
