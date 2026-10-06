-- AUTH-01 : identifiant du compte chez le fournisseur OAuth (Discord / GitHub).
ALTER TABLE "user" ADD COLUMN provider_id text;
CREATE UNIQUE INDEX idx_user_provider ON "user" (auth_provider, provider_id) WHERE provider_id IS NOT NULL;
