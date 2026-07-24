// Find installer slugs containing whitespace - root cause of 404s in GSC
const { Pool } = require('pg');
const DB = 'postgresql://neondb_owner:npg_fXU85StGJWLd@ep-rough-tree-aihi1xgt-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';

(async () => {
  const pool = new Pool({ connectionString: DB, ssl: { rejectUnauthorized: false } });

  // Installers with bad slugs (whitespace in slug)
  const badInst = await pool.query(`
    SELECT COUNT(*) FROM installers WHERE slug ~ '\\s'
  `);
  console.log('Installers with whitespace in slug:', badInst.rows[0].count);

  // Sample
  const sample = await pool.query(`
    SELECT id, business_name, city, state, slug FROM installers WHERE slug ~ '\\s' LIMIT 5
  `);
  console.log('Sample bad slugs:');
  sample.rows.forEach(r => console.log(' -', r.slug, '(state:', r.state + ')'));

  // What states are involved
  const states = await pool.query(`
    SELECT state, COUNT(*) FROM installers WHERE slug ~ '\\s' GROUP BY state ORDER BY 2 DESC
  `);
  console.log('\nBy state:');
  states.rows.forEach(r => console.log(' -', r.state, ':', r.count));

  // Check: do the location pages (city listings) ALSO use bad slugs? Or are they generated from city+state field?
  // The /installers/[location] route — let's see what locations exist with whitespace
  const locSample = await pool.query(`
    SELECT DISTINCT city, state FROM installers
    WHERE state ~ '\\s' OR city ~ '\\s'
    LIMIT 10
  `);
  console.log('\nCities/states with whitespace (drives bad /installers/ slugs):');
  locSample.rows.forEach(r => console.log(' -', r.city, '|', r.state));

  await pool.end();
})().catch(e => { console.error(e); process.exit(1); });
