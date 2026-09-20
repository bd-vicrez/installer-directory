import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { UUID, rfqConfig } from "./directory-rfq";
import { QUOTE_SERVICES } from "./quote-services";
import { STATE_NAMES } from "./seo";
export class InputError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function textField(
  value: unknown,
  name: string,
  min = 0,
  max = 500,
): string {
  if (value == null && !min) return "";
  if (
    typeof value !== "string" ||
    value.trim().length < min ||
    value.trim().length > max ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)
  )
    throw new InputError("Check " + name + ".");
  return value.trim();
}
export function webLink(value: unknown, name = "website") {
  const raw = textField(value, name, 0, 500);
  if (!raw) return "";
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : "https://" + raw);
    if (
      !["https:", "http:"].includes(u.protocol) ||
      u.username ||
      u.password ||
      !u.hostname.includes(".") ||
      /[<>\s]/.test(raw)
    )
      throw 0;
    return u.href;
  } catch {
    throw new InputError("Enter a valid " + name + " URL.");
  }
}
export function emailField(value: unknown) {
  const email = textField(value, "email", 5, 255).toLowerCase();
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email))
    throw new InputError("Enter a valid email.");
  return email;
}
export function serviceFields(value: unknown): string[] {
  if (
    !Array.isArray(value) ||
    !value.length ||
    value.length > 8 ||
    value.some((x) => !QUOTE_SERVICES.some((s) => s.id === x))
  )
    throw new InputError("Select recorded services.");
  return [...new Set(value)].sort();
}
export function ownerDetails(body: any) {
  const parts = textField(body.parts_policy, "parts policy", 0, 40);
  if (
    parts &&
    !["accepts-customer-parts", "shop-supplied-only", "ask-shop"].includes(
      parts,
    )
  )
    throw new InputError("Choose a parts policy.");
  return {
    parts_policy: parts,
    service_details: textField(
      body.service_details,
      "service details",
      0,
      1000,
    ),
    vehicle_specialties: textField(
      body.vehicle_specialties,
      "vehicle specialties",
      0,
      500,
    ),
    tire_limits: textField(body.tire_limits, "tire and wheel limits", 0, 500),
    body_capabilities: textField(
      body.body_capabilities,
      "body and paint capabilities",
      0,
      500,
    ),
    wrap_materials: textField(
      body.wrap_materials,
      "wrap and PPF materials",
      0,
      500,
    ),
    equipment: textField(body.equipment, "equipment", 0, 500),
    hours_note: textField(body.hours_note, "hours", 0, 500),
  };
}
export function applicationInput(body: any) {
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    body.agreement !== true ||
    body.honeypot
  )
    throw new InputError(
      "Confirm the listing agreement and check your details.",
    );
  const request_id = textField(body.request_id, "request reference", 36, 36);
  if (!UUID.test(request_id))
    throw new InputError("Invalid request reference.");
  const state = textField(body.state, "state", 2, 2).toUpperCase();
  if (!STATE_NAMES[state]) throw new InputError("Choose a US state.");
  const zip = textField(body.zip, "ZIP", 5, 10);
  if (!/^\d{5}(?:-\d{4})?$/.test(zip))
    throw new InputError("Enter a valid ZIP.");
  const phone = textField(body.phone, "phone", 10, 30);
  if (!/^1?\d{10}$/.test(phone.replace(/\D/g, "")))
    throw new InputError("Enter a US phone number.");
  let instagram = textField(body.instagram, "Instagram", 0, 500);
  if (instagram && !instagram.includes("/"))
    instagram = "https://instagram.com/" + instagram.replace(/^@/, "");
  const website = webLink(body.website),
    facebook = webLink(body.facebook, "Facebook");
  instagram = webLink(instagram, "Instagram");
  if (!website && !facebook && !instagram)
    throw new InputError("Provide a business website or social profile.");
  const years = body.years_in_business;
  if (
    years != null &&
    years !== "" &&
    (!Number.isInteger(Number(years)) ||
      Number(years) < 0 ||
      Number(years) > 150)
  )
    throw new InputError("Check years in business.");
  if (body.inquiry_consent != null && typeof body.inquiry_consent !== "boolean")
    throw new InputError("Check inquiry participation.");
  return {
    request_id,
    business_name: textField(body.business_name, "business name", 2, 150),
    street: textField(body.street, "street address", 3, 200),
    city: textField(body.city, "city", 2, 100),
    state,
    zip,
    phone,
    email: emailField(body.email),
    website: website || instagram || facebook,
    services: serviceFields(body.services),
    details: {
      website,
      instagram,
      facebook,
      years_in_business: years == null || years === "" ? null : Number(years),
      google_business_url: webLink(body.google_business_url, "Google business"),
      description: textField(body.description, "description", 0, 1500),
      vehicle_brands: textField(body.vehicle_brands, "vehicle brands", 0, 500),
      how_heard: textField(body.how_heard, "referral", 0, 120),
      other_service: textField(body.other_service, "other service", 0, 300),
      inquiry_consent: body.inquiry_consent === true,
      ...ownerDetails(body),
    },
  };
}
export const payloadHash = (data: unknown) =>
  createHash("sha256").update(JSON.stringify(data)).digest("hex");
export function statusToken(
  kind: string,
  id: string,
  submitted: string | Date,
) {
  const payload = Buffer.from(
    JSON.stringify({
      kind,
      id,
      exp: Math.floor(new Date(submitted).getTime() / 1000) + 180 * 86400,
    }),
  ).toString("base64url");
  return (
    payload +
    "." +
    createHmac("sha256", rfqConfig().secret)
      .update("onboarding:" + payload)
      .digest("base64url")
  );
}
export function readStatusToken(token: unknown) {
  try {
    if (typeof token !== "string" || token.length > 600) throw 0;
    const [p, s, ...rest] = token.split(".");
    if (rest.length) throw 0;
    const expected = createHmac("sha256", rfqConfig().secret)
      .update("onboarding:" + p)
      .digest();
    const got = Buffer.from(s, "base64url");
    if (got.length !== expected.length || !timingSafeEqual(got, expected))
      throw 0;
    const value = JSON.parse(Buffer.from(p, "base64url").toString());
    if (
      !["application", "claim"].includes(value.kind) ||
      !(value.kind === "application"
        ? /^[A-Za-z0-9_-]{1,80}$/.test(value.id)
        : UUID.test(value.id)) ||
      !Number.isFinite(value.exp) ||
      value.exp < Date.now() / 1000
    )
      throw 0;
    return value;
  } catch {
    throw new InputError("This status link is invalid or expired.", 403);
  }
}
export async function readSmallJson(request: Request, limit = 16000) {
  const text = await request.text();
  if (Buffer.byteLength(text) > limit)
    throw new InputError("Submission is too large.", 413);
  try {
    const b = JSON.parse(text);
    if (!b || typeof b !== "object" || Array.isArray(b)) throw 0;
    return b;
  } catch {
    throw new InputError("Invalid submission.");
  }
}
