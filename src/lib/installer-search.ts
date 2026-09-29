import { serviceSql } from "@/lib/service-taxonomy";
import { getPool } from "@/lib/db";
import { VERIFIED_KEYWORDS } from "@/lib/utils";
import {
  PUBLIC_INSTALLER_FIELDS,
  readSearchOptions,
  toPublicInstaller,
} from "@/lib/public-installers";
import { geocodeLocation } from "@/lib/geocode";
import { USABLE_LOCATION_SQL } from "@/lib/location-quality";

export class InstallerSearchError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function searchInstallers(params: URLSearchParams) {
  let options;
  try {
    options = readSearchOptions(params);
  } catch {
    throw new InstallerSearchError(
      "Check your location, filters and page settings.",
      400,
    );
  }
  let location =
    options.lat !== null && options.lng !== null
      ? {
          lat: options.lat,
          lng: options.lng,
          label: "Your location",
          city: "",
          state: "",
          zip: "",
        }
      : null;
  if (options.q && !location) {
    location = await geocodeLocation(options.q);
    if (!location)
      throw new InstallerSearchError(
        "Location not found. Enter a US ZIP code or city and state.",
        422,
      );
  }
  const values: any[] = [];
  const bind = (value: any) => {
    values.push(value);
    return "$" + values.length;
  };
  const verified = bind(
    VERIFIED_KEYWORDS.map((k) => "%" + k.toLowerCase() + "%"),
  );
  const tier = `CASE WHEN LOWER(COALESCE(source,'')) LIKE ANY(${verified}::text[]) THEN 'verified' ELSE 'listed' END`;
  let distance = "NULL::double precision";
  if (location) {
    const lat = bind(location.lat),
      lng = bind(location.lng);
    distance = `CASE WHEN ${USABLE_LOCATION_SQL} THEN 3958.8 * 2 * ASIN(SQRT(LEAST(1.0,GREATEST(0.0,POWER(SIN(RADIANS(lat::float8-${lat})/2),2)+COS(RADIANS(${lat}))*COS(RADIANS(lat::float8))*POWER(SIN(RADIANS(lng::float8-${lng})/2),2))))) END`;
  }
  const conditions = ["status NOT IN ('removed','non_us_excluded')"];
  if (options.service) {
    conditions.push(serviceSql(options.service, bind));
  }
  const filters: string[] = [];
  if (location) {
    const radius = bind(options.radius);
    const sameCity =
      location.city && location.state
        ? `(LOWER(city)=LOWER(${bind(location.city)}) AND UPPER(state)=UPPER(${bind(location.state)}))`
        : "false";
    const sameZip = location.zip
      ? `LEFT(zip_code,5)=${bind(location.zip)}`
      : "false";
    filters.push(
      `(distance <= ${radius} OR (distance IS NULL AND (${sameCity} OR ${sameZip})))`,
    );
  }
  if (options.tier) filters.push("tier = " + bind(options.tier));
  if (options.inquiry) filters.push("quote_available=true");
  const available = `COALESCE(status='active' AND quote_routing_enabled=true AND owner_inquiry_paused=false AND LENGTH(routing_email)<=255 AND BTRIM(routing_email) ~ '^[^[:space:]@<>]+@[^[:space:]@<>]+\\.[^[:space:]@<>]+$' AND COALESCE(google_status,'') NOT IN ('CLOSED_PERMANENTLY','CLOSED_TEMPORARILY'),false)`;
  const cte = `WITH candidates AS (SELECT ${PUBLIC_INSTALLER_FIELDS.join(",")}, owner_details, owner_details_confirmed_at, owner_reconfirmed_at, ${tier} AS tier, ${distance} AS distance, ${available} AS quote_available FROM installers WHERE ${conditions.join(" AND ")}), matches AS (SELECT * FROM candidates ${filters.length ? "WHERE " + filters.join(" AND ") : ""})`;
  const db = getPool();
  const counts = await db.query(
    cte +
      ` SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE tier='verified')::int AS verified, COUNT(*) FILTER (WHERE NOT COALESCE((${USABLE_LOCATION_SQL}),false))::int AS location_unconfirmed FROM matches`,
    values,
  );
  const ordering =
    options.sort === "nearest" && location
      ? "distance ASC NULLS LAST, id ASC"
      : location
        ? "(distance IS NULL) ASC, FLOOR(distance/10) ASC NULLS LAST, quote_available DESC, distance ASC NULLS LAST, id ASC"
        : "quote_available DESC, business_name ASC, id ASC";
  const page = await db.query(
    cte +
      ` SELECT * FROM matches ORDER BY ${ordering} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, options.limit, options.offset],
  );
  const { total, verified: verifiedCount } = counts.rows[0];
  return {
    installers: page.rows.map(toPublicInstaller),
    total,
    verified: verifiedCount,
    listed: total - verifiedCount,
    location_unconfirmed: counts.rows[0].location_unconfirmed || 0,
    limit: options.limit,
    offset: options.offset,
    location,
  };
}
