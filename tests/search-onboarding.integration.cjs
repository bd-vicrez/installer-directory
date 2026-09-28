// Runs only when explicitly supplied a test database connection. All test writes
// are confined to a disposable schema with no production triggers or mail worker.
const assert = require("node:assert/strict");
const { Pool } = require("pg");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const load = require("./load-module.cjs");
const { NextRequest } = require("next/server");
if (!process.env.DIRECTORY_TEST_DATABASE_URL)
  throw new Error("Explicit test database required");
const schema = "qa_search_onboarding_" + randomUUID().replaceAll("-", "");
const connection = new URL(process.env.DIRECTORY_TEST_DATABASE_URL);
connection.hostname = connection.hostname.replace("-pooler.", ".");
connection.searchParams.set("sslmode", "verify-full");
const admin = new Pool({ connectionString: connection.toString(), max: 1 });
const pool = new Pool({
  connectionString: connection.toString(),
  max: 3,
  options: "-c search_path=" + schema,
});
process.env.DIRECTORY_RFQ_SECRET = "test-only-secret-".repeat(4);
const { statusToken } = load("lib/onboarding.ts");
let checks = 0;
const req = (body) =>
  new Request("https://example.test/api/onboarding-update", {
    method: "POST",
    headers: {
      Origin: "https://example.test",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
async function run() {
  try {
    await admin.query(`CREATE SCHEMA ${schema}`);
    for (const table of ["applications", "directory_claims", "installers"])
      await admin.query(
        `CREATE TABLE ${schema}.${table} (LIKE public.${table} INCLUDING DEFAULTS)`,
      );
    await pool.query(
      "CREATE TABLE directory_review_audit(kind text,record_id text,actor text,action text,note text,before_data jsonb,after_data jsonb); CREATE TABLE directory_schema_migrations(id text PRIMARY KEY)",
    );
    const migration = fs.readFileSync(
      path.resolve(__dirname, "../migrations/20260928_onboarding_updates.sql"),
      "utf8",
    );
    await pool.query(migration);
    await pool.query(migration);
    checks++;
    const mock = {
      "@/lib/db": { getPool: () => pool },
      "@/lib/directory-rfq": {
        UUID: /^[0-9a-f-]{36}$/i,
        sameOrigin: (r) => r.headers.get("origin") === "https://example.test",
        withinRateLimit: async () => true,
        rfqConfig: () => ({ secret: process.env.DIRECTORY_RFQ_SECRET }),
      },
    };
    const status = load("app/api/onboarding-status/route.ts", mock).POST;
    const update = load("app/api/onboarding-update/route.ts", mock).POST;
    const a = randomUUID(),
      b = randomUUID(),
      created = new Date();
    for (const id of [a, b])
      await pool.query(
        "INSERT INTO applications(id,application_id,business_name,street_address,city,state,zip_code,phone,email,website,install_capabilities,status,details,submitted_at,location_evidence,location_confirmed_at) VALUES($1,$2,'QA Only','123 Main St','San Diego','CA','92101','6195551234','private@qa.test','https://qa.test',ARRAY['vinyl-wrap'],'needs_information','{}',$3,'{}',NOW())",
        [id, "QA-" + id, created],
      );
    const token = statusToken("application", a, created),
      tokenB = statusToken("application", b, created);
    const read = async (t = token) => {
      const r = await status(req({ token: t }));
      assert.equal(r.status, 200);
      return r.json();
    };
    const start = await read();
    assert.equal(start.can_update, true);
    assert.equal("email" in start.business, false);
    checks++;
    const body = {
      token,
      request_id: randomUUID(),
      revision: start.revision,
      note: "My current business address is shown at this official page.",
      evidence_url: "https://qa.test/contact",
      changes: {
        street_address: "125 Main St",
        website: "https://qa.test/new",
      },
      agreement: true,
    };
    let r = await update(req({ ...body, token: token + "bad" }));
    assert.equal(r.status, 403);
    checks++;
    r = await update(
      new Request("https://example.test/api/onboarding-update", {
        method: "POST",
        headers: { Origin: "https://evil.test" },
        body: JSON.stringify(body),
      }),
    );
    assert.equal(r.status, 403);
    checks++;
    r = await update(req({ ...body, changes: { status: "approved" } }));
    assert.equal(r.status, 400);
    checks++;
    r = await update(req(body));
    assert.equal(r.status, 200);
    checks++;
    let saved = (
      await pool.query("SELECT * FROM applications WHERE id=$1", [a])
    ).rows[0];
    assert.equal(saved.status, "needs_information");
    assert.equal(saved.street_address, "125 Main St");
    assert.equal(saved.location_evidence, null);
    assert.equal(saved.location_confirmed_at, null);
    assert.equal(saved.email, "private@qa.test");
    assert.equal(saved.details.website, "https://qa.test/new");
    checks++;
    r = await update(req(body));
    assert.equal(r.status, 200);
    assert.equal(
      (
        await pool.query(
          "SELECT count(*)::int n FROM directory_onboarding_updates",
        )
      ).rows[0].n,
      1,
    );
    checks++;
    r = await update(req({ ...body, note: "Changed after the first save" }));
    assert.equal(r.status, 409);
    checks++;
    r = await update(req({ ...body, token: tokenB }));
    assert.equal(r.status, 409);
    checks++;
    r = await update(req({ ...body, request_id: randomUUID() }));
    assert.equal(r.status, 409);
    checks++;
    const current = await read();
    assert.notEqual(current.revision, start.revision);
    assert.ok(current.last_update);
    checks++;
    const concurrent = {
      ...body,
      revision: current.revision,
      request_id: randomUUID(),
      note: "One final clarification for the review team.",
    };
    const pair = await Promise.all([
      update(req(concurrent)),
      update(req({ ...concurrent, request_id: randomUUID() })),
    ]);
    assert.deepEqual(pair.map((x) => x.status).sort(), [200, 409]);
    checks++;
    await pool.query("UPDATE applications SET status='approved' WHERE id=$1", [
      a,
    ]);
    r = await update(
      req({
        ...body,
        revision: (await read()).revision,
        request_id: randomUUID(),
      }),
    );
    assert.equal(r.status, 409);
    checks++;
    const claimId = randomUUID();
    await pool.query(
      "INSERT INTO directory_claims(id,request_id,payload_hash,installer_id,name,email,relationship,correction,consent_version,status,submitted_at) VALUES($1,$1,'qa','qa-shop','QA Owner','private@qa.test','Owner','Please review my shop','qa','needs_information',$2)",
      [claimId, created],
    );
    const claimToken = statusToken("claim", claimId, created);
    const claimStatus = await read(claimToken);
    assert.equal(claimStatus.kind, "claim");
    assert.equal(claimStatus.business, null);
    r = await update(
      req({
        token: claimToken,
        request_id: randomUUID(),
        revision: claimStatus.revision,
        note: "Here is supporting information for my ownership review.",
        evidence_url: "https://qa.test/team",
        agreement: true,
      }),
    );
    assert.equal(r.status, 200);
    const claim = (
      await pool.query(
        "SELECT status,email,details FROM directory_claims WHERE id=$1",
        [claimId],
      )
    ).rows[0];
    assert.equal(claim.status, "needs_information");
    assert.equal(claim.email, "private@qa.test");
    assert.equal(
      claim.details.applicant_update.evidence_url,
      "https://qa.test/team",
    );
    checks++;
    // Search fixtures isolate city fallback, inquiry preference and radius behavior.
    const columns =
      "id,legacy_id,business_name,slug,city,state,zip_code,street_address,lat,lng,status,source,quote_routing_enabled,routing_email,phone,email,website,install_capabilities,shop_type,specialize_in,date_added,internal_notes,updated_at";
    for (const [id, name, lat, lng, available, street, zip, city] of [
      ["near", "Near", 32.7, -117.1, false, "10 Main St", "92101", "San Diego"],
      [
        "contact",
        "Contact",
        32.71,
        -117.1,
        true,
        "20 Main St",
        "92101",
        "San Diego",
      ],
      [
        "far",
        "Far dealer",
        33.15,
        -117.1,
        false,
        "30 Main St",
        "92101",
        "San Diego",
      ],
      [
        "unknown",
        "Unknown",
        null,
        null,
        false,
        "40 Main St",
        "92101",
        "San Diego",
      ],
      ["centroid", "City only", 32.7, -117.1, false, "", "00000", "San Diego"],
      [
        "other-city",
        "Another city",
        null,
        null,
        false,
        "50 Main St",
        "90001",
        "Los Angeles",
      ],
    ])
      await pool.query(
        `INSERT INTO installers(${columns}) VALUES($1,$1,$2,$1,$3,'CA',$4,$5,$6,$7,'active',$8,$9,$10,'6195551234','','',ARRAY['vinyl-wrap'],'','','','',NOW())`,
        [
          id,
          name,
          city,
          zip,
          street,
          lat,
          lng,
          id === "far" ? "[New Dealer Form]" : "Google Maps Directory",
          available,
          available ? "shop@qa.test" : null,
        ],
      );
    const { GET } = load("app/api/installers/route.ts", {
      "@/lib/db": { getPool: () => pool },
      "@/lib/geocode": {
        geocodeLocation: async () => ({
          lat: 32.7,
          lng: -117.1,
          label: "San Diego, CA",
          city: "San Diego",
          state: "CA",
          zip: "",
        }),
      },
    });
    let data = await (
      await GET(
        new NextRequest(
          "https://example.test/api/installers?q=San+Diego%2C+CA&radius=50",
        ),
      )
    ).json();
    assert.equal(data.total, 5);
    assert.equal(data.location_unconfirmed, 2);
    assert.equal(data.installers[0].id, "contact");
    assert.deepEqual(
      data.installers
        .slice(-2)
        .map((x) => x.id)
        .sort(),
      ["centroid", "unknown"],
    );
    assert.equal(data.installers.find((x) => x.id === "centroid").lat, null);
    checks++;
    data = await (
      await GET(
        new NextRequest(
          "https://example.test/api/installers?q=San+Diego%2C+CA&radius=10&sort=nearest",
        ),
      )
    ).json();
    assert.equal(data.total, 4);
    assert.equal(data.installers[0].id, "near");
    checks++;
    data = await (
      await GET(
        new NextRequest(
          "https://example.test/api/installers?q=San+Diego%2C+CA&inquiry=1",
        ),
      )
    ).json();
    assert.deepEqual(
      data.installers.map((x) => x.id),
      ["contact"],
    );
    checks++;
    data = await (
      await GET(
        new NextRequest(
          "https://example.test/api/installers?lat=32.70&lng=-117.1&radius=10",
        ),
      )
    ).json();
    assert.equal(data.total, 2);
    checks++;
    const lookup = load("app/api/shop-lookup/route.ts", mock).GET;
    data = await (
      await lookup(
        new NextRequest(
          "https://example.test/api/shop-lookup?name=City&location=San+Diego%2C+CA",
        ),
      )
    ).json();
    assert.equal(data.shops.length, 1);
    assert.equal(data.shops[0].zip_code, "");
    assert.equal("routing_email" in data.shops[0], false);
    checks++;
    console.log(
      JSON.stringify({
        ok: true,
        integration_checks: checks,
        schema_isolated: true,
      }),
    );
  } finally {
    await pool.end();
    await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await admin.end();
  }
}
run().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
