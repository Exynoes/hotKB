# Matrice de traçabilité des exigences — HotKB

Chaque exigence de l'énoncé (identifiants officiels) avec son **statut honnête**, les fichiers principaux, les tests associés et les notes de choix. Version de la **livraison finale**.

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
| TECH-04 | complet | `server/src/schema.ts`, `server/migrations/`, `server/src/seed.ts` | `server/test/seed.test.ts` | Drizzle + migrations versionnées ; seed idempotent : 13 textes (FR/EN) classés par complexité, compte `demo`, historique |
| TECH-05 | partiel | `render.yaml` | `/api/health` | En ligne en HTTPS et fonctionnel, mais sur une plateforme (Render), pas un VPS — voir choix ci-dessus |
| TECH-06 | complet | `server/src/realtime.ts`, `server/src/rooms/` | `room-flow.test.ts`, e2e | Socket.IO : salle, réglages, piste en direct (~5 mises à jour/s), bonus, résultats |
| TECH-07 | complet | `server/src/schemas.ts`, `server/src/race/settings.ts` | `schemas.test.ts`, `room-flow.test.ts` | Zod sur les routes REST, tous les messages Socket.IO et la configuration de course |
| TECH-08 | complet | `render.yaml` | — | Render gratuit ; OAuth Discord/GitHub gratuits |
| TECH-09 | complet | `.github/workflows/ci.yml` | CI verte | Lint, `tsc --noEmit` (client et serveur), tests unitaires, build, e2e |
| TECH-10 | complet | `server/.env.example` | — | Toutes les variables documentées ; aucun secret versionné |

## Identité visuelle et design

| ID | Statut | Fichiers principaux | Tests | Notes |
|---|---|---|---|---|
| DES-01 | complet | `docs/DEMARCHE-CREATIVE.md` | — | Nom « HotKB » trouvé par l'auteur (patate chaude + clavier chaud + initiales de *keyboard*). Vérification d'originalité faite après coup : « Hot Keyboard » (logiciel de macros Windows) est proche mais d'une autre catégorie ; l'enseignant a confirmé le 6 octobre 2026 (Discord) que le nom est accepté |
| DES-02 | complet | `docs/DEMARCHE-CREATIVE.md`, `docs/demarche-creative/`, `client/public/logo.png` | — | Concept, croquis et assemblage de l'auteur ; flamme issue de la bibliothèque Canva et touches K/B rendues avec l'aide d'un outil d'IA (détaillé dans la démarche créative). L'enseignant a confirmé qu'un croquis de l'auteur suffit |
| DES-03 | partiel | `docs/DEMARCHE-CREATIVE.md` | — | Palette, typographies et moodboard de 4 références documentés ; il reste à ajouter les commentaires personnels de l'auteur sur chaque référence |
| DES-04 | complet | `LiveTrack.tsx`, `RaceTrack.tsx`, `TypingDemo.tsx`, `FlameBackground.tsx` | e2e | Palette chaude personnalisée, aucun composant shadcn, aucun emoji en guise d'icône. Élément signature : la piste de course, animée sur l'accueil et reliée aux vraies courses (`LiveTrack`) |
| DES-05 | complet | `client/src/app/layout.tsx`, `client/src/lib/theme.tsx` | e2e | Sélecteur, préférence système par défaut, script avant rendu : aucun flash du mauvais thème |
| DES-06 | complet | `client/src/components/`, `RaceScreen.tsx` | vérifié à 360 px | Mise en page adaptative ; sur écran tactile, la course affiche un message demandant un clavier |

## Comptes et profil

