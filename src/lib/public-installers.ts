import {
  DIRECTORY_SERVICES,
  normalizeService,
  serviceLabels,
} from "./service-taxonomy";
import type { Installer } from "./types";
import { getTier, parseCapabilities } from "./utils";
import { canReceiveQuote } from "./installer-contact";

export const PUBLIC_INSTALLER_FIELDS = [
  "id",
  "slug",
  "business_name",
  "street_address",
  "city",
  "state",
  "zip_code",
  "phone",
  "website",
  "install_capabilities",
  "shop_type",
  "specialize_in",
  "lat",
  "lng",
  "google_place_id",
  "google_rating",
  "google_review_count",
  "google_hours",
  "google_phone",
  "google_website",
  "google_status",
] as const;
export type PublicInstaller = Pick<
  Installer,
  (typeof PUBLIC_INSTALLER_FIELDS)[number]
> & {
  tier: "verified" | "listed";
  distance: number | null;
  rating: number | null;
  capabilities: string[];
  quote_available: boolean;
};
// Never spread a database row into a response or client-component prop.
export function toPublicInstaller(row: Record<string, any>): PublicInstaller {
  const result: Record<string, any> = {};
  for (const key of PUBLIC_INSTALLER_FIELDS) result[key] = row[key] ?? null;
  return {
    ...result,
    tier:
      row.tier === "verified"
        ? "verified"
        : row.tier === "listed"
          ? "listed"
          : getTier(row.source || ""),
    distance:
      row.distance == null ? null : Math.round(Number(row.distance) * 10) / 10,
    rating: row.google_rating == null ? null : Number(row.google_rating),
    capabilities: serviceLabels(row.install_capabilities || ""),
    quote_available: row.quote_available === true || canReceiveQuote(row),
  } as PublicInstaller;
}
export const SERVICE_KEYWORDS = Object.fromEntries(
  DIRECTORY_SERVICES.map((s) => [s.id, s.aliases]),
);
export function readSearchOptions(params: URLSearchParams) {
  const number = (key: string, fallback: number, min: number, max: number) => {
    const raw = params.get(key),
      value = raw == null ? fallback : Number(raw);
    if (raw === "" || !Number.isFinite(value) || value < min || value > max)
      throw new Error("Invalid " + key);
    return value;
  };
  const hasLat = params.has("lat"),
    hasLng = params.has("lng");
  if (hasLat !== hasLng)
    throw new Error("Location requires latitude and longitude");
  const service = normalizeService(params.get("service") || "");
  if (service && !SERVICE_KEYWORDS[service]) throw new Error("Invalid service");
  const tier = params.get("tier") || "";
  if (tier && tier !== "verified") throw new Error("Invalid tier");
  const q = (params.get("q") || "").trim();
  if (q.length > 120) throw new Error("Location is too long");
  const limit = number("limit", 24, 1, 48),
    offset = number("offset", 0, 0, 100000);
  if (!Number.isInteger(limit) || !Number.isInteger(offset))
    throw new Error("Invalid page");
  const sort = params.get("sort") || "recommended";
  if (!["recommended", "nearest"].includes(sort))
    throw new Error("Invalid sort");
  const inquiry = params.get("inquiry") || "";
  if (inquiry && inquiry !== "1") throw new Error("Invalid availability");
  return {
    q,
    service,
    tier,
    limit,
    offset,
    sort,
    inquiry,
    radius: number("radius", 50, 1, 250),
    lat: hasLat ? number("lat", 0, -90, 90) : null,
    lng: hasLng ? number("lng", 0, -180, 180) : null,
  };
}
