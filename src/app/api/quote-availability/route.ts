import { NextRequest, NextResponse } from "next/server";
import { performance } from "node:perf_hooks";
import { getPool } from "@/lib/db-pool";
import { canReceiveQuote } from "@/lib/installer-contact";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const headers = { "Cache-Control": "no-store" };
  const id = request.nextUrl.searchParams.get("id");
  if (!id || id.length > 80)
    return NextResponse.json({ available: false }, { status: 400, headers });
  try {
    const started = performance.now();
    const client = await getPool().connect();
    const connected = performance.now();
    try {
      const { rows } = await client.query(
        "SELECT status,routing_email,quote_routing_enabled,owner_inquiry_paused,google_status FROM installers WHERE id::text=$1 LIMIT 1",
        [id],
      );
      const queried = performance.now();
      return NextResponse.json(
        { available: !!rows[0] && canReceiveQuote(rows[0]) },
        { headers: {
          ...headers,
          "Server-Timing": `connect;dur=${(connected - started).toFixed(1)}, query;dur=${(queried - connected).toFixed(1)}, total;dur=${(queried - started).toFixed(1)}`,
        } },
      );
    } finally {
      client.release();
    }
  } catch {
    return NextResponse.json(
      { error: "Contact availability could not be checked." },
      { status: 503, headers },
    );
  }
}
