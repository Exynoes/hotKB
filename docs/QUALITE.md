# Qualité — mesures et vérifications

## Tests

| Niveau | Outil | Contenu | Résultat |
|---|---|---|---|
| Serveur | Vitest, Supertest, socket.io-client, PostgreSQL réel | Moteur de frappe, bots, bonus, génération de texte, salles, course complète, profil, avatar, auth, OAuth | 80 tests |
| Client | Vitest, Testing Library (jsdom) | Salon et réglages, zone de frappe, résultats, authentification, profil | 16 tests |
| Bout en bout | Playwright (Chromium) | Salle + invité, langue/thème, profil, **course complète contre un bot** | 4 scénarios |

Intégration continue : `.github/workflows/ci.yml` (lint, `tsc --noEmit`, tests client et serveur, build, e2e avec PostgreSQL 16).

## Lighthouse (PERF-01, mesuré en local sur la version de production)

| Page | Performance | Accessibilité | Bonnes pratiques | SEO |
|---|---|---|---|---|
| Accueil `/` | 96 | 96 → corrigé (contrastes) | 96 | 100 |
| Profil `/profile` | 100 | 100 | 96 | 100 |

Les « bonnes pratiques » perdent des points uniquement parce que, dans l'environnement de mesure, le chargement des polices Google Fonts est bloqué (erreur réseau en console) ; ce n'est pas une erreur de l'application. Les mesures sont à refaire sur le site en ligne avant la remise.

## Accessibilité

- Contrastes : texte atténué `#6f564f` sur fond clair (6,2:1) ; boutons à texte blanc sur `#c93a0e` (5,1:1). La couleur flamme `#ff4f1f` reste utilisée pour les éléments décoratifs et grands.
- Zone de frappe focalisable au clavier, bouton « Abandonner » avec confirmation dans la page (pas de boîte de dialogue du navigateur), annonces `role="status"` pour le décompte, les bonus et les records.
- Réglages de salle avec `<label>` ; piste avec `role="progressbar"` par coureur.
- Les animations de fond respectent `prefers-reduced-motion`.

## Sécurité

- Le serveur ne croit jamais la progression du client : il rejoue les frappes (voir `ARCHITECTURE.md`, section 5).
- Actions d'hôte vérifiées côté serveur ; liens d'invitation à usage unique, stockés hachés (SHA-256).
- Téléversement d'avatar : 2 Mo maximum, signature de fichier vérifiée, ré-encodage par `sharp`.
- Mots de passe hachés (bcrypt) ; tentatives de jonction limitées à 10 par minute et par IP.
