import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, adminIdentity } from "@/lib/admin-auth";
import { getPool } from "@/lib/db";
import { sameOrigin, rfqFetch } from "@/lib/directory-rfq";
import { readSmallJson, textField, InputError } from "@/lib/onboarding";
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth) return auth;
  const selected = request.nextUrl.searchParams.get("id");
  if (selected !== null && !/^[1-9][0-9]{0,14}$/.test(selected))
    return NextResponse.json(
      { error: "Choose a valid inquiry" },
      { status: 400 },
    );
  try {
    return NextResponse.json(
      {
        records: (
          await getPool().query(
            "SELECT * FROM directory_inquiry_followup WHERE ($1::bigint IS NULL OR submission_id=$1) ORDER BY updated_at DESC LIMIT 200",
            [selected],
          )
        ).rows,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Follow-up unavailable" },
      { status: 503 },
    );
  }
}
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth) return auth;
  let client;
  try {
    if (!sameOrigin(request)) throw new InputError("Invalid origin", 403);
    const b = await readSmallJson(request, 2500),
      id = b.submission_id;
    if (
      !Number.isSafeInteger(id) ||
      id < 1 ||
      !["new", "contacted", "quoted", "booked", "declined"].includes(b.state)
    )
      throw new InputError("Choose a valid inquiry and outcome");
    const publicMessage = textField(
      b.public_message,
      "customer update",
      0,
      1000,
    );
    const note = textField(b.note, "outcome evidence", 10, 1000),
      actor = textField(
        adminIdentity?.(request)?.username || b.actor,
        "reviewer",
        2,
        100,
      );
    const due = b.next_followup_at ? new Date(b.next_followup_at) : null;
    if (due && !Number.isFinite(due.getTime()))
      throw new InputError("Choose a valid follow-up date");
    const r = await rfqFetch("/internal/directory-rfq/requests?id=" + id);
    if (!r.ok)
      throw new InputError(
        "Confirm the saved inquiry before recording an outcome",
        503,
      );
    const records = (await r.json()).requests;
    if (
      !Array.isArray(records) ||
      !records.some((x: any) => x.submission_id === id)
    )
      throw new InputError(
        "Inquiry is not available in the current review queue",
        404,
      );
    client = await getPool().connect();
    await client.query("BEGIN");
    // Serialize even the first outcome for an inquiry, when no row exists to lock yet.
    await client.query("SELECT pg_advisory_xact_lock(19312,hashtext($1))", [
      String(id),
    ]);
    const prior = (
      await client.query(
        "SELECT * FROM directory_inquiry_followup WHERE submission_id=$1 FOR UPDATE",
        [id],
      )
    ).rows[0];
    await client.query(
      `INSERT INTO directory_inquiry_followup(submission_id,state,note,actor,next_followup_at) VALUES($1,$2,$3,$4,$5) ON CONFLICT(submission_id) DO UPDATE SET state=EXCLUDED.state,note=EXCLUDED.note,actor=EXCLUDED.actor,next_followup_at=EXCLUDED.next_followup_at,updated_at=NOW()`,
      [id, b.state, note, actor, due],
    );
    await client.query(
      "UPDATE directory_inquiry_followup SET public_message=$2 WHERE submission_id=$1",
      [id, publicMessage],
    );
    await client.query(
      "INSERT INTO directory_review_audit(kind,record_id,actor,action,note,before_data,after_data) VALUES('inquiry',$1,$2,$3,$4,$5,$6)",
      [
        String(id),
        actor,
        b.state,
        note,
        JSON.stringify(prior || null),
        JSON.stringify({
          state: b.state,
          next_followup_at: due,
          public_message: publicMessage,
        }),
      ],
    );
    await client.query("COMMIT");
    return NextResponse.json({ success: true });
  } catch (e) {
    if (client) await client.query("ROLLBACK");
    return NextResponse.json(
      { error: e instanceof InputError ? e.message : "Unable to save outcome" },
      { status: e instanceof InputError ? e.status : 503 },
    );
  } finally {
    client?.release();
  }
}
