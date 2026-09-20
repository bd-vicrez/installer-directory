import { NextResponse } from "next/server";
import {
  sameOrigin,
  withinRateLimit,
  recordQuoteEvent,
} from "@/lib/directory-rfq";
import { readSmallJson } from "@/lib/onboarding";
import { discoveryInput } from "@/lib/discovery";
import { getPool } from "@/lib/db";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return new NextResponse(null, { status: 403 });
  let b;
  try {
    b = discoveryInput(await readSmallJson(request, 1000));
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  try {
    if (
      !(await withinRateLimit(
        request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
        "discovery",
        150,
        900,
      ))
    )
      return new NextResponse(null, { status: 429 });
    await getPool().query(
      `INSERT INTO directory_discovery_events(id,session_id,event,page,service,result_bucket,listing_id,target,campaign_source,acquisition_channel)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT(id) DO NOTHING`,
      [
        b.id,
        b.session_id,
        b.event,
        b.page,
        b.service,
        b.result_bucket,
        b.listing_id,
        b.target,
        b.campaign_source,
        b.acquisition_channel,
      ],
    );
    if (b.event === "comparison_open")
      await recordQuoteEvent("comparison_open", {
        id: String(b.id),
        session_id: String(b.session_id),
        flow: "comparison",
      });
    return new NextResponse(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
