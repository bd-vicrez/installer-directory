import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getPool } from "@/lib/db";
export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth) return auth;
  const kind = request.nextUrl.searchParams.get("kind"),
    record = request.nextUrl.searchParams.get("record");
  if (
    !["application", "claim", "location", "installer"].includes(kind || "") ||
    !record ||
    record.length > 100
  )
    return NextResponse.json(
      { error: "Choose a review record." },
      { status: 400 },
    );
  try {
    const rows = (
      await getPool().query(
        "SELECT actor,action,note,created_at FROM directory_review_audit WHERE kind=$1 AND record_id=$2 ORDER BY created_at DESC LIMIT 50",
        [kind, record],
      )
    ).rows;
    return NextResponse.json(
      { history: rows },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "History unavailable." },
      { status: 503 },
    );
  }
}
