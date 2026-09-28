import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { InputError, readSmallJson, readStatusToken } from "@/lib/onboarding";
import { requestRevision } from "@/lib/onboarding-updates";
export async function POST(request: Request) {
  try {
    const token = readStatusToken((await readSmallJson(request, 1000)).token),
      table =
        token.kind === "application" ? "applications" : "directory_claims";
    const row = (
      await getPool().query(`SELECT * FROM ${table} WHERE id=$1`, [token.id])
    ).rows[0];
    if (!row) throw new InputError("Request not found.", 404);
    return NextResponse.json(
      {
        status: row.status,
        public_message: row.public_message,
        submitted_at: row.submitted_at,
        reviewed_at: row.reviewed_at,
        kind: token.kind,
        revision: requestRevision(row),
        last_update: row.details?.applicant_update?.submitted_at || null,
        can_update: ["pending", "needs_information"].includes(row.status),
        business:
          token.kind === "application"
            ? {
                business_name: row.business_name,
                street_address: row.street_address,
                city: row.city,
                state: row.state,
                zip_code: row.zip_code,
                phone: row.phone,
                website: row.website,
                install_capabilities: row.install_capabilities,
              }
            : null,
      },
      {
        headers: {
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
        },
      },
    );
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof InputError
            ? e.message
            : "Status temporarily unavailable.",
      },
      { status: e instanceof InputError ? e.status : 503 },
    );
  }
}
