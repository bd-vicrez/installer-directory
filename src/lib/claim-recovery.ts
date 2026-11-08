import type { PoolClient } from "pg";
import { InputError } from "./onboarding";
const ACTOR = "Vicrez Installer Agent (AI)";
const RETRY_REASONS = [
  "business_contact_not_corroborated",
  "business_evidence_incomplete",
  "proof_expired_or_request_changed",
];
const MISSING: Record<string, string> = {
  business_name_on_website: "The official website must identify this shop.",
  business_phone_on_website: "The shop phone must match its official website.",
  public_business_address:
    "The official site must show the matching public shop address.",
  google_business_match: "The business listing must match an operating shop.",
  google_phone_match: "The business listing and shop phone must match.",
  google_website_match:
    "The business listing must link to the official website.",
  google_address_match:
    "The business listing must match the public shop address.",
  geocoded_full_address: "We need a complete, verifiable public shop address.",
  ai_evidence_review: "The independent business sources need further review.",
  listing_consent:
    "The request needs valid authorization to list this business.",
};
export const RECOVERY_SELECT = `SELECT c.*,a.state AS automation_state,a.paused,a.evidence,a.next_check_at,
 x.actor AS assignment_actor,a.owner_name,
 v.id AS proof_id,v.expires_at AS proof_expires_at,v.consumed_at,v.cancelled_at,
 (SELECT MAX(created_at) FROM directory_claim_recovery_requests WHERE claim_id=c.id) AS last_recovery_at,
 (SELECT count(*)::int FROM directory_claim_recovery_requests WHERE claim_id=c.id AND created_at>NOW()-INTERVAL '7 days') AS recovery_count,
 (EXISTS(SELECT 1 FROM directory_owner_grants g WHERE g.installer_id=c.installer_id AND (NOT g.active OR lower(g.email)<>lower(c.email)))
 OR EXISTS(SELECT 1 FROM directory_claims o WHERE o.installer_id=c.installer_id AND o.id<>c.id AND o.status IN ('pending','needs_information','verified') AND lower(o.email)<>lower(c.email))) AS ownership_conflict
 FROM directory_claims c LEFT JOIN directory_automation_cases a ON a.task_key='claim:'||c.id
 LEFT JOIN directory_action_assignments x ON x.task_key='claim:'||c.id
 LEFT JOIN LATERAL (SELECT * FROM directory_claim_verifications WHERE claim_id=c.id ORDER BY created_at DESC,id DESC LIMIT 1) v ON true`;
