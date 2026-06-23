// Get top 20 cities that already have city_seo content - these are
// the highest-priority pages to manually request indexing for.
const { Pool } = require('pg');
const DB = 'postgresql://neondb_owner:npg_fXU85StGJWLd@ep-rough-tree-aihi1xgt-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';

(async () => {
  const p = new Pool({connectionString:DB, ssl:{rejectUnauthorized:false}});

  // Cities with city_seo content + their installer counts
  const r = await p.query(`
    SELECT cs.city, cs.state, COALESCE(c.n, 0) AS installer_count
    FROM city_seo cs
    LEFT JOIN (
      SELECT city, state, COUNT(*) AS n FROM installers
      WHERE status NOT IN ('removed','non_us_excluded') GROUP BY city, state
    ) c
      ON LOWER(c.city) = LOWER(cs.city) AND LOWER(c.state) = LOWER(cs.state)
    ORDER BY installer_count DESC NULLS LAST
    LIMIT 20
  `);

  console.log('Top 20 priority cities (have city_seo content + most installers):');
  console.log('---');
  for (const row of r.rows) {
    // Build URL: city-statelower (state abbreviation expected)
    const stateLower = row.state.toLowerCase();
    const citySlug = row.city.toLowerCase().replace(/\s+/g, '-');
    const url = `https://installers.vicrez.com/installers/${citySlug}-${stateLower}`;
    console.log(`${url}  (${row.installer_count} installers)`);
  }
  await p.end();
})().catch(e => { console.error(e); process.exit(1); });
