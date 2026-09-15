import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "./db";

const MAX_AGE_MS = 24 * 60 * 60 * 1000;
export function generateToken(staff?: {
  id: string;
  username: string;
  token_version: number;
}): string {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("Admin authentication is not configured");
  const payload = Buffer.from(
    JSON.stringify({
      user: staff?.username || process.env.ADMIN_USERNAME || "admin",
      staff_id: staff?.id,
      version: staff?.token_version,
      exp: Date.now() + MAX_AGE_MS,
    }),
  ).toString("base64url");
  return (
    payload +
    "." +
    createHmac("sha256", secret).update(payload).digest("base64url")
  );
}
export function verifyAdminToken(token: string): boolean {
  try {
    const secret = process.env.ADMIN_SECRET;
    if (!secret || secret.length < 32 || token.length > 1024) return false;
    const parts = token.split(".");
    if (parts.length !== 2) return false;
    const signature = Buffer.from(parts[1], "base64url");
    const expected = createHmac("sha256", secret).update(parts[0]).digest();
    if (
      signature.length !== expected.length ||
      !timingSafeEqual(signature, expected)
    )
      return false;
    const payload = JSON.parse(Buffer.from(parts[0], "base64url").toString());
    const identity = payload.staff_id
      ? /^[0-9a-f-]{36}$/.test(payload.staff_id) &&
        typeof payload.user === "string" &&
        Number.isInteger(payload.version)
      : payload.user === (process.env.ADMIN_USERNAME || "admin");
    return (
      identity &&
      Number.isFinite(payload.exp) &&
      payload.exp > Date.now() &&
      payload.exp <= Date.now() + MAX_AGE_MS
    );
  } catch {
    return false;
  }
}
export const verifyToken = verifyAdminToken;
const identities = new WeakMap<Request, { username: string; id?: string }>();
export function adminIdentity(request: Request) {
  return identities.get(request);
}
export async function requireAdmin(
  request: NextRequest,
): Promise<NextResponse | null> {
  const token = request.cookies.get("admin_token")?.value;
  const denied = () =>
    NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  if (!token || !verifyAdminToken(token)) return denied();
  try {
    const p = JSON.parse(
      Buffer.from(token.split(".")[0], "base64url").toString(),
    );
    if (p.staff_id) {
      const row = (
        await getPool().query(
          "SELECT id,username FROM directory_staff_users WHERE id=$1 AND username=$2 AND active=true AND token_version=$3",
          [p.staff_id, p.user, p.version],
        )
      ).rows[0];
      if (!row) return denied();
      identities.set(request, { username: row.username, id: row.id });
    } else {
      const settings = (
        await getPool().query(
          "SELECT named_only FROM directory_security_settings WHERE id=1",
        )
      ).rows[0];
      if (settings?.named_only) return denied();
      identities.set(request, { username: p.user });
    }
    return null;
  } catch {
    return NextResponse.json(
      { error: "Sign-in verification unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
