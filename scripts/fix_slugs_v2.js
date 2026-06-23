// Fix 972 installer slugs with whitespace.
// Two-phase, collision-safe:
//   Phase 1: for each bad slug, compute candidate normalized slug.
//     If candidate is unique among all installers, take it.
//     If candidate conflicts, append "-{id}" to make it unique.
//   Phase 2: row-by-row update (idempotent, transactional per row).

const { Pool } = require('pg');
const DB = 'postgresql://neondb_owner:npg_fXU85StGJWLd@ep-rough-tree-aihi1xgt-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';

function normalize(s) {
  return s.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

(async () => {
  const pool = new Pool({ connectionString: DB, ssl: { rejectUnauthorized: false } });

  await pool.query(`ALTER TABLE installers ADD COLUMN IF NOT EXISTS slug_old TEXT`);

  const before = await pool.query(`SELECT COUNT(*) FROM installers WHERE slug ~ '\\s'`);
  console.log('Bad slugs BEFORE fix:', before.rows[0].count);
  if (before.rows[0].count === '0') {
    console.log('Nothing to fix.');
    await pool.end();
    return;
  }

  // Load every slug to detect collisions in-memory
  const allSlugs = await pool.query(`SELECT id, slug FROM installers`);
  const slugMap = new Map();
  for (const row of allSlugs.rows) slugMap.set(row.slug, row.id);

  // Find all bad slugs
  const bad = await pool.query(`SELECT id, slug FROM installers WHERE slug ~ '\\s'`);
  console.log(`Loaded ${bad.rowCount} bad-slug rows.`);

  // Plan new slug for each
  const plan = [];
  let collisions = 0;
  for (const row of bad.rows) {
    const candidate = normalize(row.slug);
    let newSlug = candidate;
    // If candidate clashes with someone else (not me), append -id
    const owner = slugMap.get(candidate);
    if (owner !== undefined && owner !== row.id) {
      newSlug = `${candidate}-${row.id}`;
      collisions++;
    }
    // Reserve newSlug in slugMap (free up the old)
    slugMap.delete(row.slug);
    slugMap.set(newSlug, row.id);
    plan.push({ id: row.id, oldSlug: row.slug, newSlug });
  }
  console.log(`Plan ready. Collisions disambiguated with -id: ${collisions}`);
  console.log('Sample:');
  plan.slice(0, 5).forEach(p => console.log(`  ${p.oldSlug}\n  -> ${p.newSlug}`));

  // Apply row by row
  let done = 0, failed = 0;
  for (const p of plan) {
    try {
      await pool.query(
        `UPDATE installers SET slug_old = COALESCE(slug_old, slug), slug = $1 WHERE id = $2`,
        [p.newSlug, p.id]
      );
      done++;
      if (done % 100 === 0) console.log(`  ${done}/${plan.length} updated`);
    } catch (e) {
      failed++;
      console.error(`  FAIL id=${p.id} ${p.newSlug}: ${e.message.slice(0,120)}`);
    }
  }

  const after = await pool.query(`SELECT COUNT(*) FROM installers WHERE slug ~ '\\s'`);
  console.log(`\nDone. Updated: ${done}, Failed: ${failed}, Bad slugs remaining: ${after.rows[0].count}`);

  await pool.end();
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
