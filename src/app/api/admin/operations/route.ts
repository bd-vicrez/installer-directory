import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getPool } from "@/lib/db";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth) return auth;
  try {
    const db = getPool();
    const [
      notifications,
      states,
      runs,
      events,
      funnel,
      applications,
      claims,
      followup,
      saved,
    ] = await Promise.all([
      db.query(
        "SELECT id,kind,reference,outcome,state,attempts,last_error,created_at,accepted_at,delivered_at,checked_at FROM directory_notifications ORDER BY created_at DESC LIMIT 100",
      ),
      db.query(
        "SELECT state,COUNT(*)::int AS count FROM directory_notifications GROUP BY state",
      ),
      db.query(
        "SELECT name,checked_at,ok,details FROM directory_operation_runs ORDER BY name",
      ),
      db.query(
        "SELECT event,COUNT(*)::int AS events,COUNT(DISTINCT session_id)::int AS sessions FROM directory_discovery_events WHERE created_at>NOW()-INTERVAL '30 days' GROUP BY event ORDER BY event",
      ),
      db.query(`WITH s AS (SELECT session_id,bool_or(event='search') AS searched,bool_or(event IN ('phone_click','directions_click','website_click')) AS contacted,bool_or(event='search_empty') AS empty FROM directory_discovery_events WHERE created_at>NOW()-INTERVAL '30 days' GROUP BY session_id)
     SELECT COUNT(*) FILTER(WHERE searched)::int AS search_sessions,COUNT(*) FILTER(WHERE searched AND contacted)::int AS search_contact_sessions,COUNT(*) FILTER(WHERE searched AND empty)::int AS zero_result_sessions FROM s`),
      db.query(
        "SELECT status,COUNT(*)::int AS count,ROUND(MAX(EXTRACT(EPOCH FROM NOW()-submitted_at)/86400)::numeric,1) AS oldest_days FROM applications WHERE status IN ('pending','needs_information') GROUP BY status",
      ),
      db.query(
        "SELECT status,COUNT(*)::int AS count,ROUND(MAX(EXTRACT(EPOCH FROM NOW()-submitted_at)/86400)::numeric,1) AS oldest_days FROM directory_claims WHERE status IN ('pending','needs_information','verified') GROUP BY status",
      ),
      db.query(
        "SELECT state,COUNT(*)::int AS count FROM directory_inquiry_followup GROUP BY state",
      ),
      db.query(
        "SELECT (SELECT COUNT(*)::int FROM applications WHERE submitted_at>NOW()-INTERVAL '30 days') AS applications, (SELECT COUNT(*)::int FROM directory_claims WHERE submitted_at>NOW()-INTERVAL '30 days') AS claims",
      ),
    ]);
    return NextResponse.json(
      {
        notifications_enabled:
          process.env.DIRECTORY_NOTIFICATIONS_ENABLED === "1",
        notifications: notifications.rows,
        notification_states: states.rows,
        runs: runs.rows,
        events: events.rows,
        funnel: funnel.rows[0],
        applications: applications.rows,
        claims: claims.rows,
        followup: followup.rows,
        saved: saved.rows[0],
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Operations report unavailable" },
      { status: 503 },
    );
  }
}
