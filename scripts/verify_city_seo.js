const { Pool } = require('pg');
const DB_URL = 'postgresql://neondb_owner:npg_fXU85StGJWLd@ep-rough-tree-aihi1xgt-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';
(async () => {
  const pool = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
  const { rows } = await pool.query(`
    SELECT city, state, intro, local_scene, what_to_ask, cost_context,
           LENGTH(intro || ' ' || local_scene || ' ' || what_to_ask || ' ' || cost_context) as total_chars
    FROM city_seo WHERE city IN ('Los Angeles','Houston','Brooklyn','Rutland') ORDER BY city
  `);
  for (const r of rows) {
    console.log(`\n=== ${r.city}, ${r.state} (${r.total_chars} chars total) ===`);
    console.log('INTRO:', r.intro.slice(0,300), '...');
    console.log('LOCAL_SCENE:', r.local_scene.slice(0,200), '...');
    console.log('WHAT_TO_ASK:', r.what_to_ask.slice(0,200), '...');
    console.log('COST:', r.cost_context.slice(0,200), '...');
  }
  const { rows: count } = await pool.query(`SELECT COUNT(*), AVG(LENGTH(intro || local_scene || what_to_ask || cost_context)) as avg_chars FROM city_seo`);
  console.log('\nTotal rows:', count[0].count, '| Avg chars:', Math.round(count[0].avg_chars));
  await pool.end();
})();
