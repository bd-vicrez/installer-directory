import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, adminIdentity } from "@/lib/admin-auth";
import { sameOrigin } from "@/lib/directory-rfq";
import { InputError, readSmallJson } from "@/lib/onboarding";
import { mutateInstallers } from "@/lib/admin-installer-mutation";
import { refreshContactPages } from "@/lib/contact-refresh";

async function mutate(request: NextRequest, id: string, remove = false) {
  const auth = await requireAdmin(request);
  if (auth) return auth;
  try {
    if (!sameOrigin(request)) throw new InputError("Invalid origin.", 403);
    const rows = await mutateInstallers(
      [id],
      remove ? { status: "removed" } : await readSmallJson(request),
      false,
      adminIdentity?.(request)?.username,
    );
    refreshContactPages(rows[0].slug);
    return NextResponse.json(remove ? { success: true, id } : rows[0]);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof InputError ? e.message : "Update unavailable." },
      { status: e instanceof InputError ? e.status : 503 },
    );
  }
}
export async function PUT(
  r: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return mutate(r, (await params).id);
}
export async function DELETE(
  r: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return mutate(r, (await params).id, true);
}
