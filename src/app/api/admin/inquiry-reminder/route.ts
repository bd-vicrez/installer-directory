import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, adminIdentity } from "@/lib/admin-auth";
import { ownerOrigin } from "@/lib/owner-access";
import { getPool } from "@/lib/db";
import { rfqFetch, UUID } from "@/lib/directory-rfq";
import { InputError, readSmallJson } from "@/lib/onboarding";
export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  let c;
  try {
    ownerOrigin(request);
    const b = await readSmallJson(request, 1500);
    if (!UUID.test(b.job_id || "") || b.confirm !== true)
      throw new InputError("Confirm one reminder for this shop.");
    const r = await rfqFetch("/internal/directory-rfq/reminder-check", {
        job_id: b.job_id,
      }),
      data = await r.json();
    if (!r.ok)
      throw new InputError(
        typeof data.detail === "string"
          ? data.detail
          : "Eligibility cannot be confirmed.",
        r.status === 409 ? 409 : 503,
      );
    c = await getPool().connect();
    await c.query("BEGIN");
    await c.query("SELECT pg_advisory_xact_lock(19312,hashtext($1))", [
      String(data.submission_id),
    ]);
    const outcome = (
      await c.query(
        "SELECT state FROM directory_inquiry_followup WHERE submission_id=$1 FOR SHARE",
        [data.submission_id],
      )
    ).rows[0];
    if (outcome && ["booked", "declined"].includes(outcome.state))
      throw new InputError(
        "This inquiry already has a final staff outcome.",
        409,
      );
    const notice = (
      await c.query(
        "INSERT INTO directory_notifications(event_key,kind,record_id,recipient,reference,outcome) VALUES($1,'inquiry-reminder',$2,$3,$4,'inquiry_reminder') ON CONFLICT(event_key) DO NOTHING RETURNING id",
        [
          "inquiry-reminder:" + b.job_id,
          b.job_id,
          data.recipient,
          data.reference,
        ],
      )
    ).rows[0];
    if (notice)
      await c.query(
        "INSERT INTO directory_review_audit(kind,record_id,actor,action,note) VALUES('inquiry',$1,$2,'reminder_queued','One reminder requested after 48 elapsed hours with no shop response; eligibility checked again before delivery')",
        [String(data.submission_id), adminIdentity(request)!.username],
      );
    await c.query("COMMIT");
    return NextResponse.json(
      {
        success: true,
        queued: !!notice,
        message: notice
          ? "One reminder queued; recipient and response status will be rechecked before sending."
          : "A reminder already exists for this shop and inquiry. No second reminder was queued.",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    if (c) await c.query("ROLLBACK");
    return NextResponse.json(
      {
        error:
          e instanceof InputError ? e.message : "Reminder could not be queued.",
      },
      { status: e instanceof InputError ? e.status : 503 },
    );
  } finally {
    c?.release();
  }
}
