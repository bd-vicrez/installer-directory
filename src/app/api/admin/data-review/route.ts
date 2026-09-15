import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { sameOrigin } from "@/lib/directory-rfq";
import { InputError, readSmallJson, textField } from "@/lib/onboarding";
import { refreshContactPages } from "@/lib/contact-refresh";
import { addressCandidate } from "@/lib/address-review";
export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth) return auth;
  try {
    const rows = (
      await getPool().query(
        "SELECT r.*,i.business_name,i.slug,i.street_address,i.city,i.state,i.zip_code FROM directory_data_review r JOIN installers i ON i.id=r.installer_id ORDER BY r.created_at LIMIT 100",
      )
    ).rows;
    return NextResponse.json(
      { records: rows },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "Queue unavailable." }, { status: 503 });
  }
}
export async function PATCH(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth) return auth;
  let db;
  try {
    if (!sameOrigin(request)) throw new InputError("Invalid origin.", 403);
    const b = await readSmallJson(request),
      reviewer = textField(b.reviewer, "reviewer", 2, 100),
      note = textField(b.note, "review note", 10, 1500);
    db = await getPool().connect();
    await db.query("BEGIN");
    const row = (
      await db.query(
        "SELECT * FROM directory_data_review WHERE id=$1 FOR UPDATE",
        [b.id],
      )
    ).rows[0];
    if (!row) throw new InputError("Record not found.", 404);
    const shop = (
      await db.query("SELECT * FROM installers WHERE id=$1 FOR UPDATE", [
        row.installer_id,
      ])
    ).rows[0];
    if (b.action === "locate") {
      const location = await addressCandidate(shop);
      await db.query(
        "UPDATE directory_data_review SET candidate=$1 WHERE id=$2",
        [JSON.stringify(location), row.id],
      );
      await db.query("COMMIT");
      return NextResponse.json({ location });
    }
    if (!["corrected", "held"].includes(b.status))
      throw new InputError("Choose correct or hold.");
    if (b.status === "corrected") {
      const c = row.candidate;
      if (
        !c?.eligible ||
        !Number.isFinite(c.lat) ||
        !Number.isFinite(c.lng) ||
        b.confirm_location !== true
      )
        throw new InputError(
          "Review a confirmed address candidate before correction.",
        );
      await db.query(
        "UPDATE installers SET lat=$1,lng=$2,location_evidence=$3,updated_at=NOW() WHERE id=$4",
        [c.lat, c.lng, JSON.stringify(c), shop.id],
      );
    }
    await db.query(
      "UPDATE directory_data_review SET status=$1,reviewer=$2,note=$3,reviewed_at=NOW() WHERE id=$4",
      [b.status, reviewer, note, row.id],
    );
    await db.query(
      "INSERT INTO directory_review_audit(kind,record_id,actor,action,note,before_data,after_data) VALUES('location',$1,$2,$3,$4,$5,$6)",
      [
        shop.id,
        reviewer,
        b.status,
        note,
        JSON.stringify({
          lat: shop.lat,
          lng: shop.lng,
          location_evidence: shop.location_evidence,
        }),
        JSON.stringify(row.candidate),
      ],
    );
    await db.query("COMMIT");
    refreshContactPages(shop.slug);
    return NextResponse.json({ success: true });
  } catch (e) {
    if (db) await db.query("ROLLBACK");
    return NextResponse.json(
      {
        error:
          e instanceof InputError ? e.message : "Review could not be saved.",
      },
      { status: e instanceof InputError ? e.status : 503 },
    );
  } finally {
    db?.release();
  }
}
