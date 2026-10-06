# Architecture — HotKB

Version initiale pour le checkpoint #1. Les éléments **planifiés** (non encore implémentés) sont signalés ainsi : *(planifié)*. Le suivi exigence par exigence est dans [`EXIGENCES.md`](EXIGENCES.md).

## 1. Vue d'ensemble

```mermaid
flowchart LR
  B[Navigateur<br/>React / Next.js] -- HTTPS --> S
  B -- WebSocket (Socket.IO) --> S
  subgraph S[Un seul processus Node.js — Render]
    N[Next.js App Router<br/>pages et rendu]
    A[Express<br/>API REST /api]
    W[Socket.IO<br/>salles et temps réel]
  end
  S -- Drizzle ORM --> D[(PostgreSQL)]
  S -. OAuth .-> O[Discord / GitHub]
```

- **Un seul processus** (`server/src/index.ts`) sert les pages Next.js, l'API REST et Socket.IO sur le même port et la même origine : pas de CORS en production, un seul service à déployer.
- **État de la salle en direct** : en mémoire (`server/src/rooms/handlers.ts`), car il change à chaque événement. **Persistance** en base pour les salles, participants et (bientôt) résultats et historique.
- **Authentification** : jeton JWT (30 jours) obtenu par compte local, invité ou OAuth ; il est aussi vérifié au *handshake* Socket.IO.
- **Validation** : tous les corps de requête et messages temps réel sont validés par des schémas Zod (`server/src/schemas.ts`).

## 2. Modèle de données

Source de vérité : migrations SQL versionnées (`server/migrations/`), reflétées en TypeScript par le schéma Drizzle (`server/src/schema.ts`).

```mermaid
erDiagram
  USER ||--o{ ROOM : "héberge (host_user_id)"
  USER ||--o{ ROOM_PARTICIPANT : "participe"
  GUEST_SESSION ||--o{ ROOM_PARTICIPANT : "participe"
  ROOM ||--o{ ROOM_PARTICIPANT : "contient"
  ROOM ||--o{ RACE : "enchaîne"
  TEXTE ||--o{ RACE : "utilisé par"
  RACE ||--o{ RACE_RESULT : "produit"
  ROOM_PARTICIPANT ||--o{ RACE_RESULT : "obtient"
  USER ||--o{ PERSONAL_BEST : "conserve"
  USER ||--o{ KEY_ERROR_STAT : "accumule"

  USER {
    uuid id PK
    string username UK
    string password_hash "null si OAuth"
    string auth_provider "local | github | discord"
    string provider_id "identifiant chez le fournisseur"
    string avatar_url
    datetime created_at
  }
  GUEST_SESSION {
    uuid id PK
    string display_name
    uuid merged_into_user_id FK
    datetime created_at
  }
  ROOM {
    uuid id PK
    string code UK "6 caractères"
    string visibility "publique | sur_code | privee"
    uuid host_user_id FK
    string status
    json settings
    datetime created_at
  }
  ROOM_PARTICIPANT {
    uuid id PK
    uuid room_id FK
    uuid user_id FK
    uuid guest_id FK
    bool is_bot
    string bot_difficulty
    bool is_spectator
    datetime joined_at
  }
  TEXTE {
    uuid id PK
    text content
    string language "fr | en"
    int length "en mots"
    bool contains_accents
  }
  RACE {
    uuid id PK
    uuid room_id FK
    uuid texte_id FK
    datetime started_at
    int duration_seconds
    string status
  }
  RACE_RESULT {
    uuid id PK
    uuid race_id FK
    uuid participant_id FK
    float wpm
    float accuracy
    int rank
    int errors_count
  }
  PERSONAL_BEST {
    uuid id PK
    uuid user_id FK
    uuid texte_id FK
    float best_wpm
    int best_time
  }
  KEY_ERROR_STAT {
    uuid id PK
    uuid user_id FK
    string key_char
    int error_count
  }
```

Contrainte clé : un participant est **soit** un utilisateur, **soit** un invité, **soit** un bot (`CHECK one_identity`). *(planifié : contrainte d'unicité « une seule salle active par personne », SALLE-06.)*

## 3. Machine à états d'une course (COURSE-01)

```mermaid
stateDiagram-v2
  [*] --> EN_ATTENTE : création de la salle
  EN_ATTENTE --> EN_ATTENTE : un participant rejoint / quitte
  EN_ATTENTE --> DECOMPTE : l'hôte démarre (≥ 2 participants dont 1 humain)
  DECOMPTE --> EN_COURSE : fin du décompte 3-2-1 (le texte est révélé)
  EN_COURSE --> RESULTATS : tous ont terminé ou abandonné, ou temps maximal écoulé
  RESULTATS --> EN_ATTENTE : l'hôte relance une course
  RESULTATS --> FERMEE : l'hôte ferme la salle
  EN_ATTENTE --> FERMEE : l'hôte ferme / plus aucun humain connecté
  FERMEE --> [*]
```

**Implémenté aujourd'hui** : `EN_ATTENTE`, passage à `EN_COURSE` (avec le minimum de 2 participants, vérifié côté serveur et réservé à l'hôte). *(planifié : `DECOMPTE`, `RESULTATS`, `FERMEE` et les transitions associées.)*

