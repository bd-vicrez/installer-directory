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
    WHERE status != 'removed' AND city IS NOT NULL AND city != ''
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
    WHERE status != 'removed' AND state IS NOT NULL AND state != ''
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
