import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { canReceiveQuote } from "@/lib/installer-contact";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const headers = { "Cache-Control": "no-store" };
  const id = request.nextUrl.searchParams.get("id");
  if (!id || id.length > 80)
    return NextResponse.json({ available: false }, { status: 400, headers });
  try {
    const { rows } = await getPool().query(
      "SELECT status,routing_email,quote_routing_enabled,owner_inquiry_paused,google_status FROM installers WHERE id::text=$1 LIMIT 1",
      [id],
    );
    return NextResponse.json(
      { available: !!rows[0] && canReceiveQuote(rows[0]) },
      { headers },
    );
  } catch {
    return NextResponse.json(
      { error: "Contact availability could not be checked." },
      { status: 503, headers },
    );
  }
}
