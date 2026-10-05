const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const load = require("./load-module.cjs");

test("Lightpanda is excluded before collector storage, while normal browsers remain eligible", async () => {
  const { automatedMeasurementAgent } = load("lib/measurement-privacy.ts");
  for (const ua of [
    "Lightpanda/1.0",
    "lightpanda/2.1",
    "Mozilla/5.0 Lightpanda/1.0",
  ])
    assert.equal(automatedMeasurementAgent(ua), true);
  for (const ua of [
    "Mozilla/5.0 Chrome/147.0.0.0 Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
  ])
    assert.equal(automatedMeasurementAgent(ua), false);
  let calls = 0;
  const route = load("app/api/discovery-events/route.ts", {
    "@/lib/directory-rfq": {
      sameOrigin: () => true,
      withinRateLimit: () => {
        calls++;
        throw Error();
      },
    },
    "@/lib/discovery-store": {
      storeDiscoveryEvent: () => {
        calls++;
      },
    },
  });
  const r = await route.POST(
    new Request("https://installers.vicrez.com/api/discovery-events", {
      method: "POST",
      headers: { "user-agent": "Lightpanda/1.0" },
      body: "not even parsed",
    }),
  );
  assert.equal(r.status, 204);
  assert.equal(calls, 0);
});

test("localhost referral opt-out persists after navigation without excluding lookalike public domains", () => {
  const { localMeasurementReferrer } = load("lib/measurement-privacy.ts");
  for (const r of [
    "http://localhost:3130/",
    "http://preview.localhost/",
    "http://127.0.0.1:3017/",
    "http://[::1]:3017/",
  ])
    assert.equal(localMeasurementReferrer(r), true);
  for (const r of [
    "",
    "not a URL",
    "https://localhost.example.com/",
    "https://example.com/?localhost",
    "https://vicrez.com/",
  ])
    assert.equal(localMeasurementReferrer(r), false);
  const values = new Map(),
    location = new URL("https://installers.vicrez.com/");
  const document = { referrer: "http://localhost:3130/" };
  const mod = load(
    "lib/measurement-client.ts",
    {},
    {
      window: { location },
      document,
      navigator: { userAgent: "Chrome" },
      sessionStorage: {
        getItem: (k) => values.get(k),
        setItem: (k, v) => values.set(k, v),
      },
    },
  );
  assert.equal(mod.measurementAllowed(), false);
  assert.equal(mod.measurementAllowed(true), false);
  document.referrer = "https://installers.vicrez.com/";
  location.pathname = "/apply";
  assert.equal(mod.measurementAllowed(), false);
});

function analyticsFixture() {
  const values = new Map(),
    sent = [],
    window = {
      location: new URL(
        "https://installers.vicrez.com/?token=private&email=secret@example.test",
      ),
    };
  let allowed = true;
  const globals = {
    window,
    process: { env: { NEXT_PUBLIC_GA_MEASUREMENT_ID: "G-QATEST" } },
    sessionStorage: {
      getItem: (k) => values.get(k),
      setItem: (k, v) => values.set(k, v),
    },
  };
  const mocks = {
    "@/lib/measurement-client": { measurementAllowed: () => allowed },
  };
  const fresh = () => load("lib/ga4-journeys.ts", mocks, globals);
  return {
    window,
    sent,
    globals,
    fresh,
    mod: fresh(),
    optOut: () => {
      allowed = false;
    },
    ready: () => {
      window.__vicrezGa4Configured = "G-QATEST";
      window.gtag = (...args) => sent.push(args);
      window.__vicrezGa4Flush?.();
    },
  };
}

