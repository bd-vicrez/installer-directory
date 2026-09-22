import { cache } from "react";
import { getPool } from "./db";
import {
  STATE_NAMES,
  parseCityStateSlug,
  stateAbbrFromSlug,
} from "./locations";
import { CATEGORIES } from "./categories";
import { serviceSql } from "./service-taxonomy";
import { VERIFIED_KEYWORDS } from "./utils";
import { Installer } from "./types";

export const LOCATION_PAGE_SIZE = 24;
// No private contact, internal notes or owner proposal data is needed by listing cards.
const CARD_FIELDS =
  "id,slug,business_name,city,state,street_address,zip_code,phone,google_phone,website,google_website,lat,lng,install_capabilities,source,status,google_rating,google_review_count";

/** Request-scoped memoization shares metadata/render reads without caching permissions across requests. */
export const locationPage = cache(
  async (slug: string, page: number, category?: string) => {
    if (category && !Object.hasOwn(CATEGORIES, category)) return null;
    const state = stateAbbrFromSlug(slug);
    const parsed = state ? null : parseCityStateSlug(slug);
    const stateAbbr = state || parsed?.stateAbbr;
    if (!stateAbbr) return null;
    const city = parsed?.city
      ? parsed.city.replace(/\b\w/g, (c) => c.toUpperCase())
      : null;
    const values: unknown[] = [stateAbbr];
    const bind = (v: unknown) => {
      values.push(v);
      return "$" + values.length;
    };
    const where =
      "status NOT IN ('removed','non_us_excluded') AND LOWER(state)=LOWER($1)" +
      (city ? ` AND LOWER(city)=LOWER(${bind(city)})` : "");
    const recorded = `COALESCE(source ILIKE ANY(${bind(VERIFIED_KEYWORDS.map((k) => `%${k}%`))}::text[]),FALSE)`;
    const service = category ? serviceSql(category, bind) : "TRUE";
    const db = getPool();
    const counts = (
      await db.query(
        `SELECT COUNT(*)::int AS location_total,
    COUNT(*) FILTER (WHERE ${service})::int AS total,
    COUNT(*) FILTER (WHERE ${service} AND ${recorded})::int AS recorded
    FROM installers WHERE ${where}`,
        values,
      )
    ).rows[0];
    if (!counts.location_total) return null;
    const pages = Math.max(1, Math.ceil(counts.total / LOCATION_PAGE_SIZE));
    const order = category
      ? "google_rating DESC NULLS LAST,google_review_count DESC NULLS LAST,id ASC"
      : "id ASC";
    const rows: Installer[] =
      page > pages
        ? []
        : (
            await db.query(
              `SELECT ${CARD_FIELDS} FROM installers WHERE ${where} AND ${service}
     ORDER BY ${recorded} DESC,${order} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
              [...values, LOCATION_PAGE_SIZE, (page - 1) * LOCATION_PAGE_SIZE],
            )
          ).rows;
    return {
      type: city ? ("city" as const) : ("state" as const),
      city,
      stateAbbr,
      stateName: STATE_NAMES[stateAbbr],
      total: counts.total as number,
      totalInLocation: counts.location_total as number,
      recorded: counts.recorded as number,
      rows,
      pages,
    };
  },
);

export const locationCities = cache(
  async (state: string, excludeCity: string | null, limit: number) => {
    return (
      await getPool().query(
        `SELECT city,state,COUNT(*)::int AS count FROM installers
    WHERE status NOT IN ('removed','non_us_excluded') AND LOWER(state)=LOWER($1)
      AND city IS NOT NULL AND city<>'' AND ($2::text IS NULL OR LOWER(city)<>LOWER($2))
    GROUP BY city,state ORDER BY count DESC,city ASC LIMIT $3`,
        [state, excludeCity, limit],
      )
    ).rows;
  },
);
