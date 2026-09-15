import { sameOrigin, withinRateLimit } from "@/lib/directory-rfq";
import { readSmallJson } from "@/lib/onboarding";
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { staffLogin } from "@/lib/staff-login";
import { generateToken, requireAdmin, adminIdentity } from "@/lib/admin-auth";

const ADMIN_USER = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASS = process.env.ADMIN_PASSWORD;

export async function POST(request: NextRequest) {
  try {
    if (!sameOrigin(request))
      return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
    if (
      !(await withinRateLimit(
        request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
        "admin-login",
        20,
        900,
      ))
    )
      return NextResponse.json(
        { error: "Too many attempts. Try again later." },
        { status: 429 },
      );
    const {
      username,
      password,
      code = "",
    } = await readSmallJson(request, 2000);
    if (
      typeof username !== "string" ||
      username.length > 80 ||
      typeof password !== "string" ||
      password.length > 128 ||
      typeof code !== "string" ||
      code.length > 30
    )
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    if (
      !(await withinRateLimit(username.toLowerCase(), "admin-account", 20, 900))
    )
      return NextResponse.json(
        { error: "Too many attempts. Try again later." },
        { status: 429 },
      );
    const staff =
      username !== ADMIN_USER
        ? await staffLogin(username, password, code)
        : null;
    const namedOnly = (
      await getPool().query(
        "SELECT named_only FROM directory_security_settings WHERE id=1",
      )
    ).rows[0]?.named_only;

    if (
      staff ||
      (!namedOnly &&
        ADMIN_PASS &&
        typeof username === "string" &&
        typeof password === "string" &&
        username === ADMIN_USER &&
        password === ADMIN_PASS)
    ) {
      const token = generateToken(staff || undefined);
      const response = NextResponse.json({ success: true });
      response.cookies.set("admin_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24,
      });
      return response;
    }

    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set("admin_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  return NextResponse.json(
    { authenticated: true, identity: adminIdentity(request) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
