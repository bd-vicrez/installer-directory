import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { InputError, readSmallJson, textField } from "@/lib/onboarding";
import { UUID, withinRateLimit } from "@/lib/directory-rfq";
import {
  lockOwner,
  ownerIdentity,
  ownerOrigin,
  ownerError,
  OWNER_HEADERS,
} from "@/lib/owner-access";
import { sanitizeShopPhoto } from "@/lib/shop-photos";
export async function POST(request: NextRequest) {
  let client;
  try {
    ownerOrigin(request);
    const owner = await ownerIdentity(request);
    if (!(await withinRateLimit(owner.id, "owner-photos", 30, 3600)))
      throw new InputError("Please wait before uploading more photos.", 429);
    if (request.nextUrl.searchParams.get("permission") !== "yes")
      throw new InputError("Confirm permission to publish this photo.");
    const caption = textField(
      request.nextUrl.searchParams.get("caption"),
      "project caption",
      5,
      200,
    );
    const reader = request.body?.getReader();
    if (!reader) throw new InputError("Choose a photo.");
    const chunks: Buffer[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 4 * 1024 * 1024) {
        await reader.cancel();
        throw new InputError("Choose a photo smaller than 4 MB.", 413);
      }
      chunks.push(Buffer.from(value));
    }
    const photo = await sanitizeShopPhoto(Buffer.concat(chunks));
    client = await getPool().connect();
    await client.query("BEGIN");
    await lockOwner(client, owner);
    await client.query("SELECT id FROM installers WHERE id=$1 FOR UPDATE", [
      owner.installer_id,
    ]);
    const count = Number(
      (
        await client.query(
          "SELECT count(*) FROM directory_shop_photos WHERE installer_id=$1",
          [owner.installer_id],
        )
      ).rows[0].count,
    );
    if (count >= 24)
      throw new InputError(
        "Your library holds 24 photos. Remove an unused photo before adding another.",
      );
    const id = randomUUID();
    await client.query(
      "INSERT INTO directory_shop_photos(id,installer_id,grant_id,caption,image,width,height) VALUES($1,$2,$3,$4,$5,$6,$7)",
      [
        id,
        owner.installer_id,
        owner.id,
        caption,
        photo.data,
        photo.width,
        photo.height,
      ],
    );
    await client.query("COMMIT");
    return NextResponse.json(
      { id, caption, width: photo.width, height: photo.height },
      { headers: OWNER_HEADERS },
    );
  } catch (e) {
    if (client) await client.query("ROLLBACK");
    return ownerError(e);
  } finally {
    client?.release();
  }
}
export async function DELETE(request: NextRequest) {
  let client;
  try {
    ownerOrigin(request);
    const owner = await ownerIdentity(request),
      b = await readSmallJson(request, 300);
    if (!UUID.test(b.id || "")) throw new InputError("Choose a photo.");
    client = await getPool().connect();
    await client.query("BEGIN");
    await lockOwner(client, owner);
    const shop = (
      await client.query(
        "SELECT owner_details FROM installers WHERE id=$1 FOR UPDATE",
        [owner.installer_id],
      )
    ).rows[0];
    const pending = (
      await client.query(
        "SELECT id FROM directory_claims WHERE installer_id=$1 AND status IN ('pending','needs_information','verified') AND (details->'photo_ids') ? $2 LIMIT 1",
        [owner.installer_id, b.id],
      )
    ).rows[0];
    if (shop?.owner_details?.photo_ids?.includes(b.id) || pending)
      throw new InputError(
        "This photo is published or awaiting review. Submit a profile update removing it first.",
        409,
      );
    await client.query(
      "DELETE FROM directory_shop_photos WHERE id=$1 AND installer_id=$2",
      [b.id, owner.installer_id],
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
