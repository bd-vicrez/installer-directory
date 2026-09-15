BEGIN;
CREATE TABLE IF NOT EXISTS directory_notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_key text UNIQUE NOT NULL,
 kind text NOT NULL CHECK(kind IN ('application','claim','test','staff')), record_id text NOT NULL,
 recipient text NOT NULL, reference text NOT NULL, outcome text NOT NULL,
 public_message text NOT NULL DEFAULT '', state text NOT NULL DEFAULT 'pending',
 attempts integer NOT NULL DEFAULT 0, next_attempt_at timestamptz NOT NULL DEFAULT NOW(),
 lease_until timestamptz, provider_id text, last_error text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT NOW(), accepted_at timestamptz, delivered_at timestamptz,
 checked_at timestamptz, updated_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS directory_notification_work ON directory_notifications(state,next_attempt_at);
CREATE OR REPLACE FUNCTION directory_queue_request_notification() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE k text; ref text; event_ref text;
BEGIN
 k := CASE WHEN TG_TABLE_NAME='applications' THEN 'application' ELSE 'claim' END;
 IF k='application' THEN ref := NEW.application_id; ELSE ref := 'CLM-'||upper(left(NEW.id,8)); END IF;
 IF TG_OP='INSERT' THEN
  event_ref := k||':'||NEW.id||':receipt';
 ELSIF OLD.status IS DISTINCT FROM NEW.status OR OLD.public_message IS DISTINCT FROM NEW.public_message THEN
  event_ref := k||':'||NEW.id||':review:'||NEW.reviewed_at::text;
 ELSE RETURN NEW;
 END IF;
 INSERT INTO directory_notifications(event_key,kind,record_id,recipient,reference,outcome,public_message)
 VALUES(event_ref,k,NEW.id,NEW.email,ref,CASE WHEN TG_OP='INSERT' THEN 'received' ELSE NEW.status END,
 CASE WHEN TG_OP='INSERT' THEN '' ELSE NEW.public_message END) ON CONFLICT(event_key) DO NOTHING;
 IF TG_OP='INSERT' AND (SELECT COUNT(*) FROM directory_notifications WHERE recipient=NEW.email AND outcome='received' AND created_at>NOW()-INTERVAL '1 hour')>3 THEN
  UPDATE directory_notifications SET state='held',last_error='Repeated receipt requests to this inbox; review before sending' WHERE event_key=event_ref;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS directory_application_notifications ON applications;
CREATE TRIGGER directory_application_notifications AFTER INSERT OR UPDATE OF status,public_message ON applications
 FOR EACH ROW EXECUTE FUNCTION directory_queue_request_notification();
DROP TRIGGER IF EXISTS directory_claim_notifications ON directory_claims;
CREATE TRIGGER directory_claim_notifications AFTER INSERT OR UPDATE OF status,public_message ON directory_claims
 FOR EACH ROW EXECUTE FUNCTION directory_queue_request_notification();
CREATE TABLE IF NOT EXISTS directory_operation_runs (
 name text PRIMARY KEY, checked_at timestamptz NOT NULL DEFAULT NOW(), ok boolean NOT NULL, details jsonb NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS directory_inquiry_followup (
 submission_id bigint PRIMARY KEY, state text NOT NULL DEFAULT 'new' CHECK(state IN ('new','contacted','quoted','booked','declined')),
 note text NOT NULL, actor text NOT NULL, next_followup_at timestamptz, updated_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS directory_discovery_events (
 id uuid PRIMARY KEY, session_id uuid NOT NULL, event text NOT NULL,
 page text NOT NULL, service text, result_bucket text, listing_id text, target text,
 campaign_source text, created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS directory_discovery_time ON directory_discovery_events(created_at,event);
CREATE TABLE IF NOT EXISTS directory_staff_users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), username text UNIQUE NOT NULL, display_name text NOT NULL,
 password_hash text NOT NULL, sealed_totp text NOT NULL, recovery_hashes jsonb NOT NULL DEFAULT '[]',
 active boolean NOT NULL DEFAULT true, token_version integer NOT NULL DEFAULT 1, last_totp_counter bigint NOT NULL DEFAULT -1,
 created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS directory_staff_enrollments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), username text UNIQUE NOT NULL, display_name text NOT NULL,
 password_hash text NOT NULL, sealed_totp text NOT NULL, created_by text NOT NULL,
 expires_at timestamptz NOT NULL DEFAULT NOW()+INTERVAL '15 minutes'
);
CREATE TABLE IF NOT EXISTS directory_security_settings (id integer PRIMARY KEY CHECK(id=1),named_only boolean NOT NULL DEFAULT false);
INSERT INTO directory_security_settings(id) VALUES(1) ON CONFLICT DO NOTHING;
INSERT INTO directory_schema_migrations(id) VALUES ('20260915_phase_e') ON CONFLICT DO NOTHING;
COMMIT;
