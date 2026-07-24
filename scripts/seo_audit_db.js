// Quick DB audit for SEO data quality issues.
const { Pool } = require('pg');

const DB_URL = 'postgresql://neondb_owner:npg_fXU85StGJWLd@ep-rough-tree-aihi1xgt-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';

(async () => {
  const pool = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

  console.log('--- 1. State variants (the Michigan duplicate cause) ---');
  const states = await pool.query(`
    SELECT state, COUNT(*) as count
    FROM installers
    WHERE status != 'removed' AND state IS NOT NULL AND state != ''
    GROUP BY state
    ORDER BY state
  `);
  console.log(states.rows);

  console.log('\n--- 2. Top 50 city/state combinations by installer count ---');
  const topCities = await pool.query(`
    SELECT city, state, COUNT(*) as count
    FROM installers
    WHERE status != 'removed' AND city IS NOT NULL AND city != ''
    GROUP BY city, state
    ORDER BY count DESC
    LIMIT 50
  `);
  console.table(topCities.rows);

  console.log('\n--- 3. Total counts ---');
  const totals = await pool.query(`
    SELECT
      COUNT(*) as total_installers,
      COUNT(DISTINCT slug) as unique_slugs,
      COUNT(DISTINCT (city || '|' || state)) as unique_city_state,
      COUNT(*) FILTER (WHERE source ILIKE '%verified%' OR source ILIKE '%dealer%') as verified
    FROM installers WHERE status != 'removed'
  `);
  console.log(totals.rows[0]);

  console.log('\n--- 4. Sample of city pages that have only 1 installer (thin content risk) ---');
  const thinCities = await pool.query(`
    SELECT city, state, COUNT(*) as count
    FROM installers
    WHERE status != 'removed' AND city IS NOT NULL
    GROUP BY city, state
    HAVING COUNT(*) = 1
    ORDER BY city
    LIMIT 10
  `);
  console.log(thinCities.rows);

  console.log('\n--- 5. Check if seo_content column already exists (for storing AI-generated copy) ---');
  const cols = await pool.query(`
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_name = 'installers' ORDER BY ordinal_position
  `);
  console.log('Installer table columns:', cols.rows.map(r => r.column_name).join(', '));

  await pool.end();
})().catch(e => { console.error(e); process.exit(1); });
