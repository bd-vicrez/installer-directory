import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { readSmallJson, readStatusToken, InputError } from "@/lib/onboarding";
import { ownerOrigin, ownerError, OWNER_HEADERS } from "@/lib/owner-access";
import { withinRateLimit, UUID } from "@/lib/directory-rfq";
import { readClaimVerificationToken } from "@/lib/claim-verification";
import { requestClaimRecovery } from "@/lib/claim-recovery";
export async function POST(request: NextRequest) {
  let c;
  try {
    ownerOrigin(request);
    const b = await readSmallJson(request, 1500);
    if (b.confirm !== true || !UUID.test(b.request_id || ""))
      throw new InputError("Confirm your request for a fresh review.");
    let id: string;
    if (b.proof_token) {
      const p = (
        await getPool().query(
          "SELECT claim_id FROM directory_claim_verifications WHERE id=$1",
          [readClaimVerificationToken(b.proof_token)],
        )
      ).rows[0];
      if (!p) throw new InputError("This link is unavailable.", 401);
      id = p.claim_id;
    } else {
      const t = readStatusToken(b.token);
      if (t.kind !== "claim")
        throw new InputError("Choose an ownership request.");
      id = t.id;
    }
    if (!(await withinRateLimit(id, "claim-recovery", 5, 3600)))
      throw new InputError(
        "Please wait before requesting another review.",
        429,
      );
    c = await getPool().connect();
    await c.query("BEGIN");
    await c.query("SELECT pg_advisory_xact_lock(19313,hashtext($1))", [
      "claim:" + id,
    ]);
    await c.query("SELECT id FROM directory_claims WHERE id=$1 FOR UPDATE", [
      id,
    ]);
    await requestClaimRecovery(c, id, b.request_id, "renewal");
    await c.query("COMMIT");
    return NextResponse.json(
      {
        success: true,
        message:
          "A fresh evidence review is queued. A new verification email will be sent only if the checks pass. Owner access remains unapproved.",
      },
      { headers: OWNER_HEADERS },
    );
  } catch (e) {
    if (c) await c.query("ROLLBACK");
    return ownerError(e);
  } finally {
    c?.release();
  }
}
