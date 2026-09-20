import { randomBytes, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { withinRateLimit } from "@/lib/directory-rfq";
import { emailField, InputError, readSmallJson } from "@/lib/onboarding";
import {
  OWNER_COOKIE,
  OWNER_HEADERS,
  ownerError,
  ownerHash,
  ownerOrigin,
  readOwnerLoginToken,
} from "@/lib/owner-access";
export async function POST(request: NextRequest) {
  let client;
  try {
    ownerOrigin(request);
    const b = await readSmallJson(request, 1200);
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    if (!(await withinRateLimit(ip, "owner-auth", 15, 900)))
      throw new InputError("Please wait before trying again.", 429);
    if (b.action === "request") {
      const email = emailField(b.email);
      // Generic response, including when this inbox has no reviewed access or has reached its email limit.
      if (await withinRateLimit(email, "owner-email", 3, 1800)) {
        client = await getPool().connect();
        await client.query("BEGIN");
        const grants = (
          await client.query(
            `SELECT g.* FROM directory_owner_grants g JOIN installers i ON i.id=g.installer_id WHERE g.email=$1 AND g.active AND i.status NOT IN ('removed','non_us_excluded') ORDER BY g.created_at LIMIT 10 FOR UPDATE OF g`,
            [email],
          )
        ).rows;
        for (const grant of grants) {
          const id = randomUUID();
          await client.query(
            "INSERT INTO directory_owner_logins(id,grant_id,version,expires_at) VALUES($1,$2,$3,NOW()+INTERVAL '30 minutes')",
            [id, grant.id, grant.version],
          );
          await client.query(
            `INSERT INTO directory_notifications(event_key,kind,record_id,recipient,reference,outcome) VALUES($1,'owner',$2,$3,$4,'owner_login')`,
            ["owner:" + id, id, email, "Shop " + grant.installer_id],
          );
        }
        await client.query(
          "DELETE FROM directory_owner_sessions WHERE expires_at<NOW()-INTERVAL '1 day'",
        );
        await client.query(
          "DELETE FROM directory_owner_logins WHERE expires_at<NOW()-INTERVAL '1 day'",
        );
        await client.query("COMMIT");
      }
      return NextResponse.json(
        {
          message:
            "If this email has approved owner access, a private sign-in link will arrive shortly. Each link expires after 30 minutes. For first-time access, submit an ownership request or contact support@vicrez.com.",
        },
        { headers: OWNER_HEADERS },
      );
    }
    if (b.action !== "exchange")
      throw new InputError("Choose a sign-in action.");
    const id = readOwnerLoginToken(b.token);
    client = await getPool().connect();
    await client.query("BEGIN");
    const login = (
      await client.query(
        `SELECT l.*,g.active,g.version AS current_version,i.status FROM directory_owner_logins l JOIN directory_owner_grants g ON g.id=l.grant_id JOIN installers i ON i.id=g.installer_id WHERE l.id=$1 FOR UPDATE OF l,g`,
        [id],
      )
    ).rows[0];
    if (
      !login ||
      !login.active ||
      login.version !== login.current_version ||
      login.consumed_at ||
      new Date(login.expires_at).getTime() <= Date.now() ||
      ["removed", "non_us_excluded"].includes(login.status)
    )
      throw new InputError(
        "This sign-in link is invalid, expired or already used. Request a new link.",
        401,
      );
    const token = randomBytes(32).toString("base64url");
    await client.query(
      "UPDATE directory_owner_logins SET consumed_at=NOW() WHERE id=$1",
      [id],
    );
    await client.query(
      "INSERT INTO directory_owner_sessions(token_hash,grant_id,version,expires_at) VALUES($1,$2,$3,NOW()+INTERVAL '12 hours')",
      [ownerHash(token), login.grant_id, login.version],
    );
    await client.query("COMMIT");
    const response = NextResponse.json(
      { success: true },
      { headers: OWNER_HEADERS },
    );
    response.cookies.set(OWNER_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 43200,
    });
    return response;
  } catch (e) {
    if (client) await client.query("ROLLBACK");
    return ownerError(e);
  } finally {
    client?.release();
  }
}
export async function DELETE(request: NextRequest) {
  try {
    ownerOrigin(request);
    const token = request.cookies.get(OWNER_COOKIE)?.value;
    if (token)
      await getPool().query(
        "DELETE FROM directory_owner_sessions WHERE token_hash=$1",
        [ownerHash(token)],
      );
    const response = NextResponse.json(
      { success: true },
      { headers: OWNER_HEADERS },
    );
    response.cookies.set(OWNER_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (e) {
    return ownerError(e);
  }
}
