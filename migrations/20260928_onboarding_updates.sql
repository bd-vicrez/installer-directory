BEGIN;
CREATE TABLE IF NOT EXISTS directory_onboarding_updates (
 id uuid PRIMARY KEY, kind text NOT NULL CHECK(kind IN ('application','claim')),
 record_id text NOT NULL, payload_hash text NOT NULL, note text NOT NULL,
 evidence_url text NOT NULL DEFAULT '', changes jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS directory_onboarding_updates_record ON directory_onboarding_updates(kind,record_id,created_at);
INSERT INTO directory_schema_migrations(id) VALUES ('20260928_onboarding_updates') ON CONFLICT DO NOTHING;
COMMIT;
