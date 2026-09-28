import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { sameOrigin, withinRateLimit, UUID } from "@/lib/directory-rfq";
import {
  InputError,
  readSmallJson,
  readStatusToken,
  payloadHash,
} from "@/lib/onboarding";
import { applicantChanges, requestRevision } from "@/lib/onboarding-updates";
export async function POST(request: Request) {
  let client;
  try {
    if (!sameOrigin(request)) throw new InputError("Invalid origin.", 403);
    const body = await readSmallJson(request, 12000),
      token = readStatusToken(body.token);
    if (
      !UUID.test(body.request_id || "") ||
      body.agreement !== true ||
      body.honeypot
    )
      throw new InputError("Confirm your update and retry.");
    if (
      !(await withinRateLimit(
        token.kind + ":" + token.id,
        "onboarding-update",
        10,
        3600,
      ))
    )
      throw new InputError("Please wait before sending another update.", 429);
    const data = applicantChanges(body, token.kind),
      hash = payloadHash(data);
    const table =
      token.kind === "application" ? "applications" : "directory_claims";
    client = await getPool().connect();
    await client.query("BEGIN");
    const row = (
      await client.query(`SELECT * FROM ${table} WHERE id=$1 FOR UPDATE`, [
        token.id,
      ])
    ).rows[0];
    if (!row) throw new InputError("Request not found.", 404);
    const previous = (
      await client.query(
        "SELECT kind,record_id,payload_hash FROM directory_onboarding_updates WHERE id=$1",
        [body.request_id],
      )
    ).rows[0];
    if (previous) {
      if (
        previous.kind !== token.kind ||
        previous.record_id !== token.id ||
        previous.payload_hash !== hash
      )
        throw new InputError(
          "Retry the original update or start a new update.",
          409,
        );
      await client.query("COMMIT");
      return NextResponse.json(
        { success: true, message: "Your update is saved for review." },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    if (!["pending", "needs_information"].includes(row.status))
      throw new InputError(
        "This request has already been decided. Use the listing claim option or contact support.",
        409,
      );
    if (body.revision !== requestRevision(row))
      throw new InputError(
        "This request changed. Refresh its status before sending your update.",
        409,
      );
    const changed = Object.fromEntries(
      Object.entries(data.changes).filter(
        ([k, v]) => JSON.stringify(v) !== JSON.stringify(row[k]),
      ),
    );
    const at = new Date().toISOString(),
      update = {
        note: data.note,
        evidence_url: data.evidence_url,
        submitted_at: at,
      };
    const details = { ...row.details, applicant_update: update };
    if (changed.website) details.website = changed.website;
    const values: any[] = [token.id, JSON.stringify(details)];
    const sets = ["details=$2::jsonb"];
    for (const [key, value] of Object.entries(changed)) {
      values.push(value);
      sets.push(`${key}=$${values.length}`);
    }
    if (
      ["street_address", "city", "state", "zip_code"].some((k) => k in changed)
    )
      sets.push("location_evidence=NULL", "location_confirmed_at=NULL");
    // The applicant cannot approve, change contact permission, ownership, or identity.
    await client.query(
      `UPDATE ${table} SET ${sets.join(",")} WHERE id=$1`,
      values,
    );
    await client.query(
      "INSERT INTO directory_onboarding_updates(id,kind,record_id,payload_hash,note,evidence_url,changes) VALUES($1,$2,$3,$4,$5,$6,$7)",
      [
        body.request_id,
        token.kind,
        token.id,
        hash,
        data.note,
        data.evidence_url,
        JSON.stringify(changed),
      ],
    );
    await client.query(
      "INSERT INTO directory_review_audit(kind,record_id,actor,action,note,before_data,after_data) VALUES($1,$2,'Applicant via private status link','information_supplied',$3,$4,$5)",
      [
        token.kind,
        token.id,
        data.note,
        JSON.stringify(
          Object.fromEntries(Object.keys(changed).map((k) => [k, row[k]])),
        ),
        JSON.stringify({
          changes: changed,
          evidence_url: data.evidence_url,
          update_id: body.request_id,
        }),
      ],
    );
    await client.query("COMMIT");
    return NextResponse.json(
      {
        success: true,
        message:
          "Your update is saved for review. Your existing request reference stays the same.",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    if (client) await client.query("ROLLBACK");
    return NextResponse.json(
      {
        error:
          e instanceof InputError
            ? e.message
            : "Unable to confirm your update. Retry the same information.",
      },
      { status: e instanceof InputError ? e.status : 503 },
    );
  } finally {
    client?.release();
  }
}
