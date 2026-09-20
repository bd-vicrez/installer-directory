import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { requireAdmin, adminIdentity } from "@/lib/admin-auth";
import { sameOrigin, rfqFetch } from "@/lib/directory-rfq";
import { InputError, readSmallJson, textField } from "@/lib/onboarding";
import { pilotInput, pilotMissing } from "@/lib/pilot";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
const select = `SELECT p.*,i.business_name,i.slug,i.street_address,i.city,i.state,i.status,i.google_status,i.routing_email,i.quote_routing_enabled,i.install_capabilities FROM directory_shop_pilot p JOIN installers i ON i.id=p.installer_id`;
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth) return auth;
  try {
    const rows = (await getPool().query(select + " ORDER BY i.business_name"))
      .rows;
    let responseCounts = null;
    try {
      const r = await rfqFetch("/internal/directory-rfq/requests");
      if (r.ok) responseCounts = (await r.json()).shop_response_counts || null;
    } catch {
      /* Preserve availability of the review queue. */
    }
    const records = rows.map((row) => {
      const missing = pilotMissing(row.evidence, row);
      return {
        ...row,
        missing,
        participating: row.decision === "active" && missing.length === 0,
      };
    });
    return NextResponse.json(
      {
        records,
        response_counts: responseCounts,
        candidates: records.length,
        participants: records.filter((x) => x.participating).length,
      },
      { headers },
    );
  } catch {
    return NextResponse.json(
      { error: "Pilot queue unavailable." },
      { status: 503, headers },
    );
  }
}
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth) return auth;
  let client;
  try {
    if (!sameOrigin(request)) throw new InputError("Invalid origin.", 403);
    const body = await readSmallJson(request, 14000),
      input = pilotInput(body);
    const id = textField(body.installer_id, "listing", 1, 80),
      actor = adminIdentity(request)?.username;
    if (!actor) throw new InputError("Sign in again.", 401);
    client = await getPool().connect();
    await client.query("BEGIN");
    const row = (
      await client.query(
        select + " WHERE p.installer_id=$1 FOR UPDATE OF p,i",
        [id],
      )
    ).rows[0];
    if (!row) throw new InputError("Pilot candidate not found.", 404);
    if (row.version !== input.version)
      throw new InputError(
        "Another reviewer updated this candidate. Reload before saving.",
        409,
      );
    const missing = pilotMissing(input.evidence, row);
    if (input.decision === "active" && missing.length)
      throw new InputError(
        "Complete the activation evidence: " + missing.join("; "),
      );
    await client.query(
      "UPDATE directory_shop_pilot SET decision=$2,evidence=$3,reviewer=$4,version=version+1,updated_at=NOW() WHERE installer_id=$1",
      [id, input.decision, JSON.stringify(input.evidence), actor],
    );
    await client.query(
      "INSERT INTO directory_review_audit(kind,record_id,actor,action,note,before_data,after_data) VALUES('pilot',$1,$2,$3,$4,$5,$6)",
      [
        id,
        actor,
        input.decision,
        input.evidence.note,
        JSON.stringify({ decision: row.decision, evidence: row.evidence }),
        JSON.stringify(input),
      ],
    );
    await client.query("COMMIT");
    return NextResponse.json(
      { success: true, version: input.version + 1 },
      { headers },
    );
  } catch (e) {
    if (client) await client.query("ROLLBACK");
    return NextResponse.json(
      {
        error:
          e instanceof InputError
            ? e.message
            : "Pilot review could not be saved.",
      },
      { status: e instanceof InputError ? e.status : 503, headers },
    );
  } finally {
    client?.release();
  }
}
