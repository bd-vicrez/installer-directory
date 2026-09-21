import { listingFreshness } from "@/lib/listing-freshness";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { requireAdmin, adminIdentity } from "@/lib/admin-auth";
import { InputError, readSmallJson, textField } from "@/lib/onboarding";
import { OWNER_HEADERS, ownerError, ownerOrigin } from "@/lib/owner-access";
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth) return auth;
  try {
    const grants = (
      await getPool().query(
        `SELECT g.*,i.business_name,i.slug,i.owner_inquiry_paused FROM directory_owner_grants g JOIN installers i ON i.id=g.installer_id ORDER BY g.created_at DESC LIMIT 200`,
      )
    ).rows;
    const evidence = (
      await getPool()
        .query(`SELECT 'application' AS kind,a.id::text AS id,a.installer_id,a.email,a.business_name AS name,i.business_name,a.application_id AS reference FROM applications a JOIN installers i ON i.id=a.installer_id WHERE a.status='approved' AND a.reviewed_at IS NOT NULL AND i.status NOT IN ('removed','non_us_excluded')
      UNION ALL SELECT 'claim',c.id,c.installer_id,c.email,c.name,i.business_name,'CLM-'||upper(left(c.id,8)) FROM directory_claims c JOIN installers i ON i.id=c.installer_id WHERE c.status IN ('verified','resolved') AND c.verification_channel IN ('business-domain-email','existing-business-phone','business-document-review') AND length(c.verification_evidence)>=20 AND i.status NOT IN ('removed','non_us_excluded') LIMIT 300`)
    ).rows;
    const listings = (
      await getPool().query(
        "SELECT * FROM installers WHERE id=ANY($1::text[])",
        [grants.map((g) => g.installer_id)],
      )
    ).rows;
    for (const g of grants)
      g.freshness = listingFreshness(
        listings.find((i) => i.id === g.installer_id),
      );
    return NextResponse.json({ grants, evidence }, { headers: OWNER_HEADERS });
  } catch (e) {
    return ownerError(e);
  }
}
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth) return auth;
  let client;
  try {
    ownerOrigin(request);
    const b = await readSmallJson(request, 4000),
      note = textField(b.note, "access review note", 20, 1500),
      actor = adminIdentity(request)!.username;
    client = await getPool().connect();
    await client.query("BEGIN");
    let record;
    if (b.action === "revoke") {
      record = (
        await client.query(
          "UPDATE directory_owner_grants SET active=false,version=version+1,actor=$2,note=$3,updated_at=NOW() WHERE id=$1 RETURNING id,installer_id,email",
          [textField(b.id, "access ID", 36, 36), actor, note],
        )
      ).rows[0];
      if (!record) throw new InputError("Access not found.", 404);
    } else if (b.action === "grant") {
      if (b.confirm_authority !== true)
        throw new InputError(
          "Confirm that the reviewed requester is authorized to manage this shop.",
        );
      const id = textField(b.evidence_id, "review reference", 1, 80);
      let evidence;
      if (b.evidence_kind === "application")
        evidence = (
          await client.query(
            `SELECT a.installer_id,a.email,a.business_name AS name FROM applications a JOIN installers i ON i.id=a.installer_id WHERE a.id::text=$1 AND a.status='approved' AND a.reviewed_at IS NOT NULL AND i.status NOT IN ('removed','non_us_excluded') FOR SHARE OF a,i`,
            [id],
          )
        ).rows[0];
      else if (b.evidence_kind === "claim")
        evidence = (
          await client.query(
            `SELECT c.installer_id,c.email,c.name FROM directory_claims c JOIN installers i ON i.id=c.installer_id WHERE c.id=$1 AND c.status IN ('verified','resolved') AND c.verification_channel IN ('business-domain-email','existing-business-phone','business-document-review') AND length(c.verification_evidence)>=20 AND i.status NOT IN ('removed','non_us_excluded') FOR SHARE OF c,i`,
            [id],
          )
        ).rows[0];
      if (!evidence)
        throw new InputError(
          "Select an approved application or independently verified ownership review.",
        );
      record = (
        await client.query(
          `INSERT INTO directory_owner_grants(id,installer_id,email,name,evidence_kind,evidence_id,actor,note) VALUES($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT(installer_id,email) DO UPDATE SET active=true,version=directory_owner_grants.version+1,evidence_kind=EXCLUDED.evidence_kind,evidence_id=EXCLUDED.evidence_id,actor=EXCLUDED.actor,note=EXCLUDED.note,name=EXCLUDED.name,updated_at=NOW() RETURNING id,installer_id,email`,
          [
            randomUUID(),
            evidence.installer_id,
            evidence.email.toLowerCase(),
            evidence.name,
            b.evidence_kind,
            id,
            actor,
            note,
          ],
        )
      ).rows[0];
    } else throw new InputError("Choose grant or revoke.");
    await client.query(
      `INSERT INTO directory_review_audit(kind,record_id,actor,action,note,after_data) VALUES('owner-access',$1,$2,$3,$4,$5)`,
      [record.id, actor, b.action, note, JSON.stringify(record)],
    );
    await client.query("COMMIT");
    return NextResponse.json({ success: true }, { headers: OWNER_HEADERS });
  } catch (e) {
    if (client) await client.query("ROLLBACK");
    return ownerError(e);
  } finally {
    client?.release();
  }
}