Règles d'accès : on ne peut rejoindre qu'en `EN_ATTENTE` (ou `RESULTATS`, planifié), jamais pendant `DECOMPTE`/`EN_COURSE` (SALLE-09).

État d'un participant pendant une course *(planifié)* :

```mermaid
stateDiagram-v2
  [*] --> EN_COURSE
  EN_COURSE --> TERMINE : dernier caractère validé
  EN_COURSE --> DECONNECTE : perte réseau
  DECONNECTE --> EN_COURSE : retour sous 30 s (COURSE-08)
  DECONNECTE --> ABANDON : au-delà de 30 s
  EN_COURSE --> ABANDON : abandon volontaire (COURSE-07)
  TERMINE --> [*]
  ABANDON --> [*]
```

## 4. ADR-001 — Transport temps réel : WebSocket avec Socket.IO

- **Statut** : acceptée.
- **Contexte** : la piste de progression doit se mettre à jour en direct pour tous les participants (COURSE-05), avec un serveur autoritaire (COURSE-06), une tolérance à la déconnexion de 30 s (COURSE-08) et des diffusions d'événements de salle (arrivée d'un joueur, démarrage, bonus).
- **Options** :

| Option | Avantages | Limites pour ce projet |
|---|---|---|
| Polling HTTP | Très simple | Latence visible, charge inutile à haute fréquence |
| Server-Sent Events | Diffusion serveur→client native | Unidirectionnel : il faut un second canal pour envoyer les frappes |
| **WebSocket (Socket.IO)** | Bidirectionnel, faible latence, *rooms* intégrées, reconnexion automatique | Exige un serveur à processus persistant |
| MQTT | Léger, pub/sub | Broker supplémentaire à héberger gratuitement ; pas de notion de salle native |

- **Décision** : **Socket.IO**. Un *room* Socket.IO par salle de jeu, authentification par le même JWT que l'API, reconnexion gérée par la bibliothèque.
- **Conséquences** :
  - Le backend reste un **serveur à processus long** (pas de serverless) ; c'est pourquoi Next.js est servi par un **serveur personnalisé** qui héberge aussi Express et Socket.IO, plutôt que par un déploiement serverless de Next.js.
  - PERF-02 : les mises à jour de progression seront **regroupées ou limitées** (≈ 10 messages/s par joueur au maximum), jamais écrites en base à chaque frappe ; seul le résultat final est persisté.
  - Pour passer à plusieurs instances, il faudrait un adaptateur Redis pour Socket.IO — hors périmètre.

## 5. Flux de messages temps réel

| Événement | Sens | Rôle | État |
|---|---|---|---|
| `room:create` | client → serveur | Crée la salle (utilisateur connecté seulement, AUTH-03) | implémenté |
| `room:join {code}` | client → serveur | Rejoint par code (validé Zod, 10 tentatives/min/IP, SALLE-10) | implémenté |
| `room:start` | client → serveur | Démarre (hôte seulement, ≥ 2 participants) | implémenté |
| `room:leave` | client → serveur | Quitte la salle ; transfert de l'hôte si besoin | implémenté |
| `room:state` | serveur → salle | Diffuse l'état public de la salle (participants, hôte, statut) | implémenté |
| `race:countdown` | serveur → salle | 3-2-1 synchronisé, puis le texte | planifié |
| `race:progress` | client → serveur | Progression (caractères validés), plafonnée en fréquence | planifié |
| `race:positions` | serveur → salle | Positions et MPM de tous (≈ 4 mises à jour/s) | planifié |
| `race:bonus` | serveur → salle | Annonce d'un bonus de remontée | planifié |
| `race:results` | serveur → salle | Résultats finaux, persistés en base | planifié |

Le **serveur est la source de vérité** (COURSE-06) : il fixe les temps de départ et de fin, valide les progressions (rejet des sauts et des vitesses irréalistes) et applique les bonus.

## 6. Approche prévue pour les bots (BOT-01 à BOT-05) *(planifié)*

- **Exécution côté serveur**, dans le même processus : un moteur de simulation par course qui avance à pas fixe (ex. 250 ms), sans client réel. Un bot est un participant (`is_bot = true`) qui apparaît sur la piste comme les autres, clairement étiqueté (BOT-04).
- **Déterministe** (BOT-05) : le moteur reçoit une **graine** (`seed`) et utilise un générateur pseudo-aléatoire à graine (type *mulberry32*), jamais `Math.random()`. Même graine + même texte + même niveau ⇒ même course : testable unitairement.
- **Niveaux** (BOT-01) : MPM visé et taux d'erreur par niveau, ajustables et documentés :

| Niveau | MPM visé | Taux d'erreur |
|---|---|---|
| Noob | 10–20 | ~12 % |
| Débutant | 20–35 | ~8 % |
| Intermédiaire | 35–60 | ~5 % |
| Expert | 70–100 | ~2 % |
| Impossible | 140+ | ~0,5 % |

- **Vitesse variable** (BOT-02) : le MPM instantané oscille autour de la cible (accélérations, hésitations) et ralentit sur les mots longs ou rares.
- **Erreurs** (BOT-03) : à chaque frappe, une erreur survient avec la probabilité du niveau ; elle coûte un temps de correction (mode « correction obligatoire ») ou est simplement comptée (mode « libre »), selon la configuration de la salle.
- **Bonus et malus** : les bots y sont soumis comme les humains (BOT-04).
