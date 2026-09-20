import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, adminIdentity, generateToken } from "@/lib/admin-auth";
import { getPool } from "@/lib/db";
import { withinRateLimit } from "@/lib/directory-rfq";
import { readSmallJson, textField, InputError } from "@/lib/onboarding";
import {
  newTotpSecret,
  passwordHash,
  sealTotp,
  openTotp,
  verifyTotp,
  newRecoveryCodes,
  recoveryHash,
} from "@/lib/staff-security";
import { ownerOrigin } from "@/lib/owner-access";
const headers = { "Cache-Control": "no-store" };
export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try {
    return NextResponse.json(
      {
        identity: adminIdentity(request),
        users: (
          await getPool().query(
            "SELECT id,username,display_name,active,created_at,last_login_at,totp_login_verified_at,recovery_verified_at,jsonb_array_length(recovery_hashes) AS recovery_codes_remaining FROM directory_staff_users ORDER BY created_at",
          )
        ).rows,
        named_only: (
          await getPool().query(
            "SELECT named_only FROM directory_security_settings WHERE id=1",
          )
        ).rows[0]?.named_only,
      },
      { headers },
    );
  } catch {
    return NextResponse.json(
      { error: "Security settings unavailable" },
      { status: 503, headers },
    );
  }
}
export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  let client;
  try {
    ownerOrigin(request);
    const identity = adminIdentity(request)!;
    if (!(await withinRateLimit(identity.username, "staff-security", 10, 900)))
      throw new InputError("Please wait before trying again", 429);
    const b = await readSmallJson(request, 2000),
      db = getPool();
    if (b.action === "start") {
      const username = textField(b.username, "username", 3, 64).toLowerCase(),
        display = textField(b.display_name, "name", 2, 100),
        password = textField(b.password, "password", 12, 128);
      if (
        !/^[a-z0-9._-]+$/.test(username) ||
        username === (process.env.ADMIN_USERNAME || "admin")
      )
        throw new InputError(
          "Use a personal username different from the shared login",
        );
      if (
        (
          await db.query(
            "SELECT 1 FROM directory_staff_users WHERE username=$1",
            [username],
          )
        ).rows.length
      )
        throw new InputError("That username is already enrolled", 409);
      const secret = newTotpSecret();
      const row = (
        await db.query(
          `INSERT INTO directory_staff_enrollments(username,display_name,password_hash,sealed_totp,created_by) VALUES($1,$2,$3,$4,$5)
    ON CONFLICT(username) DO UPDATE SET display_name=EXCLUDED.display_name,password_hash=EXCLUDED.password_hash,sealed_totp=EXCLUDED.sealed_totp,created_by=EXCLUDED.created_by,expires_at=NOW()+INTERVAL '15 minutes' RETURNING id`,
          [
            username,
            display,
            passwordHash(password),
            sealTotp(secret),
            identity.username,
          ],
        )
      ).rows[0];
      return NextResponse.json(
        {
          enrollment_id: row.id,
          secret,
          account: username,
          expires_minutes: 15,
        },
        { headers },
      );
    }
    if (b.action === "confirm") {
      client = await db.connect();
      await client.query("BEGIN");
      await client.query(
        "SELECT id FROM directory_security_settings WHERE id=1 FOR UPDATE",
      );
      const enrollment = (
        await client.query(
          "SELECT * FROM directory_staff_enrollments WHERE id=$1 AND created_by=$2 AND expires_at>NOW() FOR UPDATE",
          [textField(b.enrollment_id, "enrollment", 36, 36), identity.username],
        )
      ).rows[0];
      if (!enrollment) throw new InputError("Setup expired. Start again.");
      const counter = verifyTotp(
        openTotp(enrollment.sealed_totp),
        textField(b.code, "authenticator code", 6, 6),
      );
      if (counter === null)
        throw new InputError(
          "Authenticator code did not match. Check the code and device time.",
        );
      const codes = newRecoveryCodes();
      const user = (
        await client.query(
          "INSERT INTO directory_staff_users(username,display_name,password_hash,sealed_totp,recovery_hashes,last_totp_counter) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,username,token_version",
          [
            enrollment.username,
            enrollment.display_name,
            enrollment.password_hash,
            enrollment.sealed_totp,
            JSON.stringify(codes.map(recoveryHash)),
            counter,
          ],
        )
      ).rows[0];
      await client.query(
        "DELETE FROM directory_staff_enrollments WHERE id=$1",
        [enrollment.id],
      );
      await client.query(
        "INSERT INTO directory_review_audit(kind,record_id,actor,action,note) VALUES('security',$1,$2,'staff_enrolled','Authenticator enrollment confirmed')",
        [user.id, identity.username],
      );
      await client.query("COMMIT");
      const response = NextResponse.json(
        { success: true, recovery_codes: codes, username: user.username },
        { headers },
      );
      response.cookies.set("admin_token", generateToken(user), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 86400,
      });
      return response;
    }
    if (b.action === "named_only") {
      if (!identity.id || b.confirm !== true)
        throw new InputError(
          "Sign in with a named account and confirm recovery codes are saved before disabling the shared login",
        );
      client = await db.connect();
      await client.query("BEGIN");
      await client.query(
        "SELECT id FROM directory_security_settings WHERE id=1 FOR UPDATE",
      );
      const staff = (
        await client.query(
          "SELECT id,totp_login_verified_at,recovery_verified_at,jsonb_array_length(recovery_hashes) AS remaining FROM directory_staff_users WHERE active FOR SHARE",
        )
      ).rows;
      if (
        !staff.some((u) => u.id === identity.id) ||
        staff.some(
          (u) =>
            !u.totp_login_verified_at ||
            !u.recovery_verified_at ||
            u.remaining < 1,
        )
      )
        throw new InputError(
          "Every active staff member must successfully sign in with an authenticator and a recovery code, and retain an unused recovery code, before the shared login can be disabled.",
          409,
        );
      await client.query(
        "UPDATE directory_security_settings SET named_only=true WHERE id=1",
      );
      await client.query(
        "INSERT INTO directory_review_audit(kind,record_id,actor,action,note) VALUES('security','settings',$1,'shared_login_disabled','Named staff accounts required')",
        [identity.username],
      );
      await client.query("COMMIT");
      return NextResponse.json({ success: true }, { headers });
    }
    if (b.action === "disable_user") {
      if (
        !identity.id ||
        b.id === identity.id ||
        typeof b.id !== "string" ||
        !/^[0-9a-f-]{36}$/.test(b.id)
      )
        throw new InputError(
          "Use a named administrator account and select another staff account",
        );
      client = await db.connect();
      await client.query("BEGIN");
      await client.query(
        "SELECT id FROM directory_security_settings WHERE id=1 FOR UPDATE",
      );
      const result = await client.query(
        "UPDATE directory_staff_users SET active=false,token_version=token_version+1 WHERE id=$1 AND active=true RETURNING username",
        [b.id],
      );
      if (!result.rows.length)
        throw new InputError("Active staff account not found", 404);
      await client.query(
        "INSERT INTO directory_review_audit(kind,record_id,actor,action,note) VALUES('security',$1,$2,'staff_disabled','Existing sessions revoked')",
        [b.id, identity.username],
      );
      await client.query("COMMIT");
      return NextResponse.json({ success: true }, { headers });
    }
    throw new InputError("Choose a valid security action");
  } catch (e) {
    if (client) await client.query("ROLLBACK");
    return NextResponse.json(
      {
        error:
          e instanceof InputError
            ? e.message
            : "Security change could not be saved",
      },
      { status: e instanceof InputError ? e.status : 503, headers },
    );
  } finally {
    client?.release();
  }
}