export function claimRecoveryStatus(row: any, now = Date.now()) {
  const decision = row.evidence?.decision || {},
    expired = !!row.proof_id && new Date(row.proof_expires_at).getTime() <= now;
  const human =
    !!(row.reviewer && row.reviewer !== ACTOR) ||
    !!(row.assignment_actor && row.assignment_actor !== ACTOR) ||
    row.owner_name !== ACTOR;
  const authorityRisk =
    /\b(?:former|ex.employee|researcher|security|test|marketing|marketer|agency|seo|third.party)\b/i.test(
      row.relationship || "",
    );
  const cooldown =
    !!row.last_recovery_at &&
    now - new Date(row.last_recovery_at).getTime() < 86400000;
  const allowed =
    ["pending", "needs_information"].includes(row.status) &&
    !human &&
    !authorityRisk &&
    !row.ownership_conflict &&
    !row.consumed_at &&
    row.recovery_count < 3 &&
    !cooldown &&
    ((row.automation_state === "staff_attention" &&
      RETRY_REASONS.includes(decision.reason)) ||
      (row.automation_state === "awaiting_business_confirmation" && expired));
  const waiting =
    row.automation_state === "awaiting_business_confirmation" &&
    !expired &&
    !row.cancelled_at;
  const missing = (decision.missing || [])
    .filter((k: string) => MISSING[k])
    .map((k: string) => MISSING[k]);
  if (decision.reason === "business_contact_not_corroborated")
    missing.unshift(
      "Use the shop’s established business email. Supply a link showing that email on the official business website; email changes require B2B support.",
    );
  let next =
    "Your request is queued for review. The daily research limit may delay the next review.";
  if (["verified", "resolved"].includes(row.status))
    next =
      "Your request has been reviewed. Any owner access and publication decisions are shown above.";
  else if (human || row.ownership_conflict || authorityRisk)
    next =
      "B2B support must independently verify authority. Add relevant evidence below; this request cannot bypass staff review.";
  else if (waiting)
    next =
      "Open the private email and confirm your authority before the deadline. A delivered email alone does not approve ownership.";
  else if (allowed)
    next = expired
      ? "Request a fresh verification review below. A new email is sent only after the business and your authority checks pass again."
      : "Add the missing information below. Eligible automated holds return to the review queue; access stays unapproved.";
  else if (row.automation_state === "recovery_requested")
    next =
      "Your fresh verification review is queued. No further action is needed while the agent checks the public evidence. The daily research limit may delay review; access remains unapproved.";
  else if (cooldown || row.recovery_count >= 3)
    next =
      "Your recent review request is recorded. Allow at least 24 hours between requests; after three requests in seven days, contact B2B support.";
  else if (row.automation_state === "staff_attention")
    next =
      "Add the requested evidence below. B2B support must review this hold.";
  return {
    stage:
      row.automation_state === "recovery_requested"
        ? "New review requested"
        : waiting
          ? "Awaiting your email confirmation"
          : expired
            ? "Verification link expired"
            : row.automation_state === "staff_attention"
              ? "Additional verification needed"
              : row.automation_state === "recovery_requested"
                ? "New review requested"
                : "Review status",
    next_step: next,
    missing: row.automation_state === "recovery_requested" ? [] : missing,
    expires_at: waiting ? row.proof_expires_at : null,
    can_renew: allowed && expired,
    can_requeue: allowed && !expired,
    last_recovery_at: row.last_recovery_at || null,
  };
}
// Caller holds the claim advisory lock and row lock. Staff ownership always wins.
export async function requestClaimRecovery(
  c: PoolClient,
  claimId: string,
  id: string,
  kind: "information" | "renewal",
) {
  const row = (await c.query(RECOVERY_SELECT + " WHERE c.id=$1", [claimId]))
    .rows[0];
  if (!row) throw new InputError("Request not found.", 404);
  const previous = (
    await c.query(
      "SELECT claim_id,kind FROM directory_claim_recovery_requests WHERE id=$1",
      [id],
    )
  ).rows[0];
  if (previous) {
    if (previous.claim_id !== claimId || previous.kind !== kind)
      throw new InputError("Use the original request reference.", 409);
    return true;
  }
  const status = claimRecoveryStatus(row);
  if (!(kind === "renewal" ? status.can_renew : status.can_requeue)) {
    if (kind === "renewal") throw new InputError(status.next_step, 409);
    return false;
  }
  await c.query(
    "INSERT INTO directory_claim_recovery_requests(id,claim_id,kind) VALUES($1,$2,$3)",
    [id, claimId, kind],
  );
  await c.query(
    "UPDATE directory_claim_verifications SET cancelled_at=COALESCE(cancelled_at,NOW()) WHERE claim_id=$1 AND consumed_at IS NULL",
    [claimId],
  );
  await c.query(
    `UPDATE directory_notifications SET state='expired',last_error='Replaced by an explicit request for fresh verification',updated_at=NOW()
    WHERE outcome='ownership_verification' AND record_id IN (SELECT id::text FROM directory_claim_verifications WHERE claim_id=$1) AND state IN ('pending','retry')`,
    [claimId],
  );
  await c.query(
    `UPDATE directory_automation_cases SET state='recovery_requested',paused=false,next_check_at=NOW(),fingerprint='',
    next_step='Applicant requested a fresh evidence review. Recheck all authority gates before sending a new proof.',updated_at=NOW() WHERE task_key=$1`,
    ["claim:" + claimId],
  );
  await c.query(
    `UPDATE directory_action_assignments SET due_at=NOW(),workflow='open',note='Fresh verification requested; owner access remains unapproved.',updated_at=NOW(),version=version+1 WHERE task_key=$1 AND actor=$2`,
    ["claim:" + claimId, ACTOR],
  );
  await c.query(
    `INSERT INTO directory_review_audit(kind,record_id,actor,action,note,after_data) VALUES('claim',$1,'Applicant via private link','verification_recovery_requested',$2,$3)`,
    [
      claimId,
      "Fresh evidence review requested; previous unconsumed proofs cancelled.",
      JSON.stringify({ request_id: id, kind }),
    ],
  );
  return true;
}