| ID | Statut | Fichiers principaux | Tests | Notes |
|---|---|---|---|---|
| AUTH-01 | partiel | `routes/auth.ts`, `routes/oauth.ts`, `AuthPanel.tsx` | `auth.test.ts`, `oauth.test.ts`, e2e | Compte local complet. OAuth Discord et GitHub implémentés et testés (réponses simulées), **non activés en production** : les applications OAuth n'ont pas été créées chez les fournisseurs |
| AUTH-02 | complet | `routes/auth.ts` | `schemas.test.ts` | Pseudonyme de 3 à 20 caractères ; session par JWT (pas de cookie signé, voir les choix) |
| AUTH-03 | complet | `rooms/manager.ts`, `HomeView.tsx` | `room-flow.test.ts`, e2e | Invité : peut rejoindre et jouer, ne peut pas créer de salle (interface et serveur) ; résultats stockés pour la course mais pas d'historique d'invité. Avatar : initiale colorée |
| AUTH-04 | complet | `routes/profile.ts`, `routes/avatars.ts`, `ProfileView.tsx` | `profile-edit.test.ts` | Photo ≤ 2 Mo (PNG/JPEG/WebP), contrôle de la signature du fichier, redimensionnée en 256×256 WebP côté serveur, stockée en base |
| AUTH-05 | complet | `routes/profile.ts`, `ProfileView.tsx` | `profile-edit.test.ts` | Nom affiché de 2 à 20 caractères, distinct du nom de connexion ; utilisé dans les salles et résultats |
| AUTH-06 | complet | `routes/profile.ts`, `ProfileView.tsx` | `profile.test.ts`, `ProfileView.test.tsx`, e2e | Meilleur/moyen MPM, précision, courses, victoires, courbe de progression ; les abandons sont exclus des moyennes |

## Salles et visibilité

| ID | Statut | Fichiers principaux | Tests | Notes |
|---|---|---|---|---|
| SALLE-01 | complet | `rooms/manager.ts`, `Lobby.tsx` | `room-flow.test.ts` | Création par un compte (hôte) ; chacun choisit participant ou spectateur |
| SALLE-02 | complet | `rooms/code.ts` | `code.test.ts`, e2e | 6 caractères, sans 0/O/1/I/L |
| SALLE-03 | complet | `race/settings.ts`, `Lobby.tsx` | `room-flow.test.ts` | Publique, sur code, sur invitation |
| SALLE-04 | complet | `rooms/manager.ts`, `JoinView.tsx` | `room-flow.test.ts` | Lien à usage unique, jeton aléatoire de 24 octets, seul son hachage SHA-256 est stocké, lié à la personne et à son IP, révocable |
| SALLE-05 | complet | `race/settings.ts` | `room-flow.test.ts` | Capacité de 2 à 30, vérifiée côté serveur |
| SALLE-06 | complet | `migrations/003_course.sql`, `rooms/manager.ts` | `room-flow.test.ts` | Une seule salle active par personne, garantie par un index unique en base ; un second onglet reprend la même salle |
| SALLE-07 | complet | `rooms/manager.ts` | `room-flow.test.ts` | L'hôte expulse ; un lien utilisé par la personne expulsée est révoqué |
| SALLE-08 | complet | `rooms/manager.ts` | `room-flow.test.ts` | L'hôte passe à la personne connectée présente depuis le plus longtemps ; la salle se ferme sans humain |
| SALLE-09 | complet | `rooms/manager.ts`, `HomeView.tsx` | `room-flow.test.ts` | Entrée refusée pendant une course ; écran de résultats puis rejouer, retour à la salle ou fermeture |
| SALLE-10 | complet | `rooms/rateLimit.ts` | `rateLimit.test.ts` | 10 tentatives par minute et par IP |

## Rejoindre une course

| ID | Statut | Fichiers principaux | Tests | Notes |
|---|---|---|---|---|
| JOIN-01 | complet | `HomeView.tsx` | e2e | Champ de code dès l'accueil |
| JOIN-02 | complet | `Explorer.tsx`, `rooms/manager.ts` | `room-flow.test.ts`, e2e | Salles publiques, mises à jour en direct |
| JOIN-03 | complet | `HomeView.tsx`, `rooms/manager.ts` | `room-flow.test.ts` | « Course rapide » ; message clair s'il n'y a aucune salle |

## Configuration de la course

