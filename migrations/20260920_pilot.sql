BEGIN;
CREATE TABLE IF NOT EXISTS directory_shop_pilot (
 installer_id text PRIMARY KEY REFERENCES installers(id),
 decision text NOT NULL DEFAULT 'candidate' CHECK(decision IN ('candidate','reviewing','active','paused','declined')),
 evidence jsonb NOT NULL DEFAULT '{}', reviewer text NOT NULL DEFAULT '',
 version integer NOT NULL DEFAULT 0, updated_at timestamptz NOT NULL DEFAULT NOW()
);
INSERT INTO directory_schema_migrations(id) VALUES('20260920_pilot') ON CONFLICT DO NOTHING;
COMMIT;
