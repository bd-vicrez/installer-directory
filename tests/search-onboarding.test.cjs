const test = require("node:test");
const assert = require("node:assert/strict");
const load = require("./load-module.cjs");
const { publicZip, usableShopLocation } = load("lib/location-quality.ts");
const row = {
  lat: 32,
  lng: -117,
  street_address: "123 Main St",
  zip_code: "92101",
};
test("unknown or approximate shop locations do not claim distance or a destination", () => {
  assert.equal(usableShopLocation(row), true);
  for (const patch of [
    { lat: null },
    { lng: 999 },
    { zip_code: "00000" },
    { street_address: "" },
    { street_address: "PO Box 123" },
    { street_address: "Mobile service 123" },
  ])
    assert.equal(usableShopLocation({ ...row, ...patch }), false);
  assert.equal(publicZip("00000"), "");
  assert.equal(publicZip("01234-5678"), "01234-5678");
  const { toPublicInstaller } = load("lib/public-installers.ts");
  const p = toPublicInstaller({
    ...row,
    zip_code: "00000",
    distance: 0.1,
    routing_email: "private@shop.test",
  });
  assert.equal(p.distance, null);
  assert.equal(p.lat, null);
  assert.equal(p.zip_code, "");
  assert.equal("routing_email" in p, false);
});
test("projection exposes reviewed parts policy but never unreviewed claims", () => {
  const { toPublicInstaller } = load("lib/public-installers.ts");
  const d = {
    ...row,
    owner_details: {
      parts_policy: "accepts-customer-parts",
      private_note: "hidden",
    },
  };
  assert.equal(toPublicInstaller(d).parts_policy, "Parts policy not confirmed");
  assert.match(
    toPublicInstaller({ ...d, owner_details_confirmed_at: new Date() })
      .parts_policy,
    /Accepts/,
  );
  assert.equal("owner_details" in toPublicInstaller(d), false);
});
test("applicant updates reject privileged fields, placeholders and invalid contact data", () => {
  const { applicantChanges } = load("lib/onboarding-updates.ts");
  const base = {
    note: "Here is the current business information.",
    changes: {},
  };
  for (const changes of [
    { status: "approved" },
    { email: "attacker@test.test" },
    { inquiry_consent: true },
    { zip_code: "00000" },
    { state: "ZZ" },
    { phone: "1234" },
    { website: "javascript:alert(1)" },
    { install_capabilities: ["bogus"] },
  ])
    assert.throws(() => applicantChanges({ ...base, changes }, "application"));
  const good = applicantChanges(
    {
      ...base,
      changes: {
        website: "https://shop.test",
        state: "ca",
        zip_code: "92101",
        install_capabilities: ["vinyl-wrap"],
      },
    },
    "application",
  );
  assert.equal(good.changes.state, "CA");
});
test("request revision detects reviewer decisions and changed applicant details", () => {
  const { requestRevision } = load("lib/onboarding-updates.ts");
  const a = {
    status: "needs_information",
    details: {},
    street_address: "123 A St",
  };
  assert.notEqual(
    requestRevision(a),
    requestRevision({ ...a, status: "approved" }),
  );
  assert.notEqual(
    requestRevision(a),
    requestRevision({ ...a, details: { applicant_update: { note: "new" } } }),
  );
});
test("quote steps validate project, contact and sharing independently", () => {
  const { quoteStepError } = load("lib/quote-steps.ts");
  const fields = {
    vehicle_year: "2024",
    vehicle_make: "Dodge",
    vehicle_model: "Charger",
    service: "body-kits",
    what_needed: "Rear diffuser",
    zip_code: "92101",
    customer_name: "Example Owner",
    customer_email: "owner@shop.test",
    customer_phone: "6195551234",
    sharing_consent: true,
  };
  for (const step of [0, 1, 2])
    assert.equal(quoteStepError(fields, step, false), "");
  assert.match(
    quoteStepError({ ...fields, vehicle_year: "abcd" }, 0, true),
    /year/,
  );
  assert.match(
    quoteStepError({ ...fields, zip_code: "00000" }, 0, false),
    /ZIP/,
  );
  assert.match(
    quoteStepError({ ...fields, customer_email: "bad" }, 1, true),
    /email/,
  );
  assert.match(
    quoteStepError({ ...fields, sharing_consent: false }, 2, true),
    /permission/,
  );
});
test("geocode repair rejects partial, centroid, wrong-number and wrong-road matches", () => {
  const { checkedAddressPoint } = load("lib/geocode-repair.ts");
  const input = {
    street_address: "123 Main St",
    state: "CA",
    zip_code: "92101",
  };
  const result = {
    geometry: { location_type: "ROOFTOP", location: { lat: 32, lng: -117 } },
    address_components: [
      ["country", "US"],
      ["administrative_area_level_1", "CA"],
      ["postal_code", "92101"],
      ["street_number", "123"],
      ["route", "Main St"],
    ].map(([type, short_name]) => ({ types: [type], short_name })),
  };
  const wrap = (x) => ({ status: "OK", results: [x] });
  assert.ok(checkedAddressPoint(input, wrap(result)));
  assert.equal(
    checkedAddressPoint(input, wrap({ ...result, partial_match: true })),
    null,
  );
  assert.equal(
    checkedAddressPoint(
      input,
      wrap({
        ...result,
        geometry: { ...result.geometry, location_type: "APPROXIMATE" },
      }),
    ),
    null,
  );
  assert.equal(
    checkedAddressPoint(
      { ...input, street_address: "456 Main St" },
      wrap(result),
    ),
    null,
  );
  assert.equal(
    checkedAddressPoint(
      { ...input, street_address: "123 Another St" },
      wrap(result),
    ),
    null,
  );
});
