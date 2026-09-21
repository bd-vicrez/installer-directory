import { createHash } from "node:crypto";
const stable = (v: any): any =>
  Array.isArray(v)
    ? v.map(stable)
    : v && typeof v === "object"
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, stable(v[k])]),
        )
      : v;
export function listingSnapshot(row: any) {
  return {
    business_name: row.business_name,
    street_address: row.street_address,
    city: row.city,
    state: row.state,
    zip_code: row.zip_code,
    phone: row.phone || row.google_phone || "",
    website: row.website || row.google_website || "",
    services: row.install_capabilities,
    hours: row.google_hours,
    owner_details: row.owner_details || {},
    paused: row.owner_inquiry_paused === true,
    inquiry_enabled: row.quote_routing_enabled === true,
    status: row.status,
  };
}
export const listingHash = (row: any) =>
  createHash("sha256")
    .update(JSON.stringify(stable(listingSnapshot(row))))
    .digest("hex");
export function listingFreshness(row: any, now = Date.now()) {
  const stamp = row.owner_reconfirmed_at
    ? new Date(row.owner_reconfirmed_at).toISOString()
    : null;
  const matches = !!stamp && row.owner_reconfirmation_hash === listingHash(row);
  return {
    last_confirmed_at: stamp,
    current: matches && now - Date.parse(stamp!) < 90 * 86400000,
    details_unchanged: matches,
    next_due_at: stamp
      ? new Date(Date.parse(stamp) + 90 * 86400000).toISOString()
      : null,
  };
}
