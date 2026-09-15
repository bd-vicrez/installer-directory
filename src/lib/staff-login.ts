import { getPool } from "./db";
import {
  openTotp,
  verifyPassword,
  verifyTotp,
  recoveryHash,
} from "./staff-security";
export async function staffLogin(
  username: string,
  password: string,
  code: string,
) {
  const client = await getPool().connect();
  await client.query("BEGIN");
  try {
    const user = (
      await client.query(
        "SELECT * FROM directory_staff_users WHERE username=$1 AND active=true FOR UPDATE",
        [username.toLowerCase()],
      )
    ).rows[0];
    if (!user || !verifyPassword(password, user.password_hash)) {
      await client.query("ROLLBACK");
      return null;
    }
    const counter = verifyTotp(
      openTotp(user.sealed_totp),
      code,
      Number(user.last_totp_counter),
    );
    const recovery =
      counter === null && /^[a-f0-9-]{24,30}$/i.test(code)
        ? recoveryHash(code)
        : "";
    if (counter === null && !user.recovery_hashes.includes(recovery)) {
      await client.query("ROLLBACK");
      return null;
    }
    await client.query(
      "UPDATE directory_staff_users SET last_totp_counter=$2,recovery_hashes=$3 WHERE id=$1",
      [
        user.id,
        counter === null ? user.last_totp_counter : counter,
        JSON.stringify(
          user.recovery_hashes.filter((v: string) => v !== recovery),
        ),
      ],
    );
    await client.query("COMMIT");
    return {
      id: user.id,
      username: user.username,
      token_version: user.token_version,
    };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
