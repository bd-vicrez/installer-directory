import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getPool } from "@/lib/db";
import { verificationMetrics } from "@/lib/verification-metrics";
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth) return auth;
  try {
    const db = getPool();
    const [run, counts, metrics] = await Promise.all([
      db.query(
        "SELECT checked_at,ok,details FROM directory_operation_runs WHERE name='installer-verification'",
      ),
      db.query(
        "SELECT kind,state,count(*)::int AS count FROM directory_automation_cases WHERE kind IN ('application','claim') GROUP BY kind,state",
      ),
      verificationMetrics(db),
    ]);
    return NextResponse.json(
      { run: run.rows[0] || null, counts: counts.rows, metrics },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Verification status is unavailable." },
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
