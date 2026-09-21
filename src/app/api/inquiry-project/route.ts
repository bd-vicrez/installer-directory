import { NextRequest, NextResponse } from "next/server";
import { ownerOrigin } from "@/lib/owner-access";
import { requireAdmin } from "@/lib/admin-auth";
import { InputError, readSmallJson } from "@/lib/onboarding";
import { rfqFetch, withinRateLimit } from "@/lib/directory-rfq";
import { sanitizeShopPhoto } from "@/lib/shop-photos";
const headers = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow",
};
export const maxDuration = 30;
export async function POST(request: NextRequest) {
  try {
    ownerOrigin(request);
    const b = await readSmallJson(request, 4300000);
    if (
      !["customer", "shop", "staff"].includes(b.scope) ||
      !["list", "read", "upload", "delete"].includes(b.action)
    )
      throw new InputError("Choose a project photo action.");
    if (b.scope === "staff") {
      const denied = await requireAdmin(request);
      if (denied) return denied;
    } else if (
      typeof b.token !== "string" ||
      !/^[A-Za-z0-9_-]{40,512}$/.test(b.token)
    )
      throw new InputError("A private inquiry link is required.", 401);
    if (["upload", "delete"].includes(b.action) && b.scope !== "customer")
      throw new InputError("Only the customer can change photos.", 403);
    if (
      !(await withinRateLimit(
        request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
        "project-" + (b.action === "upload" ? "upload" : "read"),
        b.action === "upload" ? 12 : 180,
        3600,
      ))
    )
      throw new InputError("Please wait before trying again.", 429);
    const payload: any = {
      scope: b.scope,
      action: b.action,
      token: b.token,
      submission_id: b.scope === "staff" ? b.submission_id : undefined,
      photo_id: b.photo_id,
      caption: b.caption,
      permission: b.permission,
    };
    if (b.action === "upload") {
      if (
        b.permission !== true ||
        typeof b.image !== "string" ||
        !/^[A-Za-z0-9+/]*={0,2}$/.test(b.image)
      )
        throw new InputError("Confirm permission and choose an image.");
      const raw = Buffer.from(b.image, "base64");
      if (raw.length > 3 * 1024 * 1024)
        throw new InputError("Choose a photo smaller than 3 MB.", 413);
      const access = await rfqFetch("/internal/directory-rfq/project-photos", {
        scope: "customer",
        token: b.token,
        action: "list",
      });
      if (!access.ok) {
        const detail = await access.json();
        throw new InputError(
          typeof detail.detail === "string"
            ? detail.detail
            : "Open your private inquiry link.",
          [401, 403, 404, 410].includes(access.status) ? access.status : 503,
        );
      }
      const photo = await sanitizeShopPhoto(raw);
      Object.assign(payload, {
        image: photo.data.toString("base64"),
        width: photo.width,
        height: photo.height,
      });
    }
    const r = await rfqFetch("/internal/directory-rfq/project-photos", payload),
      data = await r.json();
    if (!r.ok)
      throw new InputError(
        typeof data.detail === "string" ? data.detail : "Project unavailable.",
        [400, 401, 403, 404, 409, 410, 413].includes(r.status) ? r.status : 503,
      );
    if (b.action === "read")
      return new NextResponse(Buffer.from(data.image, "base64"), {
        headers: { ...headers, "Content-Type": "image/webp" },
      });
    return NextResponse.json(data, { headers });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof InputError
            ? e.message
            : "Project photos are temporarily unavailable.",
      },
      { status: e instanceof InputError ? e.status : 503, headers },
    );
  }
}
