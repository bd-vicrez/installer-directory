import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { UUID } from "@/lib/directory-rfq";
import { requireAdmin } from "@/lib/admin-auth";
import { ownerIdentity } from "@/lib/owner-access";
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const headers = {
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow",
  };
  if (!UUID.test(id)) return new NextResponse(null, { status: 404, headers });
  try {
    const row = (
      await getPool().query(
        `SELECT p.image,p.installer_id,(i.status='active' AND i.owner_details_confirmed_at IS NOT NULL AND (i.owner_details->'photo_ids') ? p.id::text) AS published FROM directory_shop_photos p JOIN installers i ON i.id=p.installer_id WHERE p.id=$1`,
        [id],
      )
    ).rows[0];
    if (!row) return new NextResponse(null, { status: 404, headers });
    if (!row.published) {
      let authorized = false;
      if (request.cookies.get("admin_token"))
        authorized = !(await requireAdmin(request));
      if (!authorized)
        try {
          authorized =
            (await ownerIdentity(request)).installer_id === row.installer_id;
        } catch {
          /* private photo remains inaccessible */
        }
      if (!authorized) return new NextResponse(null, { status: 404, headers });
    }
    return new NextResponse(new Uint8Array(row.image), {
      headers: {
        ...headers,
        "Content-Type": "image/webp",
        "Content-Length": String(row.image.length),
      },
    });
  } catch {
    return new NextResponse(null, { status: 503, headers });
  }
}