| ID | Statut | Notes |
|---|---|---|
| CONF-01 à CONF-12 | complet | Temps, langue du texte, type (cohérent/aléatoire), nombre de mots, complexité, options (ponctuation, chiffres, majuscules, accents), caractères inclus/exclus, mode d'erreur, bonus, bots, visibilité ; modifiable par l'hôte seul et diffusé en direct (`SettingsPanel` dans `Lobby.tsx`, validation Zod dans `race/settings.ts`). Le corpus compte 13 passages classés automatiquement (facile, moyen, difficile dans chaque langue sauf le français facile) ; si aucun passage ne correspond, un autre passage de la langue est choisi. Les passages sont du domaine public, sauf deux phrases anglaises difficiles rédigées pour le projet |

## Déroulement d'une course

| ID | Statut | Fichiers principaux | Tests | Notes |
|---|---|---|---|---|
| COURSE-01 | complet | `rooms/manager.ts`, `docs/ARCHITECTURE.md` | `room-flow.test.ts` | `EN_ATTENTE` → `DECOMPTE` → `EN_COURSE` → `RESULTATS` → `FERMEE` |
| COURSE-02 | complet | `rooms/manager.ts`, `Lobby.tsx` | `room-flow.test.ts`, `Lobby.test.tsx` | Au moins deux coureurs (bots compris), hôte seulement |
| COURSE-03 | complet | `rooms/manager.ts`, `RaceScreen.tsx` | `room-flow.test.ts` | Décompte synchronisé sur l'horloge du serveur ; le texte n'arrive qu'avec le décompte ; frappes avant le départ ignorées |
| COURSE-04 | complet | `RaceScreen.tsx` | `RaceScreen.test.tsx`, e2e | Lettres validées, courantes, fautives colorées (inspiré de Monkeytype) |
| COURSE-05 | complet | `RaceScreen.tsx`, `LiveTrack.tsx` | `room-flow.test.ts` | Spectateurs : piste sans texte |
| COURSE-06 | complet | `race/engine.ts` | `race-engine.test.ts`, `room-flow.test.ts` | Le serveur rejoue les frappes contre le texte et plafonne la vitesse (25 frappes/s) : la progression envoyée par le client n'est jamais crue |
| COURSE-07 | complet | `rooms/manager.ts`, `RaceScreen.tsx` | `room-flow.test.ts` | Abandon avec confirmation dans la page |
| COURSE-08 | complet | `rooms/manager.ts` | `room-flow.test.ts` | Déconnexion de plus de 30 s = abandon ; retour rapide = reprise |
| COURSE-09 | complet | `rooms/manager.ts` | `room-flow.test.ts` | Fin quand tous ont fini ou à la fin du temps ; la course se termine dès que plus aucun humain ne court (les bots encore en route sont classés selon leur progression) |
| COURSE-10 | complet | `race/engine.ts` | `race-engine.test.ts` | Terminés (par temps), puis temps écoulé (par progression), puis abandons |
| COURSE-11 | complet | `rooms/manager.ts`, `HomeView.tsx` | `room-flow.test.ts` | Rejouer, retour à la salle, fermer |

## Bots, bonus, résultats, historique

