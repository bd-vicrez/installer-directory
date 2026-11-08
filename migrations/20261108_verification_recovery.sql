BEGIN;
CREATE TABLE IF NOT EXISTS directory_verification_incidents (
 id uuid PRIMARY KEY, opened_at timestamptz NOT NULL DEFAULT NOW(),
 recovered_at timestamptz, reason text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS directory_verification_one_incident
 ON directory_verification_incidents((true)) WHERE recovered_at IS NULL;
-- Keep all old challenges for audit and delivery reconciliation. Cancel before replacement.
ALTER TABLE directory_claim_verifications DROP CONSTRAINT IF EXISTS directory_claim_verifications_claim_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS directory_claim_one_live_proof ON directory_claim_verifications(claim_id)
 WHERE consumed_at IS NULL AND cancelled_at IS NULL;
CREATE INDEX IF NOT EXISTS directory_claim_proof_history ON directory_claim_verifications(claim_id,created_at DESC);
CREATE TABLE IF NOT EXISTS directory_claim_recovery_requests (
 id uuid PRIMARY KEY, claim_id text NOT NULL REFERENCES directory_claims(id),
 kind text NOT NULL CHECK(kind IN ('information','renewal')), created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS directory_owner_quote_setup (
 id uuid PRIMARY KEY, installer_id text NOT NULL REFERENCES installers(id),
 grant_id uuid NOT NULL REFERENCES directory_owner_grants(id), grant_version integer NOT NULL,
 recipient text NOT NULL, shop_snapshot jsonb NOT NULL, services text[] NOT NULL,
 participation_at timestamptz NOT NULL DEFAULT NOW(),
 expires_at timestamptz NOT NULL DEFAULT NOW()+INTERVAL '48 hours',
 confirmed_at timestamptz, cancelled_at timestamptz, created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS directory_owner_setup_history ON directory_owner_quote_setup(installer_id,created_at DESC);
ALTER TABLE directory_notifications DROP CONSTRAINT IF EXISTS directory_notifications_kind_check;
ALTER TABLE directory_notifications ADD CONSTRAINT directory_notifications_kind_check CHECK(kind IN ('application','claim','test','staff','owner','pilot','inquiry-reminder','owner-setup'));
CREATE OR REPLACE FUNCTION directory_quote_setup_eligible(setup_id uuid, confirmed boolean DEFAULT false) RETURNS boolean
 LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM directory_owner_quote_setup s JOIN directory_owner_grants g ON g.id=s.grant_id
 JOIN installers i ON i.id=s.installer_id WHERE s.id=setup_id AND s.cancelled_at IS NULL
 AND g.active AND g.version=s.grant_version AND g.installer_id=s.installer_id AND lower(g.email)=s.recipient
 AND i.status='active' AND NOT i.owner_inquiry_paused AND COALESCE(i.google_status,'') NOT IN ('CLOSED_PERMANENTLY','CLOSED_TEMPORARILY')
 AND NOT EXISTS(SELECT 1 FROM directory_shop_pilot p WHERE p.installer_id=i.id AND p.decision IN ('paused','declined'))
 AND cardinality(s.services)>0 AND s.services=i.install_capabilities
 AND s.shop_snapshot=directory_shop_identity(i)
 AND (CASE WHEN confirmed THEN s.confirmed_at>NOW()-INTERVAL '30 days' ELSE s.confirmed_at IS NULL AND s.expires_at>NOW() END))
$$;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='installer_agent_v1') THEN
  GRANT SELECT ON directory_claim_recovery_requests TO installer_agent_v1;
 END IF;
END $$;
INSERT INTO directory_schema_migrations(id) VALUES('20261108_verification_recovery') ON CONFLICT DO NOTHING;
COMMIT;
