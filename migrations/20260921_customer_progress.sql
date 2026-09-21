BEGIN;
ALTER TABLE directory_inquiry_followup ADD COLUMN IF NOT EXISTS public_message text NOT NULL DEFAULT '';
ALTER TABLE installers ADD COLUMN IF NOT EXISTS owner_reconfirmed_at timestamptz, ADD COLUMN IF NOT EXISTS owner_reconfirmation_hash text;
ALTER TABLE directory_notifications DROP CONSTRAINT IF EXISTS directory_notifications_kind_check;
ALTER TABLE directory_notifications ADD CONSTRAINT directory_notifications_kind_check CHECK(kind IN ('application','claim','test','staff','owner','pilot','inquiry-reminder'));
ALTER TABLE directory_action_assignments DROP CONSTRAINT IF EXISTS directory_action_assignments_kind_check;
ALTER TABLE directory_action_assignments ADD CONSTRAINT directory_action_assignments_kind_check CHECK(kind IN ('application','claim','inquiry','pilot','notification','operation','freshness'));
INSERT INTO directory_schema_migrations(id) VALUES('20260921_customer_progress') ON CONFLICT DO NOTHING;
COMMIT;
