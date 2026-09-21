import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { requireAdmin, adminIdentity } from "@/lib/admin-auth";
import { sameOrigin } from "@/lib/directory-rfq";
import {
  InputError,
  readSmallJson,
  textField,
  projectExamples,
} from "@/lib/onboarding";
import { photoIds, validatePhotos } from "@/lib/shop-photos";
import { refreshContactPages } from "@/lib/contact-refresh";
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth) return auth;
  const id = request.nextUrl.searchParams.get("id");
  if (id !== null && !/^[0-9a-f-]{36}$/i.test(id))
    return NextResponse.json(
      { error: "Choose a valid request" },
      { status: 400 },
    );
  try {
    const rows = (
      await getPool().query(
        `SELECT c.*,(SELECT COALESCE(jsonb_agg(jsonb_build_object('id',p.id,'caption',p.caption)),'[]'::jsonb) FROM directory_shop_photos p WHERE p.installer_id=c.installer_id AND (c.details->'photo_ids') ? p.id::text) AS proposed_photos,i.business_name,i.slug,EXTRACT(EPOCH FROM NOW()-c.submitted_at)/86400 AS age_days FROM directory_claims c JOIN installers i ON i.id=c.installer_id WHERE ($1::text IS NULL OR c.id::text=$1) ORDER BY c.submitted_at LIMIT 200`,
        [id],
      )
    ).rows;
    return NextResponse.json(
      { claims: rows },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "Queue unavailable." }, { status: 503 });
  }
}
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth) return auth;
  let client;
  try {
    if (!sameOrigin(request)) throw new InputError("Invalid origin.", 403);
    const b = await readSmallJson(request),
      id = textField(b.id, "claim", 1, 80),
      reviewer = textField(
        adminIdentity?.(request)?.username || b.reviewer,
        "reviewer",
        2,
        100,
      ),
      note = textField(b.note, "review note", 10, 1500),
      status = textField(b.status, "status", 1, 30),
      message = textField(b.public_message, "status message", 0, 500);
    if (
      ![
        "pending",
        "needs_information",
        "verified",
        "resolved",
        "rejected",
      ].includes(status)
    )
      throw new InputError("Choose a review status.");
    const channel = textField(
        b.verification_channel,
        "verification channel",
        0,
        100,
      ),
      evidence = textField(
        b.verification_evidence,
        "verification evidence",
        0,
        1500,
      );
    client = await getPool().connect();
    await client.query("BEGIN");
    const claim = (
      await client.query(
        "SELECT * FROM directory_claims WHERE id=$1 FOR UPDATE",
        [id],
      )
    ).rows[0];
    if (!claim) throw new InputError("Claim not found.", 404);
    const ownerVerified = claim.owner_grant_id
      ? !!(
          await client.query(
            "SELECT id FROM directory_owner_grants WHERE id=$1 AND installer_id=$2 AND email=$3 AND active FOR SHARE",
            [claim.owner_grant_id, claim.installer_id, claim.email],
          )
        ).rows[0]
      : false;
    if (
      ["verified", "resolved"].includes(status) &&
      (!(
        [
          "business-domain-email",
          "existing-business-phone",
          "business-document-review",
        ].includes(channel) ||
        (channel === "owner-portal" && ownerVerified)
      ) ||
        evidence.length < 20 ||
        b.confirm_identity !== true)
    )
      throw new InputError(
        "Record independent business-controlled verification before resolving a claim. Public contact details alone are not proof.",
      );
    const priorListing =
      b.publish_details === true
        ? (
            await client.query(
              "SELECT owner_details,owner_details_confirmed_at,install_capabilities,service_source FROM installers WHERE id=$1 FOR UPDATE",
              [claim.installer_id],
            )
          ).rows[0]
        : null;
    if (b.publish_details === true) {
      if (status !== "resolved" || b.confirm_publish !== true)
        throw new InputError(
          "Resolve ownership and confirm the exact submitted details for publication.",
        );
      if (claim.details.photo_ids !== undefined)
        await validatePhotos(
          client,
          claim.installer_id,
          photoIds(claim.details.photo_ids),
        );
      const projects = projectExamples(claim.details.projects) || [];
      if (
        projects.length &&
        (b.confirm_projects_reviewed !== true ||
          !claim.owner_grant_id ||
          claim.details.projects_confirmed !== true ||
          projects.some(
            (p: any) => !(claim.details.photo_ids || []).includes(p.photo_id),
          ))
      )
        throw new InputError(
          "Review the real completed project details and associated photos before publication.",
        );
      await client.query(
        "UPDATE installers SET owner_details=$1,owner_details_confirmed_at=NOW(),updated_at=NOW() WHERE id=$2",
        [JSON.stringify(claim.details), claim.installer_id],
      );
      if (claim.details.services?.length)
        await client.query(
          "UPDATE installers SET install_capabilities=$1,service_source='Shop-declared; ownership reviewed' WHERE id=$2",
          [claim.details.services, claim.installer_id],
        );
    }
    await client.query(
      "UPDATE directory_claims SET status=$1,reviewer=$2,review_note=$3,verification_channel=$4,verification_evidence=$5,public_message=$6,reviewed_at=NOW() WHERE id=$7",
      [status, reviewer, note, channel, evidence, message, id],
    );
    await client.query(
      "INSERT INTO directory_review_audit(kind,record_id,actor,action,note,before_data,after_data) VALUES('claim',$1,$2,$3,$4,$5,$6)",
      [
        id,
        reviewer,
        status,
        note,
        JSON.stringify({ status: claim.status, listing: priorListing }),
        JSON.stringify({
          status,
          channel,
          evidence,
          publish_details: b.publish_details === true,
          details: b.publish_details === true ? claim.details : null,
        }),
      ],
    );
    await client.query("COMMIT");
    refreshContactPages("");
    return NextResponse.json({ success: true });
  } catch (e) {
    if (client) await client.query("ROLLBACK");
    return NextResponse.json(
      {
        error:
          e instanceof InputError ? e.message : "Review could not be saved.",
      },
      { status: e instanceof InputError ? e.status : 503 },
    );
  } finally {
    client?.release();
  }
}
