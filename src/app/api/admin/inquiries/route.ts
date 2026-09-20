import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { rfqFetch } from "@/lib/directory-rfq";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;
  const headers = { "Cache-Control": "private, no-store" };
  const id = request.nextUrl.searchParams.get("id");
  if (id !== null && !/^[1-9][0-9]{0,14}$/.test(id))
    return NextResponse.json(
      { error: "Choose a valid inquiry" },
      { status: 400 },
    );
  try {
    const response = await rfqFetch(
      "/internal/directory-rfq/requests" + (id ? "?id=" + id : ""),
    );
    if (!response.ok) throw new Error();
    return NextResponse.json(await response.json(), { headers });
  } catch {
    return NextResponse.json(
      { error: "Inquiry status is temporarily unavailable." },
      { status: 503, headers },
    );
  }
}
