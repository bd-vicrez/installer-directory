import { NextRequest, NextResponse } from "next/server";
import {
  InstallerSearchError,
  searchInstallers,
  type SearchTimings,
} from "@/lib/installer-search";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const timings: SearchTimings = {};
    const result = await searchInstallers(request.nextUrl.searchParams, timings);
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "no-store",
        "Server-Timing": Object.entries(timings)
          .map(([name, ms]) => `${name};dur=${ms}`)
          .join(", "),
      },
    });
  } catch (error) {
    if (!(error instanceof InstallerSearchError))
      console.error("Installer search failed");
    return NextResponse.json(
      {
        error:
          error instanceof InstallerSearchError
            ? error.message
            : "Search is temporarily unavailable. Please try again.",
      },
      {
        status: error instanceof InstallerSearchError ? error.status : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
