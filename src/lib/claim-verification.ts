import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { rfqConfig, UUID } from "./directory-rfq";
import { InputError } from "./onboarding";
const ACTOR = "Vicrez Installer Agent (AI)";
export function claimVerificationToken(id: string) {
  return (
    id +
    "." +
    createHmac("sha256", rfqConfig().secret)
      .update("claim-verification-v1:" + id)
      .digest("base64url")
  );
}
export function readClaimVerificationToken(value: unknown) {
  if (typeof value !== "string" || value.length > 150)
    throw new InputError("This verification link is invalid or expired.", 401);
  const [id, sig, extra] = value.split(".");
  if (!UUID.test(id) || !sig || extra !== undefined)
    throw new InputError("This verification link is invalid or expired.", 401);
  const given = Buffer.from(sig),
    expected = Buffer.from(claimVerificationToken(id).split(".")[1]);
  if (given.length !== expected.length || !timingSafeEqual(given, expected))
    throw new InputError("This verification link is invalid or expired.", 401);
  return id;
}
export async function verifyClaim(pool: Pool, id: string, confirm: boolean) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const identity = (
      await client.query(
        "SELECT claim_id FROM directory_claim_verifications WHERE id=$1",
        [id],
      )
    ).rows[0];
    if (!identity)
      throw new InputError(
        "This verification link is invalid or expired.",
        401,
      );
    await client.query("SELECT pg_advisory_xact_lock(19313,hashtext($1))", [
      "claim:" + identity.claim_id,
    ]);
    const proof = (
      await client.query(
        `SELECT v.*,c.installer_id,c.name,c.email,i.business_name,i.slug
      FROM directory_claim_verifications v JOIN directory_claims c ON c.id=v.claim_id
      JOIN installers i ON i.id=c.installer_id WHERE v.id=$1 FOR UPDATE OF i,c,v`,
        [id],
      )
    ).rows[0];
    if (!proof)
      throw new InputError(
        "This verification link is invalid or expired.",
        401,
      );
    // Lock existing grants and sibling claims before checking conflicts. The
    // locked installer row also blocks new FK-backed claims/grants until commit.
    await client.query(
      "SELECT id FROM directory_owner_grants WHERE installer_id=$1 FOR UPDATE",
      [proof.installer_id],
    );
    await client.query(
      "SELECT id FROM directory_claims WHERE installer_id=$1 FOR SHARE",
      [proof.installer_id],
    );
    await client.query(
      "SELECT task_key FROM directory_automation_cases WHERE task_key=$1 FOR UPDATE",
      ["claim:" + proof.claim_id],
    );
    const eligible = (
      await client.query(
        "SELECT directory_claim_proof_eligible($1) AS eligible",
        [id],
      )
    ).rows[0]?.eligible;
    if (!eligible)
      throw new InputError(
        "This link has expired, was already used, or the request now needs staff review. Contact B2B support with your claim reference.",
        409,
      );
    const summary = {
      business_name: proof.business_name,
      reference: "CLM-" + proof.claim_id.slice(0, 8).toUpperCase(),
      expires_at: proof.expires_at,
    };
    if (confirm) {
      const evidence =
        "Business contact control confirmed through a single-use email link after independent website and Google identity checks. Verification record: " +
        id;
      const grant =
        (
          await client.query(
            `INSERT INTO directory_owner_grants(id,installer_id,email,name,evidence_kind,evidence_id,actor,note)
        VALUES($1,$2,$3,$4,'claim',$5,$6,$7) ON CONFLICT(installer_id,email) DO NOTHING RETURNING id`,
            [
              randomUUID(),
              proof.installer_id,
              proof.recipient,
              proof.name,
              proof.claim_id,
              ACTOR,
              evidence,
            ],
          )
        ).rows[0] ||
        (
          await client.query(
            "SELECT id FROM directory_owner_grants WHERE installer_id=$1 AND email=$2 AND active",
            [proof.installer_id, proof.recipient],
          )
        ).rows[0];
      if (!grant)
        throw new InputError("Owner access requires staff review.", 409);
      await client.query(
        "UPDATE directory_claim_verifications SET consumed_at=NOW() WHERE id=$1",
        [id],
      );
      await client.query(
        `UPDATE directory_claims SET status='verified',reviewer=$2,review_note=$3,verification_channel='verified-business-email',
        verification_evidence=$3,owner_grant_id=$4,reviewed_at=NOW(),public_message='Your business contact has been verified and owner access is approved. Sign in at https://installers.vicrez.com/owner using the same email address. Requested listing changes still require review.' WHERE id=$1`,
        [proof.claim_id, ACTOR, evidence, grant.id],
      );
      await client.query(
        `UPDATE directory_automation_cases SET state='verified',paused=true,next_step='Ownership verified; owner access granted. Requested public edits require a separate publication review.',updated_at=NOW() WHERE task_key=$1`,
        ["claim:" + proof.claim_id],
      );
      await client.query(
        `INSERT INTO directory_review_audit(kind,record_id,actor,action,note,after_data) VALUES('claim',$1,$2,'ownership_verified',$3,$4)`,
        [
          proof.claim_id,
          ACTOR,
          evidence,
          JSON.stringify({ grant_id: grant.id, verification_id: id }),
        ],
      );
      await client.query(
        `INSERT INTO directory_review_audit(kind,record_id,actor,action,note) VALUES('owner-access',$1,$2,'grant',$3)`,
        [grant.id, ACTOR, evidence],
      );
    }
    await client.query("COMMIT");
    return { ...summary, verified: confirm };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
