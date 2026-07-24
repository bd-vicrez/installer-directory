// Bulk SEO content generator — expands city_seo from 50 → 500.
// Idempotent (UPSERT). Skips cities that already have content.
// Run: node scripts/generate_city_seo_500.js
const { Pool } = require('pg');
const https = require('https');

const DB_URL = 'postgresql://neondb_owner:npg_fXU85StGJWLd@ep-rough-tree-aihi1xgt-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';
const GEMINI_KEY = process.env.GEMINI_API_KEY || 'AIzaSyAO0p7t_HfL-zigFhogrvO7V7lOIIlkbac';
const MODEL = 'gemini-2.5-flash-lite';
const TARGET_CITY_COUNT = 500;
const REQUEST_DELAY_MS = 600; // ~1.5/sec, polite

function callGemini(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 1500, responseMimeType: 'application/json' },
    });
    const req = https.request({
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 30000,
    }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) return reject(new Error('No text: ' + JSON.stringify(parsed).slice(0, 200)));
          resolve(JSON.parse(text));
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(body);
    req.end();
  });
}

function buildPrompt(city, state, count, verifiedCount) {
  return `You are writing SEO content for a directory of automotive aftermarket installers serving ${city}, ${state}. There are ${count} shops in the network (${verifiedCount} verified Vicrez dealers).

Vicrez sells body kits, OE replacement bumpers, widebody kits, front lips, side skirts, rear diffusers, spoilers, fender flares, aftermarket wheels, VCORSA tires, vinyl wrap, paint protection film (PPF), and window tint.

Write 4 short SEO content blocks for the ${city}, ${state} installer directory page. Each block should be unique to ${city} — reference local car culture, common vehicles, weather/road conditions that affect aftermarket choices, or specific neighborhoods if relevant. Keep tone helpful and authoritative, NOT salesy. No "we" or "us" — write in third person.

Return ONLY valid JSON with this exact schema:
{
  "intro": "200-250 word intro paragraph that mentions ${city} by name 2-3 times, references local car scene, names 2-3 specific things drivers in ${city} care about (e.g. weather, popular trucks/cars, road conditions). End with what services local installers can help with.",
  "local_scene": "100-130 words about the ${city} aftermarket/car enthusiast scene specifically — meets, car culture, popular builds. Reference specific cars, makes, or scenes known to be popular there.",
  "what_to_ask": "100-130 words: a numbered list (as one paragraph using semicolons or numbered text) of 3-5 specific questions a customer in ${city} should ask an installer before booking work. Practical and concrete.",
  "cost_context": "80-120 words on cost ranges specific to ${city}'s metro labor rates compared to national averages. Don't quote exact prices — use ranges like '$200-$800' style. Mention that prices vary based on shop tier and vehicle complexity."
}

CRITICAL: Do NOT mention any specific shop names. Do NOT include any URLs. Do NOT use the words "Vicrez Installer Network" — refer to it as "the installer directory" or "local shops". Make every sentence unique to ${city}.`;
}

(async () => {
  const pool = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

  // Pull top N cities by installer count
  const { rows: topCities } = await pool.query(`
    SELECT city, state, COUNT(*) as count,
           COUNT(*) FILTER (WHERE source ILIKE '%verified%' OR source ILIKE '%dealer%') as verified_count
    FROM installers
    WHERE status NOT IN ('removed', 'non_us_excluded')
      AND city IS NOT NULL AND city != ''
    GROUP BY city, state
    ORDER BY count DESC
    LIMIT $1
  `, [TARGET_CITY_COUNT]);

  // Check which ones are already done
  const { rows: existing } = await pool.query(`SELECT city, state FROM city_seo`);
  const existingSet = new Set(existing.map(r => `${r.city}|${r.state}`));

  const todo = topCities.filter(c => !existingSet.has(`${c.city}|${c.state}`));
  console.log(`Target: ${TARGET_CITY_COUNT} cities | Already done: ${existing.length} | To generate: ${todo.length}`);
  console.log(`ETA: ~${Math.ceil((todo.length * REQUEST_DELAY_MS) / 1000 / 60)} min at ${REQUEST_DELAY_MS}ms delay`);

  let done = 0;
  let failed = 0;
  let consecutiveFailures = 0;

  for (const c of todo) {
    try {
      const content = await callGemini(buildPrompt(c.city, c.state, c.count, c.verified_count));
      await pool.query(
        `INSERT INTO city_seo (city, state, intro, local_scene, what_to_ask, cost_context, model)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (city, state) DO UPDATE SET
           intro = EXCLUDED.intro,
           local_scene = EXCLUDED.local_scene,
           what_to_ask = EXCLUDED.what_to_ask,
           cost_context = EXCLUDED.cost_context,
           generated_at = NOW(),
           model = EXCLUDED.model`,
        [c.city, c.state, content.intro, content.local_scene, content.what_to_ask, content.cost_context, MODEL]
      );
      done++;
      consecutiveFailures = 0;
      if (done % 25 === 0 || done <= 5) {
        console.log(`[${done}/${todo.length}] OK ${c.city}, ${c.state}`);
      }
    } catch (e) {
      failed++;
      consecutiveFailures++;
      console.error(`  FAIL ${c.city}, ${c.state}: ${String(e.message || e).slice(0, 150)}`);
      if (consecutiveFailures >= 10) {
        console.error('10 consecutive failures — aborting. Re-run to resume.');
        break;
      }
      // back off on failure
      await new Promise(r => setTimeout(r, 3000));
    }
    await new Promise(r => setTimeout(r, REQUEST_DELAY_MS));
  }

  const { rows: finalCount } = await pool.query(`SELECT COUNT(*) as n FROM city_seo`);
  console.log(`\nDone. Generated this run: ${done}, Failed: ${failed}, Total in city_seo: ${finalCount[0].n}`);
  await pool.end();
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
