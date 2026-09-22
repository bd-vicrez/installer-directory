import { NextRequest, NextResponse } from "next/server";
import { locationRedirect } from "./lib/location-canonical";

export function middleware(request: NextRequest) {
  const target = locationRedirect(
    request.nextUrl.pathname,
    request.nextUrl.search,
  );
  if (target) return NextResponse.redirect(new URL(target, request.url), 308);
  return NextResponse.next();
}

export const config = { matcher: "/installers/:path*" };
