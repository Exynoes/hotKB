# HotKB — client (Next.js)

Application **Next.js (App Router)** + React + TypeScript (`strict`) + Tailwind CSS v4.

- Pages : `src/app/` (`layout.tsx`, `page.tsx`, `providers.tsx`)
- Composants : `src/components/` — logique partagée : `src/lib/`
- Le client est servi par le processus du dossier `server/` (Next.js + API REST + Socket.IO dans le même processus, voir ADR-001). On ne lance donc pas `next dev` seul : utiliser `npm run dev` à la racine.
- Tests : `npm run test -w client` (Vitest + Testing Library)
