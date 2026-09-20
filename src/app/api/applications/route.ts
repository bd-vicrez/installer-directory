import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { randomUUID } from "node:crypto";
import { sameOrigin, withinRateLimit } from "@/lib/directory-rfq";
import {
  applicationInput,
  payloadHash,
  statusToken,
  readSmallJson,
  InputError,
} from "@/lib/onboarding";
export async function POST(request: NextRequest) {
  try {
    if (!sameOrigin(request)) throw new InputError("Invalid origin.", 403);
    if (
      !(await withinRateLimit(
        request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
        "application",
        12,
        3600,
      ))
    )
      throw new InputError("Please wait before submitting again.", 429);
    const app = applicationInput(await readSmallJson(request)),
      hash = payloadHash(app),
      db = getPool();
    const { rows } = await db.query(
      `INSERT INTO applications(id,application_id,request_id,payload_hash,business_name,street_address,city,state,zip_code,phone,email,website,install_capabilities,details,consent_version,consent_at)
   VALUES($1,'APP-'||nextval('directory_application_number'),$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'directory-listing-v2',NOW())
   ON CONFLICT(request_id) DO UPDATE SET request_id=EXCLUDED.request_id RETURNING id,application_id,payload_hash,submitted_at`,
      [
        randomUUID(),
        app.request_id,
        hash,
        app.business_name,
        app.street,
        app.city,
        app.state,
        app.zip,
        app.phone,
        app.email,
        app.website,
        app.services,
        JSON.stringify(app.details),
      ],
    );
    const row = rows[0];
    if (row.payload_hash !== hash)
      throw new InputError(
        "This reference belongs to an earlier submission. Retry its original details or start a new application.",
        409,
      );
    return NextResponse.json(
      {
        success: true,
        application_id: row.application_id,
        token: statusToken("application", row.id, row.submitted_at),
        message: "Saved for the Vicrez installer review team.",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof InputError
            ? e.message
            : "Unable to confirm your application. Retry the same details.",
      },
      { status: e instanceof InputError ? e.status : 503 },
    );
  }
}
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth) return auth;
  try {
    const status = request.nextUrl.searchParams.get("status");
    const { rows } = await getPool().query(
      `SELECT a.*,(SELECT slug FROM installers WHERE id=a.installer_id) AS listing_slug,EXTRACT(EPOCH FROM (NOW()-submitted_at))/86400 AS age_days,
  (SELECT json_agg(json_build_object('id',i.id,'name',i.business_name,'slug',i.slug)) FROM installers i WHERE i.status='active' AND i.id IS DISTINCT FROM a.installer_id AND (regexp_replace(i.phone,'[^0-9]','','g')=regexp_replace(a.phone,'[^0-9]','','g') OR (lower(i.street_address)=lower(a.street_address) AND lower(i.city)=lower(a.city) AND i.state=a.state))) AS duplicate_candidates
  FROM applications a ${status ? "WHERE status=$1" : ""} ORDER BY submitted_at ASC LIMIT 200`,
      status ? [status] : [],
    );
    return NextResponse.json(
      { applications: rows },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "Queue unavailable." }, { status: 503 });
  }
}
