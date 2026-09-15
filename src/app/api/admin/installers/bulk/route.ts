import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { sameOrigin } from "@/lib/directory-rfq";
import { InputError, readSmallJson } from "@/lib/onboarding";
import { mutateInstallers } from "@/lib/admin-installer-mutation";
import { refreshContactPages } from "@/lib/contact-refresh";

export async function PUT(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth) return auth;
  try {
    if (!sameOrigin(request)) throw new InputError("Invalid origin.", 403);
    const b = await readSmallJson(request);
    if (!Array.isArray(b.ids) || !b.updates)
      throw new InputError("Select listings and changes.");
    const changes = {
      status: b.updates.status,
      install_capabilities: b.updates.install_capabilities,
    };
    const rows = await mutateInstallers(b.ids, changes);
    refreshContactPages("");
    return NextResponse.json({ success: true, updated: rows.length });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof InputError ? e.message : "Update unavailable." },
      { status: e instanceof InputError ? e.status : 503 },
    );
  }
}