| ID | Statut | Fichiers principaux | Tests | Notes |
|---|---|---|---|---|
| BOT-01 à BOT-05 | complet | `race/bots.ts` | `race-bots.test.ts`, e2e | Cinq niveaux (de 10–20 à 140–170 MPM), erreurs réalistes, ajout/retrait par l'hôte, simulation déterministe par graine côté serveur |
| BONUS-01 à BONUS-04 | complet | `race/bonus.ts`, `RaceScreen.tsx` | `race-bonus.test.ts` | Bonus de remontée à 25/50/75 % pour les coureurs en retard : −3 mots, +3 mots ou brouillard ; maximum 3 par bénéficiaire ; annonce visible |
| RES-01 à RES-05 | complet | `ResultsView.tsx`, `rooms/persist.ts` | `ResultsView` dans `RaceScreen.test.tsx`, `room-flow.test.ts`, e2e | Podium, tableau (MPM net/brut, précision, erreurs, temps), courbe de MPM, clavier des touches ratées, badge de record personnel (calculé à partir de l'historique) |
| HIST-01 | complet | `routes/profile.ts`, `ProfileView.tsx` | `profile.test.ts` | Historique paginé |
| HIST-02 | complet | `routes/races.ts`, `ResultsPage.tsx` | `room-flow.test.ts` | Détail d'une course, réservé aux participants (404 sinon) |

## Internationalisation

| ID | Statut | Fichiers principaux | Tests | Notes |
|---|---|---|---|---|
| I18N-01 | complet | `lib/i18n.tsx`, `lib/i18n-race.ts` | `Lobby.test.tsx`, e2e | Interface entièrement FR/EN ; le serveur n'envoie que des codes d'erreur pour les salles, traduits côté client. Les messages d'erreur des routes REST (le serveur répond en français) sont traduits côté client (`api-message.ts`). Les métadonnées de page (titre, description) restent en français |
| I18N-02 | complet | `TopBar.tsx`, `i18n.tsx` | e2e | Sélecteur, mémorisé, langue du navigateur par défaut |
| I18N-03 | partiel | `ProfileView.tsx` | — | Dates formatées selon la langue ; les nombres décimaux ne sont pas localisés |

## Qualité

| ID | Statut | Fichiers principaux | Tests | Notes |
|---|---|---|---|---|
| TEST-01 | complet | `server/test/`, `client/test/` | 83 serveur + 19 client | Moteur de frappe, bots, bonus, textes, salles, profil |
| TEST-02 | complet | `e2e/`, `playwright.config.ts` | e2e (4 scénarios) | Lobby, langue/thème, profil, course complète contre un bot |
| TEST-03 | complet | `e2e/` | e2e | Connexion par nom d'utilisateur et mot de passe |
| PERF-01 | complet | — | Lighthouse | Mesuré sur le site en ligne (Chrome, navigation privée, Desktop) : Performance 91 à 100, Accessibilité 100, Bonnes pratiques 100, SEO 100. En Mobile avant optimisation : Performance 83 ; logo allégé et polices non bloquantes ajoutés depuis. Détail dans `docs/QUALITE.md` |
| PERF-02 | complet | `rooms/manager.ts` | `room-flow.test.ts` | Frappes groupées (≈ 12 messages/s au plus), diffusion de la piste ≈ 5 fois/s, jamais une émission par frappe |
| PERF-03 | complet | `LiveTrack.tsx` | — | Transition CSS de 200 ms entre deux mesures, aucune mise à jour par image |
| A11Y-01 | complet | `globals.css` | Lighthouse | Contrastes WCAG AA (`--accent-btn`, `--muted`) ; audit d'accessibilité Lighthouse à 100 sur le site en ligne |
| A11Y-02 | complet | `layout.tsx`, `HomeView.tsx`, `TopBar.tsx`, `Footer.tsx` | Lighthouse | `<main>`, `<header>`, `<nav>` (étiqueté), `<footer>`, un `<h1>` par page |
| A11Y-03 | complet | `Lobby.tsx`, `AuthPanel.tsx`, `HomeView.tsx` | Lighthouse | Champs avec `<label>` ou `aria-label` ; le `placeholder` n'est qu'un indice en plus |
| A11Y-04 | partiel | — | — | Navigation clavier native ; zone de frappe focalisable (`tabIndex`) |
| SEC-01 | complet | `rooms/manager.ts` | `room-flow.test.ts` | Toutes les actions d'hôte vérifiées côté serveur |
| SEC-02 | complet | `routes/profile.ts` | `profile-edit.test.ts` | Téléversement : taille limitée, signature de fichier, ré-encodage par `sharp` (le fichier d'origine n'est jamais servi) |
| SEC-03 | complet | `routes/auth.ts` | `auth.test.ts` | bcrypt ; jamais stocké ni journalisé en clair |

## Écarts connus (honnêtes)

- Hébergement sur Render (gratuit) et non un VPS ; démarrage à froid d'environ 50 s.
- OAuth non activé en production.
- La table `personal_best` existe mais n'est pas utilisée : les records sont calculés à partir de `race_result`.
- Pas d'historique pour les invités.
