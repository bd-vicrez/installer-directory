import { NextResponse } from "next/server";
import {
  UUID,
  recordQuoteEvent,
  sameOrigin,
  withinRateLimit,
} from "@/lib/directory-rfq";
import { readSmallJson } from "@/lib/onboarding";
export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) return new NextResponse(null, { status: 403 });
    const b = await readSmallJson(request, 600);
    if (
      b.event !== "comparison_open" ||
      !UUID.test(b.id || "") ||
      !UUID.test(b.session_id || "")
    )
      return new NextResponse(null, { status: 400 });
    if (
      !(await withinRateLimit(
        request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
        "comparison",
        30,
        900,
      ))
    )
      return new NextResponse(null, { status: 429 });
    await recordQuoteEvent("comparison_open", {
      id: b.id,
      session_id: b.session_id,
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
