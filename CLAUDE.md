# CLAUDE.md — consignes pour l'assistant IA

Projet **HotKB** : course de dactylographie multijoueur en temps réel (cours Web V). L'auteur est un étudiant ; il a conçu le nom, le logo et la direction artistique **sans IA** (DES-01, DES-02). L'IA sert à coder, tester et documenter, sous sa direction.

## Commandes

- `npm install` · `npm run dev` (http://localhost:4000, un seul processus : Next.js + API + Socket.IO)
- `npm run lint` · `npx tsc --noEmit -p client` · `npx tsc --noEmit -p server`
- `npm run test -w server` (PostgreSQL requis, `DATABASE_URL`) · `npm run test -w client`
- `npm run build && npx playwright test` (bout en bout)

## Règles du projet

- TypeScript **strict** partout, aucun `any`, aucun fichier `.js`.
- Le **serveur est l'autorité** : il rejoue les frappes, fixe les temps et le classement. Ne jamais faire confiance à une position envoyée par le client.
- Toute entrée (REST et Socket.IO) est validée par **Zod** (`server/src/schemas.ts`, `server/src/race/settings.ts`).
- Le serveur n'envoie que des **codes d'erreur** pour les salles ; les textes d'interface sont dans `client/src/lib/i18n.tsx` et `i18n-race.ts` (FR et EN, toujours les deux).
- La logique de course (`server/src/race/`) reste **pure** (pas d'entrée/sortie) et déterministe (graine) pour être testée.
- Pas d'emoji comme icônes, pas de composant shadcn ; palette chaude (flamme, braise, miel), variables CSS dans `globals.css`.
- Contrastes WCAG AA : texte blanc sur `--accent-btn`, texte atténué `--muted`.
- Migrations SQL versionnées dans `server/migrations/` ; le schéma Drizzle les reflète. Le seed est idempotent.
- Ne jamais déclarer une exigence « complète » sans test ou vérification (voir `docs/EXIGENCES.md`).
- Ne jamais committer de secret ; variables documentées dans `server/.env.example`.

## Pièges connus

- Un serveur resté sur le port 4000 fausse les tests e2e : le libérer avant (`fuser -k 4000/tcp`).
- Playwright ne tape que les caractères du clavier US : dans les tests de course, désactiver accents et ponctuation.
- Les variables d'environnement du serveur sont lues à l'usage (getters), pas à l'import, pour les tests.
