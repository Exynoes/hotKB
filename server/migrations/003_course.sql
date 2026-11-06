-- Course jouable : configuration, bots, résultats détaillés, invitations, avatars.

-- Salles : une seule salle active par personne (SALLE-06), garanti en base.
ALTER TABLE room_participant ADD COLUMN bot_name varchar(32);
ALTER TABLE room_participant ADD COLUMN left_at timestamptz;
-- Les salles existantes vivaient en mémoire et ont disparu : aucun participant n'est actif.
UPDATE room_participant SET left_at = now();
CREATE UNIQUE INDEX idx_one_active_room_user ON room_participant (user_id)
  WHERE left_at IS NULL AND user_id IS NOT NULL;
CREATE UNIQUE INDEX idx_one_active_room_guest ON room_participant (guest_id)
  WHERE left_at IS NULL AND guest_id IS NOT NULL;

-- Liens d'invitation à usage unique (SALLE-04) : seul le hachage du jeton est stocké.
CREATE TABLE room_invite (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id uuid NOT NULL REFERENCES room (id) ON DELETE CASCADE,
  token_hash text UNIQUE NOT NULL,
  used_by_name varchar(32),
  used_by_identity text,
  used_ip text,
  revoked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_room_invite_room ON room_invite (room_id);

-- Textes : un texte généré n'est pas dans le corpus ; la complexité est classée à l'insertion.
ALTER TABLE texte ADD COLUMN complexity varchar(8) NOT NULL DEFAULT 'medium';
ALTER TABLE race ALTER COLUMN texte_id DROP NOT NULL;
ALTER TABLE race ADD COLUMN text_content text;
ALTER TABLE race ADD COLUMN language varchar(8);
ALTER TABLE race ADD COLUMN settings jsonb NOT NULL DEFAULT '{}';

-- Résultats détaillés (RES-02, RES-03, RES-05).
ALTER TABLE race_result ADD COLUMN raw_wpm real;
ALTER TABLE race_result ADD COLUMN time_ms int;
ALTER TABLE race_result ADD COLUMN status varchar(16) NOT NULL DEFAULT 'termine';
ALTER TABLE race_result ADD COLUMN progress real NOT NULL DEFAULT 1;
ALTER TABLE race_result ADD COLUMN bonuses jsonb NOT NULL DEFAULT '[]';
ALTER TABLE race_result ADD COLUMN wpm_series jsonb NOT NULL DEFAULT '[]';
ALTER TABLE race_result ADD COLUMN key_errors jsonb NOT NULL DEFAULT '{}';
ALTER TABLE race_result ADD COLUMN personal_record boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX idx_race_result_unique ON race_result (race_id, participant_id);

-- Photo de profil (AUTH-04) : image redimensionnée, stockée en base.
ALTER TABLE "user" ADD COLUMN avatar_data bytea;
ALTER TABLE "user" ADD COLUMN avatar_updated_at timestamptz;
