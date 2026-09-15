import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getPool } from "@/lib/db";
import { sameOrigin, withinRateLimit, UUID } from "@/lib/directory-rfq";
import {
  InputError,
  readSmallJson,
  textField,
  emailField,
  ownerDetails,
  serviceFields,
  payloadHash,
  statusToken,
} from "@/lib/onboarding";
export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) throw new InputError("Invalid origin.", 403);
    if (
      !(await withinRateLimit(
        request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
        "claim",
        12,
        3600,
      ))
    )
      throw new InputError("Please wait before trying again.", 429);
    const body = await readSmallJson(request);
    if (
      body.agreement !== true ||
      body.honeypot ||
      !UUID.test(body.request_id || "")
    )
      throw new InputError("Check the request and confirm the agreement.");
    const data = {
      installer_id: textField(body.installer_id, "listing", 1, 80),
      name: textField(body.name, "name", 2, 100),
      email: emailField(body.email),
      relationship: textField(
        body.relationship,
        "relationship to business",
        3,
        200,
      ),
      correction: textField(body.correction, "requested correction", 10, 2000),
      details: {
        ...ownerDetails(body),
        services: body.services?.length ? serviceFields(body.services) : [],
      },
    };
    const shop = (
      await getPool().query(
        "SELECT id FROM installers WHERE id=$1 AND status NOT IN ('removed','non_us_excluded')",
        [data.installer_id],
      )
    ).rows[0];
    if (!shop) throw new InputError("This listing is unavailable.", 404);
    const hash = payloadHash(data),
      id = randomUUID();
    const row = (
      await getPool().query(
        `INSERT INTO directory_claims(id,request_id,payload_hash,installer_id,name,email,relationship,correction,details,consent_version)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'listing-claim-v1') ON CONFLICT(request_id) DO UPDATE SET request_id=EXCLUDED.request_id RETURNING id,payload_hash,submitted_at`,
        [
          id,
          body.request_id,
          hash,
          data.installer_id,
          data.name,
          data.email,
          data.relationship,
          data.correction,
          JSON.stringify(data.details),
        ],
      )
    ).rows[0];
    if (row.payload_hash !== hash)
      throw new InputError(
        "Retry your original details for this reference.",
        409,
      );
    return NextResponse.json(
      {
        success: true,
        reference: "CLM-" + row.id.slice(0, 8).toUpperCase(),
        token: statusToken("claim", row.id, row.submitted_at),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof InputError
            ? e.message
            : "Unable to confirm your request. Retry the same details.",
      },
      { status: e instanceof InputError ? e.status : 503 },
    );
  }
}
