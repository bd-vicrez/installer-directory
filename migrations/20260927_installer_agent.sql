BEGIN;
CREATE TABLE IF NOT EXISTS directory_automation_cases (
 task_key text PRIMARY KEY, kind text NOT NULL CHECK(kind IN ('application','inquiry')),
 record_id text NOT NULL, owner_name text NOT NULL, escalation_owner text NOT NULL,
 state text NOT NULL, next_step text NOT NULL, next_check_at timestamptz NOT NULL,
 fingerprint text NOT NULL DEFAULT '', evidence jsonb NOT NULL DEFAULT '{}',
 zendesk_ticket_id bigint, paused boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT NOW(), updated_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS directory_automation_messages (
 event_key text PRIMARY KEY, kind text NOT NULL, record_ids jsonb NOT NULL,
 recipient text NOT NULL, subject text NOT NULL, body text NOT NULL,
 state text NOT NULL DEFAULT 'pending', ticket_id bigint, ticket_updated_at text,
 attempted_at timestamptz, sent_at timestamptz, last_error text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS directory_automation_reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), application_id text NOT NULL,
 input_fingerprint text NOT NULL, decision jsonb NOT NULL, evidence jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS directory_automation_attempts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), application_id text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT NOW()
);
INSERT INTO directory_schema_migrations(id) VALUES ('20260927_installer_agent') ON CONFLICT DO NOTHING;
COMMIT;
