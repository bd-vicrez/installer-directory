import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { rfqFetch } from "@/lib/directory-rfq";
import { getPool } from "@/lib/db";
import { performanceRows } from "@/lib/performance";
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth) return auth;
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const until = new Date(),
      since = new Date(until.getTime() - 30 * 86400000);
    const response = await rfqFetch(
      "/internal/directory-rfq/attribution?" +
        new URLSearchParams({
          since: since.toISOString(),
          until: until.toISOString(),
        }),
    );
    if (!response.ok) throw Error();
    const backend = await response.json();
    const [sessions, followups] = await Promise.all([
      getPool().query(
        `SELECT campaign_source AS source,acquisition_channel AS channel,count(DISTINCT session_id)::int AS sessions FROM directory_discovery_events WHERE event='session_start' AND created_at>=$1 AND created_at<$2 GROUP BY campaign_source,acquisition_channel`,
        [since, until],
      ),
      getPool().query(
        "SELECT submission_id,state FROM directory_inquiry_followup WHERE submission_id=ANY($1::bigint[])",
        [backend.requests.map((r: any) => r.submission_id)],
      ),
    ]);
    return NextResponse.json(
      {
        since,
        until,
        rows: performanceRows(sessions.rows, backend.requests, followups.rows),
        limited: backend.limited === true,
      },
      { headers },
    );
  } catch {
    return NextResponse.json(
      { error: "Traffic and inquiry outcomes are temporarily unavailable." },
      { status: 503, headers },
    );
  }
}
