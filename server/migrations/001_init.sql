-- Schéma initial HotKB — reprend le modèle de données documenté dans
-- l'architecture (architecture.html, section 1).

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE "user" (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  username varchar(32) UNIQUE NOT NULL,
  password_hash text,
  auth_provider varchar(32) NOT NULL DEFAULT 'local',
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE guest_session (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  display_name varchar(32) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  merged_into_user_id uuid REFERENCES "user" (id)
);

CREATE TABLE room (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code varchar(6) UNIQUE NOT NULL,
  visibility varchar(16) NOT NULL DEFAULT 'private',
  host_user_id uuid REFERENCES "user" (id),
  status varchar(16) NOT NULL DEFAULT 'en_attente',
  settings jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE room_participant (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id uuid NOT NULL REFERENCES room (id) ON DELETE CASCADE,
  user_id uuid REFERENCES "user" (id),
  guest_id uuid REFERENCES guest_session (id),
  is_bot boolean NOT NULL DEFAULT false,
  bot_difficulty varchar(16),
  is_spectator boolean NOT NULL DEFAULT false,
  joined_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT one_identity CHECK (
    (user_id IS NOT NULL AND guest_id IS NULL) OR
    (user_id IS NULL AND guest_id IS NOT NULL) OR
    (is_bot = true)
  )
);

CREATE TABLE texte (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  content text NOT NULL,
  language varchar(8) NOT NULL DEFAULT 'fr',
  length int NOT NULL,
  contains_accents boolean NOT NULL DEFAULT false
);

CREATE TABLE race (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id uuid NOT NULL REFERENCES room (id) ON DELETE CASCADE,
  texte_id uuid NOT NULL REFERENCES texte (id),
  started_at timestamptz,
  duration_seconds int,
  status varchar(16) NOT NULL DEFAULT 'en_attente'
);

CREATE TABLE race_result (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  race_id uuid NOT NULL REFERENCES race (id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES room_participant (id),
  wpm real,
  accuracy real,
  rank int,
  errors_count int NOT NULL DEFAULT 0
);

CREATE TABLE personal_best (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES "user" (id),
  texte_id uuid NOT NULL REFERENCES texte (id),
  best_wpm real NOT NULL,
  best_time int NOT NULL,
  UNIQUE (user_id, texte_id)
);

CREATE TABLE key_error_stat (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES "user" (id),
  key_char varchar(4) NOT NULL,
  error_count int NOT NULL DEFAULT 0,
  UNIQUE (user_id, key_char)
);

CREATE INDEX idx_room_code ON room (code);
CREATE INDEX idx_room_participant_room ON room_participant (room_id);
CREATE INDEX idx_race_room ON race (room_id);
CREATE INDEX idx_race_result_race ON race_result (race_id);
