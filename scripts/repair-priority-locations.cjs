// Explicit one-off, capped geocoding repair. Never scheduled or run by the web app.
// Usage: node scripts/repair-priority-locations.cjs plan|apply <private-output-dir>
const fs = require("node:fs");
const path = require("node:path");
const { Pool } = require("pg");
const load = require("../tests/load-module.cjs");
const { checkedAddressPoint } = load("lib/geocode-repair.ts");
const [mode, output] = process.argv.slice(2);
if (!["plan", "apply"].includes(mode) || !output)
  throw new Error("Specify plan|apply and a private output directory");
const dir = path.resolve(output),
  planFile = path.join(dir, "location-plan.json");
fs.mkdirSync(dir, { recursive: true });
const connection = new URL(process.env.DATABASE_URL);
connection.hostname = connection.hostname.replace("-pooler.", ".");
connection.searchParams.set("sslmode", "verify-full");
const db = new Pool({ connectionString: connection.toString(), max: 1 });
async function run() {
  try {
    if (mode === "plan") {
      if (fs.existsSync(planFile))
        throw new Error(
          "Existing plan retained; use a new output directory for a new budget",
        );
      const rows = (
        await db.query(`SELECT id,business_name,street_address,city,state,zip_code,lat,lng,location_evidence,updated_at FROM installers
        WHERE status='active' AND (lat IS NULL OR lng IS NULL) AND street_address ~ '^ *[0-9]'
        AND zip_code ~ '^[0-9]{5}(-[0-9]{4})?$' AND LEFT(zip_code,5)<>'00000'
        ORDER BY quote_routing_enabled DESC NULLS LAST,
          (source ILIKE '%application%' OR source ILIKE '%dealer%') DESC,
          (city IN ('San Diego','Los Angeles','Las Vegas','Miami','Houston','Dallas','Charlotte')) DESC,
          business_name,id LIMIT 100`)
      ).rows;
      const entries = [];
      for (const row of rows) {
        const query = new URLSearchParams({
          address: [
            row.street_address,
            row.city,
            row.state,
            row.zip_code,
            "USA",
          ].join(", "),
          key: process.env.GOOGLE_PLACES_API_KEY,
          components: "country:US",
        });
        let data;
        try {
          const response = await fetch(
            "https://maps.googleapis.com/maps/api/geocode/json?" + query,
            { signal: AbortSignal.timeout(15000) },
          );
          data = await response.json();
        } catch {
          data = { status: "LOOKUP_FAILED" };
        }
        entries.push({
          before: row,
          evidence: checkedAddressPoint(row, data),
          status: data.status,
        });
        fs.writeFileSync(
          planFile,
          JSON.stringify({ budget: 100, entries }, null, 2),
        );
        if (["REQUEST_DENIED", "OVER_QUERY_LIMIT"].includes(data.status)) break;
      }
      console.log(
        JSON.stringify({
          mode,
          budget: 100,
          attempted: entries.length,
          accepted: entries.filter((r) => r.evidence).length,
          held: entries.filter((r) => !r.evidence).length,
          statuses: entries.reduce(
            (a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a),
            {},
          ),
        }),
      );
    } else {
      const plan = JSON.parse(fs.readFileSync(planFile, "utf8"));
      if (plan.budget !== 100 || plan.entries.length > 100)
        throw new Error("Unexpected repair budget");
      await db.query("BEGIN");
      const applied = [];
      for (const entry of plan.entries.filter((r) => r.evidence)) {
        const row = entry.before,
          e = entry.evidence;
        const result = await db.query(
          `UPDATE installers SET lat=$2,lng=$3,location_evidence=$4,updated_at=NOW()
          WHERE id=$1 AND status='active' AND lat IS NOT DISTINCT FROM $5 AND lng IS NOT DISTINCT FROM $6
          AND street_address=$7 AND city=$8 AND state=$9 AND zip_code=$10 AND location_evidence IS NOT DISTINCT FROM $11::jsonb RETURNING id`,
          [
            row.id,
            e.lat,
            e.lng,
            JSON.stringify(e),
            row.lat,
            row.lng,
            row.street_address,
            row.city,
            row.state,
            row.zip_code,
            row.location_evidence
              ? JSON.stringify(row.location_evidence)
              : null,
          ],
        );
        if (!result.rowCount) continue;
        await db.query(
          `INSERT INTO directory_review_audit(kind,record_id,actor,action,note,before_data,after_data)
          VALUES('installer',$1,'September 28 location repair','geocode_repair','Address-level geocode agrees with existing street number, route, state and ZIP; 100-lookup release budget.',$2,$3)`,
          [
            row.id,
            JSON.stringify(row),
            JSON.stringify({ lat: e.lat, lng: e.lng, location_evidence: e }),
          ],
        );
        applied.push(row.id);
      }
      await db.query("COMMIT");
      const remaining = (
        await db.query(
          "SELECT COUNT(*)::int AS active,COUNT(*) FILTER(WHERE lat IS NULL OR lng IS NULL)::int AS missing_coordinates FROM installers WHERE status='active'",
        )
      ).rows[0];
      const result = {
        mode,
        applied: applied.length,
        skipped_changed:
          plan.entries.filter((r) => r.evidence).length - applied.length,
        remaining,
        applied_ids: applied,
      };
      fs.writeFileSync(
        path.join(dir, "location-applied.json"),
        JSON.stringify(result, null, 2),
      );
      console.log(JSON.stringify(result));
    }
  } catch (e) {
    await db.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    await db.end();
  }
}
run().catch((e) => {
  console.error(e.message.replace(/postgres(?:ql)?:\/\/[^\s]+/g, "[database]"));
  process.exitCode = 1;
});
