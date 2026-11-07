import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getPool } from "@/lib/db-pool";
import { rfqFetch } from "@/lib/directory-rfq";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  const params = new URLSearchParams();
  for (const key of request.nextUrl.searchParams.keys()) {
    if (!["scope", "before", "snapshot", "limit", "id"].includes(key))
      return NextResponse.json(
        { error: "Choose valid inquiry filters." },
        { status: 400, headers },
      );
  }
  for (const key of ["scope", "before", "snapshot", "limit", "id"]) {
    const values = request.nextUrl.searchParams.getAll(key);
    if (values.length > 1 || (values[0]?.length || 0) > 30)
      return NextResponse.json(
        { error: "Choose valid inquiry filters." },
        { status: 400, headers },
      );
    if (values.length) params.set(key, values[0]);
  }
  try {
    const response = await rfqFetch(
      "/internal/directory-rfq/workspace?" + params,
    );
    if (response.status === 400)
      return NextResponse.json(
        { error: "Choose valid inquiry filters." },
        { status: 400, headers },
      );
    if (!response.ok) throw Error();
    const data = await response.json();
    if (
      !Array.isArray(data.items) ||
      data.items.length > 50 ||
      data.version !== "workspace-v1"
    )
      throw Error();
    const ids = data.items.map((item: any) => item.submission_id);
    const shops = [
      ...new Set(
        data.items
          .flatMap((item: any) => item.deliveries.map((d: any) => d.target_id))
          .filter(Boolean),
      ),
    ];
    const pool = getPool();
    const [followups, cases, names] = await Promise.all([
      pool.query(
        "SELECT submission_id,state,next_followup_at,updated_at FROM directory_inquiry_followup WHERE submission_id=ANY($1::bigint[])",
        [ids],
      ),
      pool.query(
        "SELECT COALESCE(a.task_key,c.task_key) task_key,a.actor,s.display_name,c.owner_name,c.paused,c.zendesk_ticket_id FROM directory_action_assignments a FULL JOIN directory_automation_cases c ON c.task_key=a.task_key LEFT JOIN directory_staff_users s ON s.id=a.assigned_to WHERE COALESCE(a.task_key,c.task_key)=ANY($1::text[])",
        [ids.map((id: number) => "inquiry:" + id)],
      ),
      pool.query(
        "SELECT id,business_name FROM installers WHERE id::text=ANY($1::text[])",
        [shops],
      ),
    ]);
    data.items = data.items.map((item: any) => ({
      ...item,
      followup:
        followups.rows.find(
          (r: any) => String(r.submission_id) === String(item.submission_id),
        ) || null,
      ownership:
        cases.rows.find(
          (r: any) => r.task_key === "inquiry:" + item.submission_id,
        ) || null,
      deliveries: item.deliveries.map((d: any) => ({
        ...d,
        business_name:
          names.rows.find((r: any) => String(r.id) === String(d.target_id))
            ?.business_name || "Shop record unavailable",
      })),
    }));
    return NextResponse.json(data, { headers });
  } catch {
    return NextResponse.json(
      {
        error:
          "The inquiry workspace could not refresh. Previously displayed data may be out of date.",
      },
      { status: 503, headers },
    );
  }
}
