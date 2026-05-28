// Applies fix_state_data.sql against Neon. Idempotent.
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const DB_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_fXU85StGJWLd@ep-rough-tree-aihi1xgt-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';

(async () => {
  const pool = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
  const sql = fs.readFileSync(path.join(__dirname, 'fix_state_data.sql'), 'utf8');

  console.log('--- BEFORE: state distribution ---');
  const before = await pool.query(`
    SELECT state, COUNT(*) as count FROM installers
    WHERE status != 'removed' AND state IS NOT NULL AND state != ''
    GROUP BY state ORDER BY state
  `);
  console.log(`${before.rows.length} distinct state values`);

  console.log('\nApplying migration...');
  await pool.query(sql);

  console.log('\n--- AFTER: state distribution ---');
  const after = await pool.query(`
    SELECT state, COUNT(*) as count FROM installers
    WHERE status != 'removed' AND state IS NOT NULL AND state != ''
    GROUP BY state ORDER BY state
  `);
  console.log(`${after.rows.length} distinct state values`);
  console.log(after.rows);

  await pool.end();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
