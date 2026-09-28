// A city center or placeholder address must never look like a shop destination.
export function publicZip(value: unknown): string {
  const zip = typeof value === "string" ? value.trim() : "";
  return /^(?!00000)\d{5}(?:-\d{4})?$/.test(zip) ? zip : "";
}
export function usableShopLocation(row: Record<string, any>): boolean {
  return (
    row.lat != null &&
    row.lng != null &&
    Number.isFinite(Number(row.lat)) &&
    Number.isFinite(Number(row.lng)) &&
    Number(row.lat) >= -90 &&
    Number(row.lat) <= 90 &&
    Number(row.lng) >= -180 &&
    Number(row.lng) <= 180 &&
    !!publicZip(row.zip_code) &&
    /\d/.test(String(row.street_address || "")) &&
    !/^(?:p\.?\s*o\.?\s*box|mobile|service area)/i.test(
      String(row.street_address || "").trim(),
    )
  );
}
// Keep this equivalent to usableShopLocation for bounded SQL search/pagination.
export const USABLE_LOCATION_SQL = `lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180
 AND COALESCE(zip_code,'') ~ '^[0-9]{5}(-[0-9]{4})?$' AND LEFT(zip_code,5)<>'00000'
 AND COALESCE(street_address,'') ~ '[0-9]'
 AND BTRIM(COALESCE(street_address,'')) !~* '^(p[.]?[[:space:]]*o[.]?[[:space:]]*box|mobile|service area)'`;
export const PARTS_POLICY_LABELS: Record<string, string> = {
  "accepts-customer-parts":
    "Accepts customer-supplied parts; confirm your part",
  "shop-supplied-only": "Shop-supplied parts only",
  "ask-shop": "Ask the shop about supplied parts",
};
