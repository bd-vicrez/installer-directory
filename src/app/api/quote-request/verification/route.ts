import { NextResponse } from "next/server";
import { rfqFetch } from "@/lib/directory-rfq";
export const dynamic = "force-dynamic";
export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  try {
    const response = await rfqFetch("/internal/directory-rfq/verification-config");
    if (!response.ok) throw new Error();
    const data = await response.json();
    return NextResponse.json({ sitekey: data.sitekey || null, mode: data.mode }, { headers });
  } catch {
    return NextResponse.json({ error: "Verification is temporarily unavailable. Your details will stay in the form." }, { status: 503, headers });
  }
}
