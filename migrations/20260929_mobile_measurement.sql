BEGIN;
ALTER TABLE directory_discovery_events
 ADD COLUMN IF NOT EXISTS device_category text,
 ADD COLUMN IF NOT EXISTS journey_id uuid,
 ADD COLUMN IF NOT EXISTS step text,
 ADD COLUMN IF NOT EXISTS duration_ms integer,
 ADD COLUMN IF NOT EXISTS metric text,
 ADD COLUMN IF NOT EXISTS metric_value double precision,
 ADD COLUMN IF NOT EXISTS metric_sequence integer;
CREATE INDEX IF NOT EXISTS directory_discovery_journey ON directory_discovery_events(journey_id,created_at) WHERE journey_id IS NOT NULL;
INSERT INTO directory_schema_migrations(id) VALUES ('20260929_mobile_measurement') ON CONFLICT DO NOTHING;
COMMIT;