test("GA4 queues until configuration, deduplicates retries/reloads, and keeps customer data and IDs out of events", () => {
  const f = analyticsFixture(),
    journey = randomUUID();
  const data = {
    journey_id: journey,
    page: "home",
    email: "secret@example.test",
    token: "private",
    request_id: "private",
    source: "injected",
    page_location: "https://bad.test",
  };
  f.mod.ga4JourneyEvent("quote_saved", data);
  f.mod.ga4JourneyEvent("quote_saved", data);
  assert.equal(f.sent.length, 0);
  f.ready();
  assert.equal(f.sent.length, 1);
  assert.equal(f.sent[0][1], "generate_lead");
  assert.deepEqual(JSON.parse(JSON.stringify(f.sent[0][2])), {
    send_to: "G-QATEST",
    page_type: "home",
    page_location: "https://installers.vicrez.com/",
    lead_source: "installer_inquiry",
  });
  assert.equal(JSON.stringify(f.sent).includes(journey), false);
  f.fresh().ga4JourneyEvent("quote_saved", data);
  assert.equal(f.sent.length, 1);
  f.mod.ga4JourneyEvent("quote_saved", { ...data, journey_id: randomUUID() });
  assert.equal(f.sent.length, 2);
});

test("GA4 separates steps and saved business forms, rejects attempts/errors and unbounded values", () => {
  const f = analyticsFixture();
  f.ready();
  const data = { journey_id: randomUUID(), page: "profile" };
  for (const event of [
    "quote_attempt",
    "quote_error",
    "application_attempt",
    "unknown",
    "toString",
  ])
    f.mod.ga4JourneyEvent(event, data);
  assert.equal(f.sent.length, 0);
  f.mod.ga4JourneyEvent("quote_step", { ...data, step: "private text" });
  assert.equal(f.sent.length, 0);
  for (const step of ["project", "contact", "contact", "review"])
    f.mod.ga4JourneyEvent("quote_step", { ...data, step });
  assert.equal(f.sent.length, 3);
  f.mod.ga4JourneyEvent("application_complete", { ...data, page: "apply" });
  f.mod.ga4JourneyEvent("claim_complete", { ...data, page: "claim" });
  assert.deepEqual(
    f.sent.slice(3).map((x) => x[1]),
    ["installer_application_saved", "installer_claim_saved"],
  );
});

test("queued GA4 events are discarded after opt-out and analytics exceptions never reach the form", () => {
  const f = analyticsFixture();
  f.mod.ga4JourneyEvent("quote_saved", {
    journey_id: randomUUID(),
    page: "home",
  });
  f.optOut();
  f.ready();
  assert.equal(f.sent.length, 0);
  const g = analyticsFixture();
  g.ready();
  g.window.gtag = () => {
    throw Error("blocked");
  };
  assert.doesNotThrow(() =>
    g.mod.ga4JourneyEvent("quote_saved", {
      journey_id: randomUUID(),
      page: "home",
    }),
  );
});

test("source reporting counts each saved inquiry once and preserves distinct recorded outcomes", async () => {
  const { performanceRows } = load("lib/performance.ts");
  const rows = performanceRows(
    [{ source: "vicrez", channel: "referral", sessions: 12 }],
    [
      {
        submission_id: 16,
        source: "vicrez",
        channel: "referral",
        responded: true,
      },
      {
        submission_id: 16,
        source: "vicrez",
        channel: "referral",
        responded: true,
      },
      {
        submission_id: 17,
        source: "vicrez",
        channel: "referral",
        responded: false,
      },
      {
        submission_id: 18,
        source: "opted-out",
        channel: "opted-out",
        responded: false,
      },
    ],
    [
      { submission_id: "16", state: "booked" },
      { submission_id: "17", state: "quoted" },
    ],
  );
  const r = rows.find((x) => x.source === "vicrez");
  assert.equal(r.saved, 2);
  assert.equal(r.responded, 1);
  assert.equal(r.quoted, 1);
  assert.equal(r.booked, 1);
  assert.equal(rows.find((x) => x.source === "opted-out").saved, 1);
  const route = load("app/api/admin/performance/route.ts", {
    "@/lib/admin-auth": { requireAdmin: () => null },
    "@/lib/directory-rfq": {
      rfqFetch: async () => new Response("{}", { status: 503 }),
    },
    "@/lib/db": {
      getPool: () => {
        throw Error("must not query");
      },
    },
  });
  assert.equal(
    (await route.GET(new Request("https://example.test"))).status,
    503,
  );
});
