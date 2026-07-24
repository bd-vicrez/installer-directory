// Dry-run: count rows that would be affected by each statement in fix_state_data.sql.
const { Pool } = require('pg');
const DB_URL = 'postgresql://neondb_owner:npg_fXU85StGJWLd@ep-rough-tree-aihi1xgt-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';

(async () => {
  const pool = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
  const q = async (label, sql) => {
    const { rows } = await pool.query(sql);
    console.log(`${label}: ${rows[0].count} rows`);
  };
  await q("'mi' -> 'MI'", "SELECT COUNT(*) FROM installers WHERE state = 'mi'");
  await q("'Missouri' -> 'MO'", "SELECT COUNT(*) FROM installers WHERE state = 'Missouri'");
  await q("'Oregon' -> 'OR'", "SELECT COUNT(*) FROM installers WHERE state = 'Oregon'");
  await q("'District of Columbia' -> 'DC'", "SELECT COUNT(*) FROM installers WHERE state = 'District of Columbia'");
  await q("non-US (AB/BC/ON/QC/SK/Ontario/England) -> status='non_us_excluded'",
    "SELECT COUNT(*) FROM installers WHERE state IN ('AB','BC','ON','QC','SK','Ontario','England') AND status != 'removed'");
  await pool.end();
})().catch(e => { console.error(e); process.exit(1); });
