# Matrice des exigences — HotKB

Ce document relie chaque exigence numérotée du **cahier des charges** à son état d'implémentation réel dans le dépôt, au moment du **checkpoint #1**. Il est mis à jour au fil des prochaines étapes du projet.

Légende :

| Statut | Signification |
|---|---|
| ✅ Implémenté | Fonctionnel et testé (manuellement et/ou par un test automatisé) |
| 🟡 Partiel | Une partie du comportement existe, le reste reste à faire |
| ⏳ Prévu | Pas commencé — fait partie du gameplay de course, prévu pour un prochain checkpoint |
| ⬜ Hors scope CP1 | Explicitement classé priorité secondaire dans le cahier des charges (section « Priorisation ») |
| ➖ Respecté (négatif) | Exigence qui demande l'*absence* d'une fonctionnalité — respectée par défaut |

## Authentification (AUTH)

| Code | Exigence (résumé) | Statut | Emplacement |
|---|---|---|---|
| AUTH-1 | Compte local (nom d'utilisateur + mot de passe, sans courriel) | ✅ Implémenté | `server/src/routes/auth.ts` (`POST /register`), `server/test/auth.test.ts` |
| AUTH-2 | Authentification externe (Discord/GitHub) | ⬜ Hors scope CP1 | — |
| AUTH-3 | Jouer en invité, sans compte | ✅ Implémenté | `server/src/routes/auth.ts` (`POST /guest`) |
| AUTH-4 | Option « Se souvenir de moi » | ⬜ Hors scope CP1 | — |
| AUTH-5 | Pas de récupération de mot de passe oublié | ➖ Respecté | Aucune route de ce type n'existe |
| AUTH-6 | Photo de profil par défaut (OAuth) | ⬜ Hors scope CP1 | Dépend d'AUTH-2 |
| AUTH-7 | Upload d'une photo de profil | ⏳ Prévu | — |
| AUTH-8 | Fusion des stats invité → compte | ⬜ Hors scope CP1 | — |

## Lobby (LOBBY)

| Code | Exigence (résumé) | Statut | Emplacement |
|---|---|---|---|
| LOBBY-1 | Rejoindre le lobby public le plus peuplé | 🟡 Partiel | Rejoindre par code fonctionne (`room:join`) ; pas encore de matchmaking automatique vers un lobby public |
| LOBBY-2 | Création automatique d'un lobby si aucun disponible | 🟡 Partiel | « Créer une salle » crée et assigne l'hôte (`room:create`) ; pas encore déclenché automatiquement faute de liste publique |
| LOBBY-3 | Liste des courses publiques consultable | ⏳ Prévu | — |
| LOBBY-4 | Course « ouverte » accessible par code, hors liste publique | 🟡 Partiel | Toute salle créée aujourd'hui est accessible par code ; la distinction publique/ouverte suppose LOBBY-3 |
| LOBBY-5 | Course privée par lien d'invitation unique | ⬜ Hors scope CP1 | — |
| LOBBY-6 | Relancer une partie (même lobby) | ⬜ Hors scope CP1 | — |
| LOBBY-7 | Fermer la salle (hôte) | ⬜ Hors scope CP1 | — |

## Déroulement d'une course (COURSE)

| Code | Exigence (résumé) | Statut | Emplacement |
|---|---|---|---|
| COURSE-1 | Minimum 2 participants pour démarrer | ✅ Implémenté | `server/src/rooms/handlers.ts` (`room:start`) |
| COURSE-2 | Limite maximale de participants | ⏳ Prévu | — |
| COURSE-3 | Texte identique affiché à tous | ⏳ Prévu | — |
| COURSE-4 | Classement temps réel | ⏳ Prévu | — |
| COURSE-5 | Indicateur de dépassement | ⏳ Prévu | — |
| COURSE-6 | Durée maximale configurable | ⏳ Prévu | — |
| COURSE-7 | Texte d'au moins 3 lignes | ⏳ Prévu | — |
| COURSE-8 | Tolérance à la déconnexion réseau | ⏳ Prévu | Partiellement couvert côté lobby (réassignation d'hôte à la déconnexion), pas encore côté course |
| COURSE-9 | Détection d'inactivité (AFK) | ⏳ Prévu | — |
| COURSE-10 | Abandon volontaire → spectateur | ⏳ Prévu | — |
| COURSE-11 | Déconnexion via bouton dédié | 🟡 Partiel | « Quitter » existe dans le lobby (`room:leave`), pas encore en course |
| COURSE-12 | Podium + statistiques de fin de course | ⏳ Prévu | — |

## Options de l'hôte (HOST) et bots/bonus (GAMEPLAY)

| Code | Exigence (résumé) | Statut |
|---|---|---|
| HOST-1 à HOST-9 | Configuration du texte, des erreurs, des bots, de la durée | ⏳ Prévu (gameplay de course) |
| GAMEPLAY-1, GAMEPLAY-2 | Difficulté des bots, bonus/malus | ⏳ Prévu (gameplay de course) |

## Statistiques (STATS)

| Code | Exigence (résumé) | Statut |
|---|---|---|
| STATS-1 à STATS-4 | Meilleurs scores, carte de chaleur des erreurs, stats invité, stats de fin de course | ⏳ Prévu (gameplay de course) |

## Langue et interface (I18N, UI)

| Code | Exigence (résumé) | Statut | Emplacement |
|---|---|---|---|
| I18N-1 | Site bilingue FR/EN avec bouton de bascule | ✅ Implémenté | `client/src/lib/i18n.tsx`, `client/src/components/TopBar.tsx` |
| I18N-2 | Rejoindre une course dans une autre langue que l'interface | ⏳ Prévu | Dépend des textes de course (HOST-1) |
| UI-1 | Identité visuelle originale (nom, logo, style) | ✅ Implémenté | Artefact « Identité HotKB » (logo flamme + touches, palette, typographies) |
| UI-2 | Interface « parlante » (attrayante, retient l'utilisateur) | ✅ Implémenté | Palette chaude, Baloo 2/Inter/JetBrains Mono, micro-interactions (boutons, badges, mise à jour temps réel du lobby) |
| UI-3 | Thème clair et thème sombre | ✅ Implémenté | `client/src/lib/theme.tsx` (bouton 🌙/☀️, détection système + choix manuel persisté) |
| UI-4 | Consultable sur tablette/téléphone | 🟡 Partiel | Mise en page responsive (Tailwind `flex`/`sm:`) ; non testé sur appareil physique |

## Exigences techniques (TECH)

| Code | Exigence (résumé) | Statut | Emplacement |
|---|---|---|---|
| TECH-1 | Frontend React + TypeScript | ✅ Implémenté | `client/` |
| TECH-2 | Tailwind CSS | ✅ Implémenté | `client/src/index.css`, `@tailwindcss/vite` |
| TECH-3 | PostgreSQL | ✅ Implémenté | `server/migrations/001_init.sql` |
| TECH-4 | Choix libre des outils backend | ➖ Respecté | Express + Socket.IO, justifié dans l'ADR-001 (artefact « Architecture HotKB ») |
| TECH-5 | Serveur exposé exclusivement en HTTPS | ✅ Implémenté | Déploiement Render (`https://hotkb.onrender.com`) |
| TECH-6 | Hébergement sur services gratuits uniquement | ✅ Implémenté | Render plan *free* (service web + PostgreSQL), voir `render.yaml` |
| TECH-7 | Tests unitaires + bout en bout, automatisés | ✅ Implémenté | `server/test/` (Vitest + Supertest), `client/test/` (Vitest + Testing Library), exécutés en CI (`.github/workflows/ci.yml`) |
| TECH-8 | Code sur GitHub + documentation technique | ✅ Implémenté | [github.com/Exynoes/hotKB](https://github.com/Exynoes/hotKB), `README.md`, artefacts « Direction artistique » et « Architecture », ce document |

## Résumé pour le checkpoint #1

Le checkpoint #1 porte spécifiquement sur l'authentification, le lobby temps réel et le déploiement — pas encore sur le déroulement complet d'une course. Sur ce périmètre :

- **Entièrement couvert** : AUTH-1, AUTH-3, COURSE-1, I18N-1, UI-1, UI-2, UI-3, TECH-1 à TECH-8.
- **Partiellement couvert** : LOBBY-1, LOBBY-2, LOBBY-4 (la mécanique « créer/rejoindre par code » fonctionne ; la couche de découverte publique des lobbies reste à construire), UI-4, COURSE-11.
- **Prévu pour la suite** : le reste des exigences COURSE/HOST/GAMEPLAY/STATS, qui constituent le gameplay de course à proprement parler.
