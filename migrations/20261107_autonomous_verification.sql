BEGIN;
ALTER TABLE directory_automation_cases DROP CONSTRAINT IF EXISTS directory_automation_cases_kind_check;
ALTER TABLE directory_automation_cases ADD CONSTRAINT directory_automation_cases_kind_check CHECK(kind IN ('application','inquiry','claim'));
CREATE TABLE IF NOT EXISTS directory_claim_verifications (
 id uuid PRIMARY KEY, claim_id text NOT NULL UNIQUE REFERENCES directory_claims(id),
 recipient text NOT NULL, claim_payload_hash text NOT NULL, shop_snapshot jsonb NOT NULL,
 evidence jsonb NOT NULL, expires_at timestamptz NOT NULL, consumed_at timestamptz,
 cancelled_at timestamptz, created_at timestamptz NOT NULL DEFAULT NOW()
);
-- Shared identity snapshot: changes to SEO text do not invalidate a proof,
-- but a different business, contact, address, or listing state always does.
CREATE OR REPLACE FUNCTION directory_shop_identity(i installers) RETURNS jsonb
 LANGUAGE sql IMMUTABLE AS $$
 SELECT jsonb_build_object('id',i.id,'business_name',i.business_name,'street_address',i.street_address,
 'city',i.city,'state',i.state,'zip_code',i.zip_code,'phone',i.phone,'website',i.website,'status',i.status)
$$;
CREATE OR REPLACE FUNCTION directory_claim_proof_eligible(proof_id uuid) RETURNS boolean
 LANGUAGE sql STABLE AS $$
 SELECT EXISTS (
  SELECT 1 FROM directory_claim_verifications v JOIN directory_claims c ON c.id=v.claim_id
  JOIN installers i ON i.id=c.installer_id
  JOIN directory_automation_cases a ON a.task_key='claim:'||c.id
  WHERE v.id=proof_id AND v.expires_at>NOW() AND v.consumed_at IS NULL AND v.cancelled_at IS NULL
   AND c.status IN ('pending','needs_information') AND c.reviewer='Vicrez Installer Agent (AI)'
   AND c.payload_hash=v.claim_payload_hash AND lower(c.email)=v.recipient
   AND i.status='active' AND directory_shop_identity(i)=v.shop_snapshot
   AND a.state='awaiting_business_confirmation' AND NOT a.paused
   AND NOT EXISTS(SELECT 1 FROM directory_action_assignments x WHERE x.task_key='claim:'||c.id AND x.actor<>'Vicrez Installer Agent (AI)')
   AND NOT EXISTS(SELECT 1 FROM directory_owner_grants g WHERE g.installer_id=c.installer_id AND (NOT g.active OR lower(g.email)<>v.recipient))
   AND NOT EXISTS(SELECT 1 FROM directory_claims other WHERE other.installer_id=c.installer_id AND other.id<>c.id
       AND other.status IN ('pending','needs_information','verified') AND lower(other.email)<>v.recipient)
 )
$$;
-- The worker can prepare proof and review cases, but cannot grant owner access.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='installer_agent_v1') THEN
  GRANT SELECT ON directory_claims, directory_owner_grants TO installer_agent_v1;
  GRANT UPDATE(status,reviewer,review_note,public_message,reviewed_at) ON directory_claims TO installer_agent_v1;
  GRANT SELECT,INSERT ON directory_claim_verifications TO installer_agent_v1;
  GRANT UPDATE(cancelled_at) ON directory_claim_verifications TO installer_agent_v1;
 END IF;
END $$;
INSERT INTO directory_schema_migrations(id) VALUES ('20261107_autonomous_verification') ON CONFLICT DO NOTHING;
COMMIT;
