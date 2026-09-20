BEGIN;
ALTER TABLE directory_staff_users ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
 ADD COLUMN IF NOT EXISTS totp_login_verified_at timestamptz,
 ADD COLUMN IF NOT EXISTS recovery_verified_at timestamptz;
CREATE TABLE IF NOT EXISTS directory_action_assignments (
 task_key text PRIMARY KEY, kind text NOT NULL CHECK(kind IN ('application','claim','inquiry','pilot','notification','operation')),
 record_id text NOT NULL, assigned_to uuid REFERENCES directory_staff_users(id), due_at timestamptz,
 workflow text NOT NULL DEFAULT 'open' CHECK(workflow IN ('open','in_progress','waiting')),
 note text NOT NULL DEFAULT '', version integer NOT NULL DEFAULT 1, actor text NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS directory_action_due ON directory_action_assignments(assigned_to,due_at);
ALTER TABLE directory_notifications DROP CONSTRAINT IF EXISTS directory_notifications_kind_check;
ALTER TABLE directory_notifications ADD CONSTRAINT directory_notifications_kind_check CHECK(kind IN ('application','claim','test','staff','owner','pilot'));
CREATE TABLE IF NOT EXISTS directory_pilot_outreach (
 id uuid PRIMARY KEY, campaign text NOT NULL, installer_id text NOT NULL REFERENCES installers(id),
 recipient text NOT NULL, subject text NOT NULL, message_hash text NOT NULL,
 notification_id uuid NOT NULL UNIQUE REFERENCES directory_notifications(id),
 actor text NOT NULL, queued_at timestamptz NOT NULL DEFAULT NOW(), UNIQUE(campaign,installer_id)
);
INSERT INTO directory_schema_migrations(id) VALUES('20260920_action_queue') ON CONFLICT DO NOTHING;
COMMIT;
