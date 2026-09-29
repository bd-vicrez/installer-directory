import { NextRequest, NextResponse } from "next/server";
import { InstallerSearchError, searchInstallers } from "@/lib/installer-search";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json(
      await searchInstallers(request.nextUrl.searchParams),
      { headers: { "Cache-Control": "no-store" } },
    );
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
