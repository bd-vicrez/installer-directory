const test = require("node:test");
const assert = require("node:assert/strict");
const load = require("./load-module.cjs");
const { locationRedirect, canonicalLocation } = load(
  "lib/location-canonical.ts",
);
const { STATE_NAMES, toStateSlug } = load("lib/locations.ts");
const { profileIndexing, reviewedProfile } = load("lib/profile-indexing.ts");
const reviews = require("../src/lib/profile-reviews.json");
const legacy = require("../src/lib/legacy-indexable.json");
const fixture = (slug) => {
  const r = reviews[slug];
  return {
    id: r.id,
    slug,
    business_name: r.name,
    city: r.city,
    state: r.state,
    status: "active",
    source: "public listing",
    install_capabilities: r.expectedCapabilities,
    specialize_in: r.expectedSpecialty,
  };
};

test("all supported state aliases converge and preferred URLs do not loop", () => {
  for (const [abbr, name] of Object.entries(STATE_NAMES)) {
    const preferred = toStateSlug(abbr);
    for (const alias of [
      abbr,
      abbr.toLowerCase(),
      name.toUpperCase().replaceAll(" ", "-"),
    ])
      assert.equal(canonicalLocation(alias), preferred);
    assert.equal(locationRedirect("/installers/" + preferred, ""), null);
  }
});
test("city aliases and category variants preserve pagination and tracking", () => {
  for (const [alias, preferred] of [
    ["houston-texas", "houston-tx"],
    ["new-york-new-york", "new-york-ny"],
    ["port-st-lucie-florida", "port-st.-lucie-fl"],
  ]) {
    for (const suffix of ["", "/body-kits"]) {
      const target = locationRedirect(
        "/installers/" + alias + suffix,
        "?page=2&utm_source=quote&tag=a&tag=b",
      );
      const url = new URL(target, "https://example.test");
      assert.equal(url.pathname, "/installers/" + preferred + suffix);
      assert.equal(url.searchParams.get("page"), "2");
      assert.equal(url.searchParams.get("utm_source"), "quote");
      assert.deepEqual(url.searchParams.getAll("tag"), ["a", "b"]);
      assert.equal(locationRedirect(url.pathname, url.search), null);
    }
  }
});
test("invalid and redundant page queries collapse without redirecting unrelated routes", () => {
  for (const page of ["1", "0", "-2", "2junk", "0002", "999999"])
    assert.equal(
      locationRedirect("/installers/ca", "?page=" + page),
      "/installers/california",
    );
  assert.equal(
    locationRedirect("/installers/california", "?page=2&page=3"),
    "/installers/california?page=2",
  );
  for (const path of [
    "/installers/category/body-kits",
    "/api/installers",
    "/installers/not-a-place",
    "/installers/ca/body-kits/extra",
  ])
    assert.equal(locationRedirect(path, ""), null);
});
test("reviewed content can qualify independently of source and fails closed after a record changes", () => {
  const shop = fixture("kustom-kreations-inc-fitchburg-ma");
  assert.equal(profileIndexing(shop).index, true);
  assert.ok(reviewedProfile(shop));
  for (const change of [
    { id: "other" },
    { business_name: "Different shop" },
    { city: "Other" },
    { install_capabilities: ["Wheel work"] },
    { status: "removed" },
    { status: "non_us_excluded" },
  ]) {
    assert.equal(profileIndexing({ ...shop, ...change }).index, false);
    assert.equal(reviewedProfile({ ...shop, ...change }), null);
  }
});
test("new manual/dealer records are not automatically admitted; unchanged legacy cohort remains stable", () => {
  for (const source of ["manual", "[New Dealer Form]", "Google Maps Directory"])
    assert.equal(
      profileIndexing({ slug: "new-unreviewed", source, status: "active" })
        .index,
      false,
    );
  const slug = legacy.find((s) => !reviews[s]);
  assert.equal(
    profileIndexing({ slug, source: "[New Dealer Form]", status: "active" })
      .basis,
    "legacy-pending-review",
  );
  assert.equal(
    profileIndexing({ slug, source: "Google Maps Directory", status: "active" })
      .index,
    false,
  );
});
test("all fourteen reviewed briefs match the expected evidence identity and supply no fictional project data", () => {
  assert.equal(Object.keys(reviews).length, 14);
  for (const slug of Object.keys(reviews)) {
    assert.equal(profileIndexing(fixture(slug)).index, true);
    const review = reviewedProfile(fixture(slug));
    assert.ok(
      review.summary && review.questions.length === 3 && review.sourceLabel,
    );
    assert.equal(review.projects, undefined);
    assert.equal(review.photos, undefined);
  }
});
test("out-of-range locations avoid row queries and invalid categories never query", async () => {
  const calls = [];
  const db = {
    query: async (sql, values) => {
      calls.push({ sql, values });
      return { rows: [{ location_total: 10, total: 10, recorded: 2 }] };
    },
  };
  const { locationPage } = load("lib/location-query.ts", {
    "@/lib/db": { getPool: () => db },
    react: { cache: (f) => f },
  });
  assert.equal(await locationPage("california", 1, "constructor"), null);
  assert.equal(calls.length, 0);
  const result = await locationPage("california", 99);
  assert.equal(result.pages, 1);
  assert.equal(result.rows.length, 0);
  assert.equal(calls.length, 1);
});
