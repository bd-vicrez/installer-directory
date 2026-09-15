-- Additive migration. Existing private email/feed columns remain compatible.
BEGIN;
ALTER TABLE installers ADD COLUMN IF NOT EXISTS routing_email text;
ALTER TABLE installers ADD COLUMN IF NOT EXISTS quote_routing_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE installers ADD COLUMN IF NOT EXISTS quote_routing_basis text;
ALTER TABLE installers ADD COLUMN IF NOT EXISTS public_email text;
ALTER TABLE installers ADD COLUMN IF NOT EXISTS public_email_approved boolean NOT NULL DEFAULT false;
ALTER TABLE installers ADD COLUMN IF NOT EXISTS public_email_approved_at timestamptz;
ALTER TABLE installers ADD COLUMN IF NOT EXISTS public_email_approval_note text;
CREATE TABLE IF NOT EXISTS directory_schema_migrations (id text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT NOW());
-- Preserve prior routing eligibility, NOT a claim of newly obtained consent.
-- The basis marker prevents a repeated migration from undoing later opt-outs.
UPDATE installers SET routing_email = NULLIF(BTRIM(email), ''),
  quote_routing_enabled = status = 'active' AND COALESCE(BTRIM(email), '') ~ '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$',
  quote_routing_basis = 'existing-directory-routing' WHERE quote_routing_basis IS NULL
  AND NOT EXISTS (SELECT 1 FROM directory_schema_migrations WHERE id='20260915_phase_a');
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS session_id text;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS flow text;
CREATE TABLE IF NOT EXISTS directory_rate_limits (key text PRIMARY KEY, count integer NOT NULL, expires_at timestamptz NOT NULL);
CREATE INDEX IF NOT EXISTS directory_rate_limits_expiry ON directory_rate_limits(expires_at);
CREATE TABLE IF NOT EXISTS installer_contact_audit (
  id bigserial PRIMARY KEY, installer_id text NOT NULL, changed_at timestamptz NOT NULL DEFAULT NOW(),
  actor text NOT NULL, action text NOT NULL, note text NOT NULL
);
INSERT INTO directory_schema_migrations(id) VALUES('20260915_phase_a') ON CONFLICT(id) DO NOTHING;
COMMIT;
