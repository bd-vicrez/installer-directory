import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { canReceiveQuote } from "@/lib/installer-contact";
import { isQuoteService, recordedQuoteServices } from "@/lib/quote-services";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const expected = process.env.INSTALLER_FEED_TOKEN;
  const supplied =
    request.headers.get("authorization")?.replace(/^Bearer /, "") || "";
  const headers = {
    "Cache-Control": "private, no-store",
    Vary: "Authorization",
  };
  if (
    !expected ||
    expected.length < 32 ||
    !timingSafeEqual(
      createHash("sha256").update(expected).digest(),
      createHash("sha256").update(supplied).digest(),
    )
  )
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers },
    );
  const id = request.nextUrl.searchParams.get("id"),
    service = request.nextUrl.searchParams.get("service");
  if ((!id && !isQuoteService(service)) || (id && id.length > 80))
    return NextResponse.json(
      { error: "Invalid routing filter" },
      { status: 400, headers },
    );
  try {
    const { rows } = await getPool().query(
      `SELECT id,business_name,slug,city,state,zip_code,lat,lng,routing_email,quote_routing_enabled,owner_inquiry_paused,status,google_status,install_capabilities FROM installers WHERE status='active' AND quote_routing_enabled=true ${id ? "AND id::text=$1" : ""}`,
      id ? [id] : [],
    );
    const installers = rows
      .filter((row) =>
        canReceiveQuote(
          request.nextUrl.searchParams.get("purpose") === "response" && id
            ? { ...row, owner_inquiry_paused: false }
            : row,
        ),
      )
      .filter(
        (row) =>
          id ||
          recordedQuoteServices(row.install_capabilities).includes(service!),
      )
      .map((row) => ({
        id: String(row.id),
        business_name: row.business_name,
        slug: row.slug,
        city: row.city,
        state: row.state,
        zip_code: row.zip_code,
        lat: row.lat,
        lng: row.lng,
        email: row.routing_email.trim(),
        services: recordedQuoteServices(row.install_capabilities),
      }));
    return NextResponse.json({ installers }, { headers });
  } catch {
    return NextResponse.json(
      { error: "Routing temporarily unavailable" },
      { status: 503, headers },
    );
  }
}
