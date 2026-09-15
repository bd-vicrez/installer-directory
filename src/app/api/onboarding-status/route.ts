import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { InputError, readSmallJson, readStatusToken } from "@/lib/onboarding";
export async function POST(request: Request) {
  try {
    const token = readStatusToken((await readSmallJson(request, 1000)).token),
      table =
        token.kind === "application" ? "applications" : "directory_claims";
    const row = (
      await getPool().query(
        `SELECT status,public_message,submitted_at,reviewed_at FROM ${table} WHERE id=$1`,
        [token.id],
      )
    ).rows[0];
    if (!row) throw new InputError("Request not found.", 404);
    return NextResponse.json(row, {
      headers: {
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
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
