import { NextRequest, NextResponse } from "next/server";
import { ownerOrigin } from "@/lib/owner-access";
import { InputError, readSmallJson } from "@/lib/onboarding";
import { rfqFetch, withinRateLimit } from "@/lib/directory-rfq";
import { getPool } from "@/lib/db";
const headers = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
};
export async function POST(request: NextRequest) {
  try {
    ownerOrigin(request);
    const b = await readSmallJson(request, 8192);
    if (
      ![
        "view",
        "project",
        "alternative_requested",
        "closed",
        "withdrawn",
      ].includes(b.action) ||
      typeof b.token !== "string" ||
      !/^[A-Za-z0-9_-]{40,512}$/.test(b.token)
    )
      throw new InputError("Open your private inquiry progress link.", 401);
    if (
      !(await withinRateLimit(
        request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
        "customer-progress",
        120,
        3600,
      ))
    )
      throw new InputError("Please wait before trying again.", 429);
    const r = await rfqFetch("/internal/directory-rfq/customer-progress", {
      token: b.token,
      action: b.action,
      request_id: b.request_id,
      version: b.version,
      confirm: b.confirm,
      note: b.note,
      fields: b.fields,
    });
    const data = await r.json();
    if (!r.ok)
      throw new InputError(
        typeof data.detail === "string" ? data.detail : "Request unavailable.",
        [400, 401, 403, 404, 409, 410].includes(r.status) ? r.status : 503,
      );
    if (b.action === "view") {
      const row = (
        await getPool().query(
          "SELECT state,public_message,updated_at FROM directory_inquiry_followup WHERE submission_id=$1",
          [data.submission_id],
        )
      ).rows[0];
      data.staff_update = row
        ? {
            state: row.state,
            public_message: row.public_message,
            updated_at: row.updated_at,
          }
        : null;
      delete data.submission_id;
    }
    return NextResponse.json(data, { headers });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof InputError
            ? e.message
            : "Progress is temporarily unavailable. Retry the same action.",
      },
      { status: e instanceof InputError ? e.status : 503, headers },
    );
  }
}
