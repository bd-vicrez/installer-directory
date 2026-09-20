import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { UUID } from "@/lib/directory-rfq";
import {
  InputError,
  readSmallJson,
  ownerDetails,
  payloadHash,
  textField,
} from "@/lib/onboarding";
import {
  lockOwner,
  ownerIdentity,
  ownerOrigin,
  ownerError,
  OWNER_HEADERS,
} from "@/lib/owner-access";
import { photoIds, validatePhotos } from "@/lib/shop-photos";
import { canReceiveQuote } from "@/lib/installer-contact";
import { refreshContactPages } from "@/lib/contact-refresh";
export async function GET(request: NextRequest) {
  try {
    const owner = await ownerIdentity(request),
      pool = getPool();
    const shop = (
      await pool.query(
        "SELECT id,business_name,slug,owner_details,owner_inquiry_paused,quote_routing_enabled,status,routing_email,google_status FROM installers WHERE id=$1",
        [owner.installer_id],
      )
    ).rows[0];
    const photos = (
      await pool.query(
        "SELECT id,caption,width,height,created_at FROM directory_shop_photos WHERE installer_id=$1 ORDER BY created_at DESC",
        [owner.installer_id],
      )
    ).rows;
    const requests = (
      await pool.query(
        "SELECT id,status,details,correction,public_message,submitted_at FROM directory_claims WHERE installer_id=$1 AND owner_grant_id=$2 ORDER BY submitted_at DESC LIMIT 20",
        [owner.installer_id, owner.id],
      )
    ).rows;
    return NextResponse.json(
      {
        shop: {
          id: shop.id,
          business_name: shop.business_name,
          slug: shop.slug,
          owner_details: shop.owner_details,
          paused: shop.owner_inquiry_paused,
          accepting: canReceiveQuote(shop),
        },
        photos,
        requests,
      },
      { headers: OWNER_HEADERS },
    );
  } catch (e) {
    return ownerError(e);
  }
}
export async function POST(request: NextRequest) {
  let client;
  try {
    ownerOrigin(request);
    const owner = await ownerIdentity(request),
      b = await readSmallJson(request);
    client = await getPool().connect();
    await client.query("BEGIN");
    await lockOwner(client, owner);
    const shop = (
      await client.query("SELECT * FROM installers WHERE id=$1 FOR UPDATE", [
        owner.installer_id,
      ])
    ).rows[0];
    if (!shop || ["removed", "non_us_excluded"].includes(shop.status))
      throw new InputError("Listing unavailable.", 404);
    if (b.action === "availability") {
      if (typeof b.paused !== "boolean")
        throw new InputError("Choose your inquiry availability.");
      await client.query(
        "UPDATE installers SET owner_inquiry_paused=$2,updated_at=NOW() WHERE id=$1",
        [owner.installer_id, b.paused],
      );
      if (shop.owner_inquiry_paused !== b.paused)
        await client.query(
          `INSERT INTO directory_review_audit(kind,record_id,actor,action,note,before_data,after_data) VALUES('owner-availability',$1,$2,$3,'Owner changed new inquiry availability',$4,$5)`,
          [
            owner.installer_id,
            "owner:" + owner.id,
            b.paused ? "pause" : "resume",
            JSON.stringify({ paused: shop.owner_inquiry_paused }),
            JSON.stringify({ paused: b.paused }),
          ],
        );
      await client.query("COMMIT");
      refreshContactPages(shop.slug);
      return NextResponse.json(
        {
          success: true,
          paused: b.paused,
          accepting: canReceiveQuote({
            ...shop,
            owner_inquiry_paused: b.paused,
          }),
        },
        { headers: OWNER_HEADERS },
      );
    }
    if (
      b.action !== "proposal" ||
      b.agreement !== true ||
      !UUID.test(b.request_id || "")
    )
      throw new InputError(
        "Confirm the publication agreement and request reference.",
      );
    const ids = photoIds(b.photo_ids || []);
    await validatePhotos(client, owner.installer_id, ids);
    const details = {
      ...shop.owner_details,
      ...ownerDetails(b),
      photo_ids: ids,
    };
    const correction = textField(b.correction, "change summary", 10, 2000),
      hash = payloadHash({ details, correction, owner: owner.id });
    const old = (
      await client.query(
        "SELECT id,payload_hash FROM directory_claims WHERE request_id=$1",
        [b.request_id],
      )
    ).rows[0];
    if (old) {
      if (old.payload_hash !== hash)
        throw new InputError(
          "This request reference was already used. Reload before submitting different changes.",
          409,
        );
      await client.query("COMMIT");
      return NextResponse.json(
        { success: true, reference: "CLM-" + old.id.slice(0, 8).toUpperCase() },
        { headers: OWNER_HEADERS },
      );
    }
    const pending = (
      await client.query(
        "SELECT id FROM directory_claims WHERE installer_id=$1 AND owner_grant_id IS NOT NULL AND status IN ('pending','needs_information','verified') LIMIT 1",
        [owner.installer_id],
      )
    ).rows[0];
    if (pending)
      throw new InputError(
        "A profile update is already awaiting review. Contact support with its reference to add information.",
        409,
      );
    const id = randomUUID();
    await client.query(
      `INSERT INTO directory_claims(id,request_id,payload_hash,installer_id,name,email,relationship,correction,details,consent_version,owner_grant_id) VALUES($1,$2,$3,$4,$5,$6,'Verified owner portal',$7,$8,'owner-profile-v1',$9)`,
      [
        id,
        b.request_id,
        hash,
        owner.installer_id,
        owner.name,
        owner.email,
        correction,
        JSON.stringify(details),
        owner.id,
      ],
    );
    await client.query("COMMIT");
    return NextResponse.json(
      { success: true, reference: "CLM-" + id.slice(0, 8).toUpperCase() },
      { headers: OWNER_HEADERS },
    );
  } catch (e) {
    if (client) await client.query("ROLLBACK");
    return ownerError(e);
  } finally {
    client?.release();
  }
}
