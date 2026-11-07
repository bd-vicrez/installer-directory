import { NextRequest, NextResponse } from "next/server";
import { performance } from "node:perf_hooks";
import { getPool } from "@/lib/db-pool";
import { canReceiveQuote } from "@/lib/installer-contact";
import { rfqFetch } from "@/lib/directory-rfq";
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
    let rows: any[];
    try {
      ({ rows } = await client.query(
        "SELECT status,routing_email,quote_routing_enabled,owner_inquiry_paused,google_status FROM installers WHERE id::text=$1 LIMIT 1",
        [id],
      ));
    } finally { client.release(); }
      const queried = performance.now();
      let available = !!rows[0] && canReceiveQuote(rows[0]);
      if (available) {
        const result = await rfqFetch('/internal/directory-rfq/recipient-availability', {installer_id:id});
        if (!result.ok) throw new Error('Availability unavailable');
        const checked = await result.json();
        if (typeof checked.available !== 'boolean') throw new Error('Availability unavailable');
        available = checked.available;
      }
      return NextResponse.json(
        { available },
        { headers: {
          ...headers,
          "Server-Timing": `connect;dur=${(connected - started).toFixed(1)}, query;dur=${(queried - connected).toFixed(1)}, total;dur=${(performance.now() - started).toFixed(1)}`,
        } },
      );
  } catch {
    return NextResponse.json(
      { error: "Contact availability could not be checked." },
      { status: 503, headers },
    );
  }
}
