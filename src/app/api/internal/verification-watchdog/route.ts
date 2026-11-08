import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import {
  watchdogAuthorized,
  checkVerificationWatchdog,
} from "@/lib/verification-watchdog";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  if (!watchdogAuthorized(request))
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers },
    );
  try {
    return NextResponse.json(await checkVerificationWatchdog(getPool()), {
      headers,
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Independent verification monitoring failed. Check Vercel logs and alert delivery.",
      },
      { status: 503, headers },
    );
  }
}
