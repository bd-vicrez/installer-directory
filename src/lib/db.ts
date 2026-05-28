import { Pool } from 'pg';

let pool: Pool;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }
  return pool;
}

export async function queryInstallers(whereClause = '', params: any[] = []) {
  const db = getPool();
  const query = `SELECT * FROM installers WHERE status != 'removed' ${whereClause} ORDER BY id`;
  const { rows } = await db.query(query, params);
  return rows;
}

export async function queryInstallersByCity(city: string, state: string) {
  return queryInstallers(
    'AND LOWER(city) = LOWER($1) AND LOWER(state) = LOWER($2)',
    [city, state]
  );
}

export async function queryInstallersByState(state: string) {
  return queryInstallers('AND LOWER(state) = LOWER($1)', [state]);
}

export async function queryAllCitiesWithCounts() {
  const db = getPool();
  const { rows } = await db.query(`
    SELECT city, state, COUNT(*) as count
    FROM installers
    WHERE status NOT IN ('removed', 'non_us_excluded')
      AND city IS NOT NULL AND city != ''
    GROUP BY city, state
    ORDER BY count DESC
  `);
  return rows;
}

export async function queryAllStatesWithCounts() {
  const db = getPool();
  const { rows } = await db.query(`
    SELECT state, COUNT(*) as count
    FROM installers
    WHERE status NOT IN ('removed', 'non_us_excluded')
      AND state IS NOT NULL AND state != ''
    GROUP BY state
    ORDER BY state
  `);
  return rows;
}

export async function queryTopCities(limit = 50) {
  const db = getPool();
  const { rows } = await db.query(`
    SELECT city, state, COUNT(*) as count
    FROM installers
    WHERE status != 'removed' AND city IS NOT NULL AND city != ''
    GROUP BY city, state
    ORDER BY count DESC
    LIMIT $1
  `, [limit]);
  return rows;
}

export async function queryInstallerBySlug(slug: string) {
  const db = getPool();
  const { rows } = await db.query(
    `SELECT * FROM installers WHERE slug = $1 AND status != 'removed' LIMIT 1`,
    [slug]
  );
  return rows[0] || null;
}

export interface CitySeoContent {
  intro: string | null;
  local_scene: string | null;
  what_to_ask: string | null;
  cost_context: string | null;
}

export async function queryCitySeoContent(city: string, state: string): Promise<CitySeoContent | null> {
  const db = getPool();
  try {
    const { rows } = await db.query(
      `SELECT intro, local_scene, what_to_ask, cost_context
         FROM city_seo
        WHERE LOWER(city) = LOWER($1) AND LOWER(state) = LOWER($2)
        LIMIT 1`,
      [city, state]
    );
    return rows[0] || null;
  } catch (e: any) {
    // Table may not exist yet in dev; fail soft.
    if (e && e.code === '42P01') return null;
    throw e;
  }
}

export async function queryInstallersByCapability(capability: string, limit = 100) {
  const db = getPool();
  const pattern = `%${capability}%`;
  const { rows } = await db.query(
    `SELECT * FROM installers
     WHERE status != 'removed'
       AND (
         install_capabilities::text ILIKE $1
         OR specialize_in ILIKE $1
         OR shop_type ILIKE $1
       )
     ORDER BY google_rating DESC NULLS LAST, google_review_count DESC NULLS LAST
     LIMIT $2`,
    [pattern, limit]
  );
  return rows;
}

export async function queryInstallerStats() {
  const db = getPool();
  const { rows } = await db.query(`
    SELECT
      COUNT(*) FILTER (WHERE status != 'removed') as total,
      COUNT(*) FILTER (WHERE status != 'removed' AND (
        source ILIKE '%[New Dealer Form]%'
        OR source ILIKE '%[CS Sheet]%'
        OR source ILIKE '%[Vicrez Business Network]%'
        OR source ILIKE '%Alex Cold Call%'
        OR source ILIKE '%manual%'
      )) as verified,
      COUNT(DISTINCT state) FILTER (WHERE status != 'removed') as states
    FROM installers
  `);
  return rows[0];
}

export async function queryAllInstallerSlugs(limit = 500) {
  const db = getPool();
  const { rows } = await db.query(
    `SELECT slug FROM installers
     WHERE status != 'removed' AND slug IS NOT NULL AND slug != ''
     ORDER BY google_review_count DESC NULLS LAST
     LIMIT $1`,
    [limit]
  );
  return rows.map((r: any) => r.slug);
}
