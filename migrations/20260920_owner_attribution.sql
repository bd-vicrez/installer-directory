BEGIN;
ALTER TABLE installers ADD COLUMN IF NOT EXISTS owner_inquiry_paused boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS directory_owner_grants (
 id uuid PRIMARY KEY, installer_id text NOT NULL REFERENCES installers(id), email text NOT NULL,
 name text NOT NULL, active boolean NOT NULL DEFAULT true, version integer NOT NULL DEFAULT 1,
 evidence_kind text NOT NULL, evidence_id text NOT NULL, actor text NOT NULL, note text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT NOW(), updated_at timestamptz NOT NULL DEFAULT NOW(),
 UNIQUE(installer_id,email)
);
CREATE TABLE IF NOT EXISTS directory_owner_logins (
 id uuid PRIMARY KEY, grant_id uuid NOT NULL REFERENCES directory_owner_grants(id), version integer NOT NULL,
 expires_at timestamptz NOT NULL, consumed_at timestamptz, created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS directory_owner_sessions (
 token_hash text PRIMARY KEY, grant_id uuid NOT NULL REFERENCES directory_owner_grants(id), version integer NOT NULL,
 expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS directory_owner_session_expiry ON directory_owner_sessions(expires_at);
ALTER TABLE directory_claims ADD COLUMN IF NOT EXISTS owner_grant_id uuid REFERENCES directory_owner_grants(id);
CREATE TABLE IF NOT EXISTS directory_shop_photos (
 id uuid PRIMARY KEY, installer_id text NOT NULL REFERENCES installers(id), grant_id uuid NOT NULL REFERENCES directory_owner_grants(id),
 caption text NOT NULL, image bytea NOT NULL CHECK(octet_length(image)<=1500000),
 width integer NOT NULL, height integer NOT NULL, created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS directory_shop_photo_listing ON directory_shop_photos(installer_id);
ALTER TABLE directory_notifications DROP CONSTRAINT IF EXISTS directory_notifications_kind_check;
ALTER TABLE directory_notifications ADD CONSTRAINT directory_notifications_kind_check CHECK(kind IN ('application','claim','test','staff','owner'));
ALTER TABLE directory_discovery_events ADD COLUMN IF NOT EXISTS acquisition_channel text;
INSERT INTO directory_schema_migrations(id) VALUES ('20260920_owner_attribution') ON CONFLICT DO NOTHING;
COMMIT;
