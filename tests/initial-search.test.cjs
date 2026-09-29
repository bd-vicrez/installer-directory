const test = require("node:test"),
  assert = require("node:assert/strict"),
  load = require("./load-module.cjs");
class InstallerSearchError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}
test("homepage tracking parameters do not start a nationwide query", async () => {
  let calls = 0;
  const { initialSearch } = load("lib/initial-search.ts", {
    "@/lib/installer-search": {
      InstallerSearchError,
      searchInstallers: async () => {
        calls++;
      },
    },
  });
  assert.equal(
    await initialSearch({
      utm_source: "google",
      analytics: "off",
      lat: "33",
      lng: "-117",
    }),
    undefined,
  );
  assert.equal(calls, 0);
});
test("saved search seeds validated public results and forwards only supported search fields", async () => {
  let requested;
  const results = {
    installers: [],
    total: 0,
    verified: 0,
    listed: 0,
    location: null,
    location_unconfirmed: 0,
  };
  const { initialSearch } = load("lib/initial-search.ts", {
    "@/lib/installer-search": {
      InstallerSearchError,
      searchInstallers: async (p) => {
        requested = p;
        return results;
      },
    },
  });
  const seed = await initialSearch({
    q: "92101",
    service: "body-kits",
    radius: "50",
    inquiry: "1",
    utm_source: "private",
    offset: "1000",
    lat: "33",
    lng: "-117",
  });
  assert.equal(seed.results, results);
  assert.equal(seed.error, "");
  assert.equal(seed.state.inquiry, "1");
  assert.equal(requested.get("q"), "92101");
  for (const key of ["utm_source", "offset", "lat", "lng"])
    assert.equal(requested.has(key), false);
});
test("bad saved filters avoid database work and backend failures expose only a safe error", async () => {
  let calls = 0;
  const { initialSearch } = load("lib/initial-search.ts", {
    "@/lib/installer-search": {
      InstallerSearchError,
      searchInstallers: async () => {
        calls++;
        throw Error("private database details");
      },
    },
  });
  const invalid = await initialSearch({ q: "92101", radius: "9999" });
  assert.equal(invalid.results, null);
  assert.ok(invalid.error);
  assert.equal(calls, 0);
  const failed = await initialSearch({ q: "92101" });
  assert.equal(calls, 1);
  assert.equal(failed.results, null);
  assert.ok(!failed.error.includes("private database"));
});
