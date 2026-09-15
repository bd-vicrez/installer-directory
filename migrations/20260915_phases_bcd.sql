BEGIN;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS details jsonb NOT NULL DEFAULT '{}',
 ADD COLUMN IF NOT EXISTS request_id text UNIQUE, ADD COLUMN IF NOT EXISTS payload_hash text,
 ADD COLUMN IF NOT EXISTS consent_version text, ADD COLUMN IF NOT EXISTS consent_at timestamptz,
 ADD COLUMN IF NOT EXISTS installer_id text, ADD COLUMN IF NOT EXISTS reviewer text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS review_note text NOT NULL DEFAULT '', ADD COLUMN IF NOT EXISTS public_message text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS location_evidence jsonb, ADD COLUMN IF NOT EXISTS location_confirmed_at timestamptz;
CREATE SEQUENCE IF NOT EXISTS directory_application_number START 100000;
CREATE SEQUENCE IF NOT EXISTS directory_installer_number START 1000000;
CREATE TABLE IF NOT EXISTS directory_review_audit (
 id bigserial PRIMARY KEY, kind text NOT NULL, record_id text NOT NULL, actor text NOT NULL,
 action text NOT NULL, note text NOT NULL, before_data jsonb, after_data jsonb, created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS directory_claims (
 id text PRIMARY KEY, request_id text UNIQUE NOT NULL, payload_hash text NOT NULL,
 installer_id text NOT NULL REFERENCES installers(id), name text NOT NULL, email text NOT NULL,
 relationship text NOT NULL, correction text NOT NULL, details jsonb NOT NULL DEFAULT '{}',
 consent_version text NOT NULL, consent_at timestamptz NOT NULL DEFAULT NOW(),
 status text NOT NULL DEFAULT 'pending', reviewer text NOT NULL DEFAULT '', review_note text NOT NULL DEFAULT '',
 verification_channel text NOT NULL DEFAULT '', verification_evidence text NOT NULL DEFAULT '',
 public_message text NOT NULL DEFAULT '', submitted_at timestamptz NOT NULL DEFAULT NOW(), reviewed_at timestamptz
);
ALTER TABLE installers ADD COLUMN IF NOT EXISTS owner_details jsonb NOT NULL DEFAULT '{}',
 ADD COLUMN IF NOT EXISTS owner_details_confirmed_at timestamptz,
 ADD COLUMN IF NOT EXISTS service_source text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS location_evidence jsonb;
CREATE TABLE IF NOT EXISTS directory_data_review (
 id text PRIMARY KEY, installer_id text NOT NULL REFERENCES installers(id), issue text NOT NULL,
 status text NOT NULL DEFAULT 'pending', candidate jsonb NOT NULL DEFAULT '{}',
 reviewer text NOT NULL DEFAULT '', note text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT NOW(), reviewed_at timestamptz
);
CREATE INDEX IF NOT EXISTS directory_claim_queue ON directory_claims(status,submitted_at);
CREATE INDEX IF NOT EXISTS directory_application_queue ON applications(status,submitted_at);
INSERT INTO directory_schema_migrations(id) VALUES ('20260915_phases_bcd') ON CONFLICT DO NOTHING;
COMMIT;
