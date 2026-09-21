import { NextResponse } from "next/server";
import { sameOrigin, withinRateLimit, rfqFetch } from "@/lib/directory-rfq";
import { InputError, readSmallJson } from "@/lib/onboarding";
export const dynamic = "force-dynamic";
const headers = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
};
export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) throw new InputError("Invalid origin.", 403);
    const body = await readSmallJson(request, 4096);
    if (
      !["view", "save"].includes(body.action) ||
      typeof body.token !== "string" ||
      !/^[A-Za-z0-9_-]{40,512}$/.test(body.token)
    )
      throw new InputError(
        "Open the private response link from your inquiry email.",
        401,
      );
    if (
      !(await withinRateLimit(
        request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
        "shop-response",
        120,
        3600,
      ))
    )
      throw new InputError("Too many attempts. Please try again later.", 429);
    const r = await rfqFetch("/internal/directory-rfq/shop-response", body);
    const result = await r.json();
    if (!r.ok)
      return NextResponse.json(
        {
          error:
            [400, 401, 403, 409, 410].includes(r.status) &&
            typeof result.detail === "string"
              ? result.detail
              : "Response service is unavailable. Retry the same response.",
        },
        {
          status: [400, 401, 403, 409, 410].includes(r.status) ? r.status : 503,
          headers,
        },
      );
    return NextResponse.json(result, { headers });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof InputError
            ? e.message
            : "Unable to confirm the save. Retry the same response.",
      },
      { status: e instanceof InputError ? e.status : 503, headers },
    );
  }
}
