import { NextResponse } from "next/server";
import {
  sameOrigin,
  withinRateLimit,
  recordQuoteEvent,
} from "@/lib/directory-rfq";
import { readSmallJson } from "@/lib/onboarding";
import { discoveryInput } from "@/lib/discovery";
import { storeDiscoveryEvent } from "@/lib/discovery-store";
import { measurementRequestAllowed } from "@/lib/measurement-privacy";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return new NextResponse(null, { status: 403 });
  if (!measurementRequestAllowed(request))
    return new NextResponse(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
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
        300,
        900,
      ))
    )
      return new NextResponse(null, { status: 429 });
    await storeDiscoveryEvent(b);
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
