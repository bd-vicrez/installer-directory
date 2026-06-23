const { Pool } = require('pg');
const p = new Pool({ connectionString: 'postgresql://neondb_owner:npg_fXU85StGJWLd@ep-rough-tree-aihi1xgt-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require' });

(async () => {
  const r = await p.query(`SELECT city, state, COUNT(*) as count FROM installers WHERE state = 'AR' GROUP BY city, state ORDER BY count DESC LIMIT 20`);
  console.log('Arkansas installer cities:');
  console.log(JSON.stringify(r.rows, null, 2));
  await p.end();
})().catch(e => { console.error(e.message); process.exit(1); });
