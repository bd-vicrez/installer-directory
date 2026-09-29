const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { readFileSync } = require("node:fs");
const { Client } = require("pg");
const load = require("./load-module.cjs");
(async () => {
  const url = new URL(process.env.DIRECTORY_TEST_DATABASE_URL);
  url.searchParams.set("sslmode", "verify-full");
  const db = new Client({
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: true },
  });
  await db.connect();
  try {
    await db.query("BEGIN");
    await db.query(
      "CREATE TEMP TABLE directory_discovery_events (LIKE public.directory_discovery_events INCLUDING ALL) ON COMMIT DROP",
    );
    await db.query(
      "CREATE TEMP TABLE directory_schema_migrations (id text PRIMARY KEY) ON COMMIT DROP",
    );
    await db.query("SET LOCAL search_path=pg_temp,public");
    const migration = readFileSync(
      "migrations/20260929_mobile_measurement.sql",
      "utf8",
    ).replace(/\b(BEGIN|COMMIT);/g, "");
    await db.query(migration);
    await db.query(migration);
    const mocks = { "@/lib/db": { getPool: () => db } };
    const { storeDiscoveryEvent } = load("lib/discovery-store.ts", mocks);
    const { discoveryInput } = load("lib/discovery.ts");
    const session = randomUUID();
    async function add(event, journey = randomUUID(), extra = {}) {
      const data = discoveryInput(
        {
          id: randomUUID(),
          session_id: session,
          event,
          journey_id: journey,
          page: "home",
          device_category: "mobile",
          ...extra,
        },
        true,
      );
      await storeDiscoveryEvent(data);
      return data;
    }
    for (const n of [1000, 2000, 3000, 4000])
      await add("web_vital", null, {
        metric: "LCP",
        metric_value: n,
        metric_sequence: 1,
      });
    const metric = await add("web_vital", null, {
      metric: "INP",
      metric_value: 500,
      metric_sequence: 1,
    });
    await storeDiscoveryEvent({
      ...metric,
      metric_value: 200,
      metric_sequence: 3,
    });
    await storeDiscoveryEvent({
      ...metric,
      metric_value: 900,
      metric_sequence: 2,
    });
    const search = randomUUID();
    await add("search_start", search);
    await add("search_results", search, { duration_ms: 700 });
    await add("phone_click", null);
    const failed = randomUUID();
    await add("search_start", failed);
    await add("search_error", failed);
    const cancel = randomUUID();
    await add("search_start", cancel);
    await add("search_cancel", cancel);
    const missing = randomUUID();
    await add("search_start", missing);
    const stopped = [];
    for (const stage of ["project", "contact", "review"]) {
      const j = randomUUID();
      stopped.push(j);
      await add("quote_open", j);
      await add("quote_step", j, { step: stage });
    }
    const saved = randomUUID();
    await add("quote_open", saved);
    await add("quote_input", saved);
    await add("quote_step", saved, { step: "contact" });
    await add("quote_step", saved, { step: "review" });
    await add("quote_attempt", saved);
    const receipt = await add("quote_saved", saved, { id: saved });
    await storeDiscoveryEvent(receipt);
    const active = randomUUID();
    await add("quote_open", active);
    // A save without an open must not inflate the opened-journey funnel.
    await add("quote_saved");
    const app = randomUUID();
    await add("application_start", app);
    await add("application_complete", app);
    await db.query(
      "UPDATE directory_discovery_events SET created_at=NOW()-INTERVAL '1 hour' WHERE journey_id=ANY($1::uuid[])",
      [[...stopped, missing]],
    );
    const { experienceReport } = load("lib/experience-report.ts", mocks);
    const report = await experienceReport();
    const lcp = report.vitals.find((r) => r.metric === "LCP"),
      inp = report.vitals.find((r) => r.metric === "INP");
    assert.equal(lcp.samples, 4);
    assert.equal(lcp.p75, 3250);
    assert.equal(inp.samples, 1);
    assert.equal(inp.p75, 200);
    assert.equal(report.search[0].started, 4);
    assert.equal(report.search[0].results, 1);
    assert.equal(report.search[0].errors, 1);
    assert.equal(report.search[0].cancelled, 1);
    assert.equal(report.search[0].no_result_recorded, 1);
    assert.equal(report.contacts[0].search_sessions, 1);
    assert.equal(report.contacts[0].contact_sessions, 1);
    const q = report.quotes[0];
    assert.equal(q.opened, 5);
    assert.equal(q.saved, 1);
    assert.equal(q.stopped_project, 1);
    assert.equal(q.stopped_contact, 1);
    assert.equal(q.stopped_review, 1);
    assert.equal(q.recent_unfinished, 1);
    assert.equal(
      report.forms.find((r) => r.event === "application_start").journeys,
      1,
    );
    assert.equal(
      report.forms.find((r) => r.event === "application_complete").journeys,
      1,
    );
    console.log(
      "PASS: migration repeatability, bounded storage, metric ordering, p75, search outcomes, contact progression, quote stages, receipt deduplication and separate application counts. All fixtures used temporary tables.",
    );
  } finally {
    await db.query("ROLLBACK");
    await db.end();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
