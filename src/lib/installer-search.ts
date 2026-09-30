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

export type SearchTimings = Partial<
  Record<"geocode" | "connection" | "database" | "search", number>
>;

export async function searchInstallers(
  params: URLSearchParams,
  timings: SearchTimings = {},
) {
  const started = Date.now();
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
    const geocodeStarted = Date.now();
    location = await geocodeLocation(options.q);
    timings.geocode = Date.now() - geocodeStarted;
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
  // Materialize only the small matching/sorting projection once. Fetch full
  // public records for the requested page after counting and pagination.
  const cte = `WITH candidates AS (SELECT id,business_name,city,state,zip_code,
    ${tier} AS tier, ${distance} AS distance, ${available} AS quote_available,
    NOT COALESCE((${USABLE_LOCATION_SQL}),false) AS location_unconfirmed
    FROM installers WHERE ${conditions.join(" AND ")}),
    matches AS MATERIALIZED (SELECT * FROM candidates ${filters.length ? "WHERE " + filters.join(" AND ") : ""})`;
  const db = getPool();
  const ordering = (prefix: string) =>
    options.sort === "nearest" && location
      ? `${prefix}distance ASC NULLS LAST, ${prefix}id ASC`
      : location
        ? `(${prefix}distance IS NULL) ASC, FLOOR(${prefix}distance/10) ASC NULLS LAST, ${prefix}quote_available DESC, ${prefix}distance ASC NULLS LAST, ${prefix}id ASC`
        : `${prefix}quote_available DESC, ${prefix}business_name ASC, ${prefix}id ASC`;
  const connectionStarted = Date.now();
  const client = await db.connect();
  timings.connection = Date.now() - connectionStarted;
  const databaseStarted = Date.now();
  let result;
  try {
    result = await client.query(
      cte +
        `, counts AS (SELECT COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE tier='verified')::int AS verified,
        COUNT(*) FILTER (WHERE location_unconfirmed)::int AS location_unconfirmed FROM matches),
      page AS (SELECT * FROM matches ORDER BY ${ordering("")} LIMIT $${values.length + 1} OFFSET $${values.length + 2})
      SELECT counts.*, COALESCE((SELECT json_agg(shop) FROM (
        SELECT ${PUBLIC_INSTALLER_FIELDS.map((field) => "i." + field).join(",")},
          i.owner_details,i.owner_details_confirmed_at,i.owner_reconfirmed_at,
          p.tier,p.distance,p.quote_available
        FROM page p JOIN installers i ON i.id=p.id ORDER BY ${ordering("p.")}
      ) shop),'[]'::json) AS installers FROM counts`,
      [...values, options.limit, options.offset],
    );
  } finally {
    client.release();
  }
  timings.database = Date.now() - databaseStarted;
  timings.search = Date.now() - started;
  const {
    total,
    verified: verifiedCount,
    location_unconfirmed,
    installers,
  } = result.rows[0];
  return {
    installers: installers.map(toPublicInstaller),
    total,
    verified: verifiedCount,
    listed: total - verifiedCount,
    location_unconfirmed: location_unconfirmed || 0,
    limit: options.limit,
    offset: options.offset,
    location,
  };
}
