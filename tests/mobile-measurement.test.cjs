const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const load = require("./load-module.cjs");
const { discoveryInput } = load("lib/discovery.ts");
const id = randomUUID(),
  session = randomUUID(),
  journey = randomUUID();
const event = (overrides = {}) => ({
  id,
  session_id: session,
  event: "quote_step",
  journey_id: journey,
  step: "contact",
  page: "profile",
  device_category: "mobile",
  ...overrides,
});
const request = (body, headers = {}) =>
  new Request("https://installers.vicrez.com/api/discovery-events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      origin: "https://installers.vicrez.com",
      ...headers,
    },
    body: JSON.stringify(body),
  });

test("measurement accepts bounded stages and drops personal fields", () => {
  const clean = discoveryInput(
    event({
      email: "private@example.test",
      field_value: "private text",
      url: "?token=secret",
      user_agent: "raw",
    }),
  );
  assert.equal(clean.step, "contact");
  for (const key of ["email", "field_value", "url", "user_agent"])
    assert.equal(key in clean, false);
  for (const change of [
    { step: "email" },
    { device_category: "phone" },
    { duration_ms: -1 },
    { duration_ms: "100" },
    { duration_ms: 3600001 },
    { journey_id: null },
    { step: null },
    { metric: "LCP" },
  ])
    assert.throws(() => discoveryInput(event(change)));
});
test("only the server can record a saved quote and retries use its request identity", () => {
  assert.throws(() => discoveryInput(event({ event: "quote_saved" })));
  assert.equal(
    discoveryInput(event({ event: "quote_saved" }), true).event,
    "quote_saved",
  );
});
test("vitals reject invalid metrics and implausible or nonnumeric values", () => {
  const vital = event({
    event: "web_vital",
    metric: "CLS",
    metric_value: 0.392,
    step: undefined,
  });
  assert.equal(discoveryInput(vital).metric_value, 0.392);
  for (const change of [
    { metric: "email" },
    { metric_value: -1 },
    { metric_value: Infinity },
    { metric_value: "0.1" },
    { metric_value: 101 },
  ])
    assert.throws(() => discoveryInput({ ...vital, ...change }));
});
test("QA opt-out persists in the tab and private paths, bots, DNT, GPC and previews are excluded", () => {
  const location = new URL("https://installers.vicrez.com/");
  const navigator = {
    userAgent: "Chrome Mobile",
    doNotTrack: "0",
    webdriver: false,
  };
  const values = new Map();
  const mod = load(
    "lib/measurement-client.ts",
    {},
    {
      window: { location },
      navigator,
      sessionStorage: {
        getItem: (k) => values.get(k),
        setItem: (k, v) => values.set(k, v),
      },
    },
  );
  assert.equal(mod.measurementAllowed(), true);
  navigator.doNotTrack = "1";
  assert.equal(mod.measurementAllowed(), false);
  navigator.doNotTrack = "0";
  navigator.globalPrivacyControl = true;
  assert.equal(mod.measurementAllowed(), false);
  navigator.globalPrivacyControl = false;
  navigator.webdriver = true;
  assert.equal(mod.measurementAllowed(), false);
  navigator.webdriver = false;
  for (const agent of [
    "Googlebot",
    "HeadlessChrome",
    "Chrome-Lighthouse",
    "Lightpanda/1.0",
    "Vicrez-Mobile-Performance-Audit/1",
  ]) {
    navigator.userAgent = agent;
    assert.equal(mod.measurementAllowed(), false);
  }
  navigator.userAgent = "Chrome";
  for (const path of [
    "/owner",
    "/admin/performance",
    "/inquiry-progress",
    "/shop-response",
    "/request-status",
  ]) {
    location.pathname = path;
    assert.equal(mod.measurementAllowed(), false);
  }
  location.href = "https://preview.vercel.app/";
  assert.equal(mod.measurementAllowed(), false);
  location.href = "https://installers.vicrez.com/?analytics=off";
  assert.equal(mod.measurementAllowed(), false);
  location.href = "https://installers.vicrez.com/apply";
  assert.equal(mod.measurementAllowed(), false);
});
test("collection drops privacy opt-outs and known automated checks before database access", async () => {
  let accessed = false;
  const route = load("app/api/discovery-events/route.ts", {
    "@/lib/directory-rfq": {
      UUID: /^[0-9a-f-]{36}$/i,
      sameOrigin: () => true,
      withinRateLimit: () => {
        accessed = true;
        throw Error();
      },
    },
  });
  for (const headers of [
    { dnt: "1" },
    { "sec-gpc": "1" },
    { "user-agent": "HeadlessChrome" },
  ])
    assert.equal((await route.POST(request(event(), headers))).status, 204);
  assert.equal(accessed, false);
});
test("collector cannot accept a forged save and reports storage failures rather than success", async () => {
  let stored = null;
  const route = load("app/api/discovery-events/route.ts", {
    "@/lib/directory-rfq": {
      UUID: /^[0-9a-f-]{36}$/i,
      sameOrigin: () => true,
      withinRateLimit: async () => true,
    },
    "@/lib/discovery-store": {
      storeDiscoveryEvent: async (b) => {
        stored = b;
      },
    },
  });
  assert.equal(
    (await route.POST(request(event({ event: "quote_saved" })))).status,
    400,
  );
  assert.equal(stored, null);
  assert.equal(
    (await route.POST(request(event({ email: "do not save" })))).status,
    204,
  );
  assert.equal(stored.email, undefined);
  const unavailable = load("app/api/discovery-events/route.ts", {
    "@/lib/directory-rfq": {
      UUID: /^[0-9a-f-]{36}$/i,
      sameOrigin: () => true,
      withinRateLimit: async () => true,
    },
    "@/lib/discovery-store": {
      storeDiscoveryEvent: async () => {
        throw Error();
      },
    },
  });
  assert.equal((await unavailable.POST(request(event()))).status, 503);
});
test("saved-quote measurement skips opt-outs and cannot break a durable receipt", async () => {
  let saved = [];
  const { recordSavedQuote } = load("lib/quote-measurement.ts", {
    "@/lib/discovery-store": {
      storeDiscoveryEvent: async (b) => {
        saved.push(b);
      },
    },
  });
  const body = {
    request_id: journey,
    session_id: session,
    measurement: { page: "profile", device_category: "mobile" },
    acquisition: { source: "direct" },
    customer_email: "private@example.test",
  };
  await recordSavedQuote(request({}), body);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].id, journey);
  assert.equal(saved[0].event, "quote_saved");
  assert.equal(saved[0].customer_email, undefined);
  await recordSavedQuote(request({}, { dnt: "1" }), body);
  await recordSavedQuote(request({}), {
    ...body,
    acquisition: { channel: "opted-out" },
  });
  assert.equal(saved.length, 1);
  const bad = load(
    "lib/quote-measurement.ts",
    {
      "@/lib/discovery-store": {
        storeDiscoveryEvent: async () => {
          throw Error();
        },
      },
    },
    { console: { error: () => {} } },
  );
  await assert.doesNotReject(() => bad.recordSavedQuote(request({}), body));
});
test("new measurements are inaccessible without staff authentication", async () => {
  let read = false;
  const route = load("app/api/admin/experience/route.ts", {
    "@/lib/admin-auth": {
      requireAdmin: () => new Response("{}", { status: 401 }),
    },
    "@/lib/experience-report": {
      experienceReport: () => {
        read = true;
      },
    },
  });
  assert.equal((await route.GET(request({}))).status, 401);
  assert.equal(read, false);
});
