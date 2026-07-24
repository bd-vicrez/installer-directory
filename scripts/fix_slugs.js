// Fix 972 installer slugs that contain whitespace (root cause of GSC 404s).
// Strategy: lowercase + replace any whitespace runs with single hyphen, then
//   collapse repeated hyphens, then strip leading/trailing hyphens.
// IDEMPOTENT - safe to re-run.
// Backup: previous slug -> slug_old column (for rollback if needed).

const { Pool } = require('pg');
const DB = 'postgresql://neondb_owner:npg_fXU85StGJWLd@ep-rough-tree-aihi1xgt-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';

(async () => {
  const pool = new Pool({ connectionString: DB, ssl: { rejectUnauthorized: false } });

  // Add slug_old backup column if not already there
  await pool.query(`ALTER TABLE installers ADD COLUMN IF NOT EXISTS slug_old TEXT`);
  console.log('slug_old column ready');

  // Count bad slugs before
  const before = await pool.query(`SELECT COUNT(*) FROM installers WHERE slug ~ '\\s'`);
  console.log('Bad slugs BEFORE fix:', before.rows[0].count);

  if (before.rows[0].count === '0') {
    console.log('Nothing to fix. Exiting.');
    await pool.end();
    return;
  }

  // Backup and fix
  // 1) Save current bad slug to slug_old
  // 2) Build new slug: lowercase, whitespace -> hyphen, collapse multi-hyphens, trim
  const result = await pool.query(`
    UPDATE installers
       SET slug_old = slug,
           slug = TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER(REGEXP_REPLACE(slug, '\\s+', '-', 'g')), '-+', '-', 'g'))
     WHERE slug ~ '\\s'
       AND slug_old IS NULL
    RETURNING id, business_name, slug_old AS old_slug, slug AS new_slug
  `);

  console.log(`Fixed ${result.rowCount} slugs.`);
  console.log('Sample changes:');
  result.rows.slice(0, 8).forEach(r => {
    console.log(`  ${r.old_slug}`);
    console.log(`  -> ${r.new_slug}`);
    console.log('');
  });

  // Verify
  const after = await pool.query(`SELECT COUNT(*) FROM installers WHERE slug ~ '\\s'`);
  console.log('Bad slugs AFTER fix:', after.rows[0].count);

  // Check for duplicates created by normalization
  const dupes = await pool.query(`
    SELECT slug, COUNT(*) as n FROM installers GROUP BY slug HAVING COUNT(*) > 1 ORDER BY n DESC LIMIT 10
  `);
  if (dupes.rowCount > 0) {
    console.log(`\n⚠️ ${dupes.rowCount} duplicate slugs after fix (first 10):`);
    dupes.rows.forEach(r => console.log(`  - ${r.slug} (x${r.n})`));
  } else {
    console.log('\n✅ No duplicate slugs after fix.');
  }

  await pool.end();
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
