import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { experienceReport } from "@/lib/experience-report";
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth) return auth;
  const headers = { "Cache-Control": "private, no-store" };
  try {
    return NextResponse.json(await experienceReport(), { headers });
  } catch {
    return NextResponse.json(
      { error: "Speed and journey measurements are temporarily unavailable." },
      { status: 503, headers },
    );
  }
}
