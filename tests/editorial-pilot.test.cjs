const test = require("node:test");
const assert = require("node:assert/strict");
const load = require("./load-module.cjs");
const reviews = require("../src/lib/profile-reviews.json");
const { PILOT_PATHS, PILOT_PROFILES, pilotProfile, supportedPilotCities } = load("lib/editorial-pilot.ts");
function fixture(slug) {
  const r = reviews[slug];
  return { id: r.id, slug, business_name: r.name, city: r.city, state: r.state,
    status: "active", install_capabilities: r.expectedCapabilities, specialize_in: r.expectedSpecialty };
}

test("pilot promotion and local advice disappear when their supporting business changes", () => {
  const shop = fixture("kustom-kreations-inc-fitchburg-ma");
  assert.ok(pilotProfile(shop));
  assert.equal(supportedPilotCities([shop])[0][0], "fitchburg-ma");
  for (const change of [{ id: "replacement" }, { status: "removed" }, { status: "non_us_excluded" },
    { city: "Boston" }, { state: "CA" }, { business_name: "New owner business" },
    { install_capabilities: ["Vinyl Wrap"] }, { specialize_in: "Changed" }]) {
    const changed = { ...shop, ...change };
    assert.equal(pilotProfile(changed), null);
    assert.equal(supportedPilotCities([changed]).length, 0);
  }
  assert.equal(pilotProfile({ ...shop, slug: "constructor" }), null);
  assert.equal(supportedPilotCities([]).length, 0);
});

test("homepage query is bounded and applies the same evidence guard as profiles", async () => {
  const rows = Object.keys(PILOT_PROFILES).map(fixture);
  rows[0].business_name = "Replacement business";
  rows[1].status = "removed";
  let calls = 0;
  const { queryReviewedProfiles } = load("lib/db.ts", {
    "@/lib/db-pool": { getPool: () => ({ query: async (sql, values) => {
      calls++;
      assert.match(sql, /slug = ANY\(\$1::text\[\]\)/);
      assert.match(sql, /LIMIT 5/);
      assert.equal(values[0].length, 5);
      return { rows };
    } }) },
    react: { cache: (f) => f },
  });
  const result = await queryReviewedProfiles();
  assert.equal(calls, 1);
  assert.equal(result.length, 3);
  assert.ok(result.every(pilotProfile));
});

test("measurement cohort contains ten distinct canonical pages without tracking or withdrawn listings", () => {
  assert.equal(PILOT_PATHS.length, 10);
  assert.equal(new Set(PILOT_PATHS).size, 10);
  assert.equal(PILOT_PATHS.filter(p => p.startsWith('/installer/')).length, 5);
  for (const path of PILOT_PATHS) {
    assert.ok(!/[?#]/.test(path));
    assert.ok(!path.includes('premier-auto-solutions'));
  }
});
