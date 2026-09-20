import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "./db";
import { InputError } from "./onboarding";
import { rfqConfig, UUID } from "./directory-rfq";
export const OWNER_COOKIE = "vicrez_owner";
export const ownerHash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export function ownerLoginToken(id: string) {
  return (
    id +
    "." +
    createHmac("sha256", rfqConfig().secret)
      .update("owner-login-v1:" + id)
      .digest("base64url")
  );
}
export function readOwnerLoginToken(value: unknown) {
  if (typeof value !== "string" || value.length > 150)
    throw new InputError("This sign-in link is invalid or expired.", 401);
  const [id, signature, extra] = value.split(".");
  if (!UUID.test(id) || !signature || extra !== undefined)
    throw new InputError("This sign-in link is invalid or expired.", 401);
  const supplied = Buffer.from(signature),
    expected = Buffer.from(ownerLoginToken(id).split(".")[1]);
  if (
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  )
    throw new InputError("This sign-in link is invalid or expired.", 401);
  return id;
}
export function ownerOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    throw new InputError("Please submit from this site.", 403);
}
export async function ownerIdentity(request: NextRequest) {
  const token = request.cookies.get(OWNER_COOKIE)?.value;
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token))
    throw new InputError("Sign in to manage your shop.", 401);
  const row = (
    await getPool().query(
      `SELECT g.id,g.installer_id,g.email,g.name,g.version FROM directory_owner_sessions s
    JOIN directory_owner_grants g ON g.id=s.grant_id JOIN installers i ON i.id=g.installer_id
    WHERE s.token_hash=$1 AND s.expires_at>NOW() AND g.active AND s.version=g.version
      AND i.status NOT IN ('removed','non_us_excluded')`,
      [ownerHash(token)],
    )
  ).rows[0];
  if (!row)
    throw new InputError(
      "Your access has expired or was withdrawn. Sign in again or contact support.",
      401,
    );
  return row;
}
export async function lockOwner(
  client: import("pg").PoolClient,
  owner: Record<string, any>,
) {
  const row = (
    await client.query(
      "SELECT id FROM directory_owner_grants WHERE id=$1 AND active AND version=$2 FOR UPDATE",
      [owner.id, owner.version],
    )
  ).rows[0];
  if (!row)
    throw new InputError("Owner access was withdrawn. Contact support.", 401);
}
export function ownerError(error: unknown) {
  return NextResponse.json(
    {
      error:
        error instanceof InputError
          ? error.message
          : "Unable to save or retrieve your shop. Please try again.",
    },
    {
      status: error instanceof InputError ? error.status : 503,
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}
export const OWNER_HEADERS = { "Cache-Control": "private, no-store" };
