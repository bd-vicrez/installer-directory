import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
  createCipheriv,
  createDecipheriv,
  createHmac,
} from "node:crypto";
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export function newTotpSecret() {
  const bytes = randomBytes(20);
  let bits = 0,
    value = 0,
    out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  return out;
}
function decode32(secret: string) {
  let bits = 0,
    value = 0;
  const bytes = [];
  for (const char of secret) {
    const n = alphabet.indexOf(char);
    if (n < 0) throw Error("Invalid authenticator");
    value = (value << 5) | n;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}
export function totpCode(secret: string, counter: number) {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const h = createHmac("sha1", decode32(secret)).update(buffer).digest();
  const offset = h[19] & 15;
  return String((h.readUInt32BE(offset) & 0x7fffffff) % 1000000).padStart(
    6,
    "0",
  );
}
export function verifyTotp(
  secret: string,
  code: string,
  previous = -1,
  now = Date.now(),
) {
  if (!/^\d{6}$/.test(code)) return null;
  const counter = Math.floor(now / 30000);
  for (const n of [counter, counter - 1, counter + 1])
    if (
      n > previous &&
      timingSafeEqual(Buffer.from(totpCode(secret, n)), Buffer.from(code))
    )
      return n;
  return null;
}
export function passwordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  return salt + ":" + scryptSync(password, salt, 64).toString("hex");
}
export function verifyPassword(password: string, hash: string) {
  try {
    const [salt, value] = hash.split(":");
    const expected = Buffer.from(value, "hex");
    const actual = scryptSync(password, salt, 64);
    return (
      expected.length === actual.length && timingSafeEqual(expected, actual)
    );
  } catch {
    return false;
  }
}
function sealKey() {
  const s = process.env.ADMIN_SECRET;
  if (!s || s.length < 32) throw Error("Staff security unavailable");
  return createHash("sha256")
    .update("installer-staff-totp:" + s)
    .digest();
}
export function sealTotp(secret: string) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", sealKey(), iv);
  return Buffer.concat([
    iv,
    cipher.update(secret, "utf8"),
    cipher.final(),
    cipher.getAuthTag(),
  ]).toString("base64");
}
export function openTotp(value: string) {
  const b = Buffer.from(value, "base64"),
    d = createDecipheriv("aes-256-gcm", sealKey(), b.subarray(0, 12));
  d.setAuthTag(b.subarray(-16));
  return Buffer.concat([d.update(b.subarray(12, -16)), d.final()]).toString(
    "utf8",
  );
}
export function recoveryHash(code: string) {
  return createHash("sha256")
    .update(code.replaceAll("-", "").toLowerCase())
    .digest("hex");
}
export function newRecoveryCodes() {
  return Array.from({ length: 10 }, () => randomBytes(12).toString("hex"));
}
