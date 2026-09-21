import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getPool } from "@/lib/db";
import { rfqFetch } from "@/lib/directory-rfq";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;
  const headers = { "Cache-Control": "private, no-store" };
  const id = request.nextUrl.searchParams.get("id");
  if (id !== null && !/^[1-9][0-9]{0,14}$/.test(id))
    return NextResponse.json(
      { error: "Choose a valid inquiry" },
      { status: 400 },
    );
  try {
    const response = await rfqFetch(
      "/internal/directory-rfq/requests" + (id ? "?id=" + id : ""),
    );
    if (!response.ok) throw new Error();
    const data = await response.json();
    const states = (
      await getPool().query(
        "SELECT record_id,state FROM directory_notifications WHERE kind='inquiry-reminder' AND record_id=ANY($1::text[])",
        [
          data.requests.flatMap((r: any) =>
            r.deliveries.map((d: any) => d.job_id),
          ),
        ],
      )
    ).rows;
    for (const row of data.requests)
      for (const delivery of row.deliveries)
        delivery.reminder_state =
          states.find((s) => s.record_id === delivery.job_id)?.state || null;
    return NextResponse.json(data, { headers });
  } catch {
    return NextResponse.json(
      { error: "Inquiry status is temporarily unavailable." },
      { status: 503, headers },
    );
  }
}
