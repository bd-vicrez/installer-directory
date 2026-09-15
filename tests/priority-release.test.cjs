const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const { NextRequest } = require("next/server");
const root = path.resolve(__dirname, "../src");
function load(file, mocks = {}, globals = {}) {
  mocks = {
    "@/lib/directory-rfq": {
      UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      sameOrigin: () => true,
      withinRateLimit: async () => true,
      recordQuoteEvent: async () => {},
      rfqFetch: (url, body) =>
        (globals.fetch || fetch)("https://example.test" + url, {
          method: "POST",
          body: JSON.stringify(body),
        }),
    },
    ...mocks,
  };
  const cache = new Map();
  function read(filename) {
    filename = path.resolve(filename);
    if (!path.extname(filename)) filename += ".ts";
    if (cache.has(filename)) return cache.get(filename).exports;
    if (filename.endsWith(".json"))
      return JSON.parse(fs.readFileSync(filename, "utf8"));
    const mod = { exports: {} };
    cache.set(filename, mod);
    const req = (name) => {
      if (name in mocks) return mocks[name];
      if (name.startsWith("@/")) return read(path.join(root, name.slice(2)));
      if (name.startsWith(".")) {
        const target = path.resolve(path.dirname(filename), name);
        const alias =
          "@/" +
          path
            .relative(root, target)
            .replaceAll("\\", "/")
            .replace(/\.tsx?$/, "");
        return alias in mocks ? mocks[alias] : read(target);
      }
      return require(name);
    };
    const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
    }).outputText;
    vm.runInNewContext(
      code,
      {
        exports: mod.exports,
        module: mod,
        require: req,
        process,
        Buffer,
        URLSearchParams,
        console,
        fetch,
        AbortSignal,
        ...globals,
      },
      { filename },
    );
    return mod.exports;
  }
  return read(path.join(root, file));
}
const request = (url, body) =>
  new NextRequest(
    "https://example.test" + url,
    body === undefined
      ? {}
      : {
          method: "POST",
          body: typeof body === "string" ? body : JSON.stringify(body),
          headers: { "content-type": "application/json" },
        },
  );
test("public projection retains shop fields and excludes every private field", () => {
  const { toPublicInstaller } = load("lib/public-installers.ts");
  const projected = toPublicInstaller({
    id: 1,
    business_name: "Example shop",
    phone: "555-0100",
    source: "manual",
    email: "private@example.test",
    internal_notes: "secret",
    harvested_email: "hidden@example.test",
    unexpected_future_field: "secret",
  });
  assert.equal(projected.business_name, "Example shop");
  assert.equal(projected.phone, "555-0100");
  for (const field of [
    "email",
    "source",
    "internal_notes",
    "harvested_email",
    "unexpected_future_field",
  ])
    assert.equal(field in projected, false);
});
test("search rejects unbounded pages and malformed location/filter values", () => {
  const { readSearchOptions } = load("lib/public-installers.ts");
  assert.equal(readSearchOptions(new URLSearchParams()).limit, 24);
  for (const query of [
    "limit=99999",
    "offset=-1",
    "limit=1.5",
    "lat=90",
    "lat=91&lng=0",
    "radius=0",
    "service=unknown",
    "q=" + "x".repeat(121),
  ])
    assert.throws(() => readSearchOptions(new URLSearchParams(query)));
});
test("internal feed rejects anonymous and invalid callers before database access", async () => {
  process.env.INSTALLER_FEED_TOKEN = "a".repeat(48);
  const { GET } = load("app/api/internal/installers/route.ts", {
    "@/lib/db": {
      getPool() {
        throw new Error("Database must not be accessed");
      },
    },
  });
  for (const authorization of ["", "Bearer wrong"]) {
    const result = await GET(
      new NextRequest("https://example.test/api/internal/installers", {
        headers: { authorization },
      }),
    );
    assert.equal(result.status, 401);
    assert.equal(result.headers.get("cache-control"), "no-store");
  }
});
test("internal feed permits the authorized reader and prevents shared caching", async () => {
  process.env.INSTALLER_FEED_TOKEN = "a".repeat(48);
  const { GET } = load("app/api/internal/installers/route.ts", {
    "@/lib/db": {
      getPool: () => ({
        query: async () => ({
          rows: [{ id: 1, email: "private@example.test" }],
        }),
      }),
    },
  });
  const result = await GET(
    new NextRequest("https://example.test/api/internal/installers", {
      headers: { authorization: "Bearer " + process.env.INSTALLER_FEED_TOKEN },
    }),
  );
  assert.equal(result.status, 200);
  assert.equal((await result.json())[0].id, 1);
  assert.match(result.headers.get("cache-control"), /private, no-store/);
});
test("public search uses bounded database queries and projects the result", async () => {
  const calls = [];
  const { GET } = load("app/api/installers/route.ts", {
    "@/lib/db": {
      getPool: () => ({
        query: async (sql, values) => {
          calls.push({ sql, values });
          return {
            rows:
              calls.length === 1
                ? [{ total: 2, verified: 1 }]
                : [
                    {
                      id: 1,
                      source: "manual",
                      internal_notes: "hidden",
                      email: "hidden",
                    },
                  ],
          };
        },
      }),
    },
    "@/lib/geocode": {
      geocodeLocation: async () => ({
        lat: 34.05,
        lng: -118.25,
        label: "Los Angeles, CA",
      }),
    },
  });
  const result = await GET(
    request("/api/installers?q=Los%20Angeles&service=PPF&limit=12&offset=12"),
  );
  assert.equal(result.status, 200);
  const data = await result.json();
  assert.equal(data.total, 2);
  assert.equal(data.installers[0].internal_notes, undefined);
  assert.match(calls[1].sql, /LIMIT \$\d+ OFFSET \$\d+/);
  assert.equal(calls[1].values.at(-1), 12);
  assert.ok(calls[0].values.includes(" ppf "));
});
test("search distinguishes unknown locations from backend failures", async () => {
  for (const [geocodeLocation, status] of [
    [async () => null, 422],
    [
      async () => {
        throw new Error("offline");
      },
      503,
    ],
  ]) {
    const { GET } = load("app/api/installers/route.ts", {
      "@/lib/geocode": { geocodeLocation },
    });
    assert.equal(
      (await GET(request("/api/installers?q=00000"))).status,
      status,
    );
  }
});
test("admin sessions require a signature, expire, and reject legacy or tampered values", () => {
  process.env.ADMIN_SECRET = "s".repeat(48);
  process.env.ADMIN_USERNAME = "admin";
  const auth = load("lib/admin-auth.ts");
  const token = auth.generateToken();
  assert.equal(auth.verifyAdminToken(token), true);
  assert.equal(auth.verifyAdminToken(token + "x"), false);
  assert.equal(auth.verifyAdminToken("old-prefix:admin"), false);
  const [payload, signature] = token.split(".");
  const changed = Buffer.from(
    JSON.stringify({
      ...JSON.parse(Buffer.from(payload, "base64url")),
      exp: Date.now() + 999999999,
    }),
  ).toString("base64url");
  assert.equal(auth.verifyAdminToken(changed + "." + signature), false);
  const expired = Buffer.from(
    JSON.stringify({ user: "admin", exp: Date.now() - 1 }),
  ).toString("base64url");
  const sig = require("node:crypto")
    .createHmac("sha256", process.env.ADMIN_SECRET)
    .update(expired)
    .digest("base64url");
  assert.equal(auth.verifyAdminToken(expired + "." + sig), false);
  delete process.env.ADMIN_SECRET;
  assert.equal(auth.verifyAdminToken(token), false);
});
const validQuote = () => ({
  service: "body-kits",
  sharing_consent: true,
  customer_name: "Test Customer",
  customer_email: "customer@example.test",
  customer_phone: "2125550100",
  vehicle_year: "2024",
  vehicle_make: "Dodge",
  vehicle_model: "Charger",
  what_needed: "Body Kits",
  zip_code: "10001",
  request_id: "fd28ed09-c797-4a0e-a0c7-a2d4c6a6c00a",
});
test("quote validation checks required details and a receipt requires a saved submission", () => {
  const { validateQuoteInput, quoteReceipt } = load("lib/quote-validation.ts");
  assert.equal(validateQuoteInput(validQuote()), null);
  for (const changed of [
    { zip_code: "bad" },
    { customer_email: "invalid" },
    { additional_notes: "x".repeat(501) },
    { website_url: "spam" },
    { request_id: "bad" },
  ])
    assert.ok(validateQuoteInput({ ...validQuote(), ...changed }));
  for (const data of [
    {},
    { ok: true },
    { ok: false, submission_id: 1 },
    { ok: true, submission_id: -1 },
  ])
    assert.throws(() => quoteReceipt(data));
  assert.equal(
    quoteReceipt({
      ok: true,
      submission_id: 42,
      receipt_token: "test-receipt-token",
    }).reference,
    "VZ-42",
  );
});
test("quote endpoint rejects unconfirmed delivery and retains the same retry identifier", async () => {
  let forwarded;
  const { POST } = load(
    "app/api/quote-request/route.ts",
    {},
    {
      fetch: async (_url, opts) => {
        forwarded = JSON.parse(opts.body);
        return new Response("{}", { status: 502 });
      },
    },
  );
  const result = await POST(request("/api/quote-request", validQuote()));
  assert.equal(result.status, 503);
  assert.equal(forwarded.request_id, validQuote().request_id);
  assert.equal((await result.json()).success, undefined);
});
test("quote endpoint derives recipients from the database and accepts a confirmed reference", async () => {
  const requests = [];
  const { POST } = load(
    "app/api/quote-request/route.ts",
    {
      "@/lib/db": {
        getPool: () => ({
          query: async () => ({
            rows: [
              {
                business_name: "Real Shop",
                email: "real@example.test",
                routing_email: "real@example.test",
                status: "active",
                quote_routing_enabled: true,
                zip_code: "10001",
              },
            ],
          }),
        }),
      },
    },
    {
      fetch: async (url, opts) => {
        requests.push({ url, body: JSON.parse(opts.body) });
        return new Response(
          JSON.stringify({
            ok: true,
            submission_id: 42,
            receipt_token: "test-receipt-token",
            installers_notified: 1,
          }),
        );
      },
    },
  );
  const result = await POST(
    request("/api/quote-request", {
      ...validQuote(),
      installer_id: "123",
      installer_email: "attacker@example.test",
    }),
  );
  assert.equal(result.status, 200);
  assert.equal((await result.json()).reference, "VZ-42");
  assert.equal(requests.length, 1);
  assert.equal(requests[0].body.preferred_installer_id, "123");
  assert.ok(!JSON.stringify(requests).includes("attacker"));
});
test("quote endpoint rejects malformed or oversized bodies before any delivery", async () => {
  const { POST } = load(
    "app/api/quote-request/route.ts",
    {},
    {
      fetch: async () => {
        throw new Error("Must not send");
      },
    },
  );
  assert.equal((await POST(request("/api/quote-request", "{bad"))).status, 400);
  assert.equal(
    (
      await POST(
        request("/api/quote-request", {
          ...validQuote(),
          additional_notes: "x".repeat(17000),
        }),
      )
    ).status,
    413,
  );
});
test("saved quote returns its receipt without a second inline notification path", async () => {
  process.env.SENDGRID_API_KEY = "isolated-test-key";
  let count = 0;
  const { POST } = load(
    "app/api/quote-request/route.ts",
    {
      "@/lib/db": {
        getPool: () => ({
          query: async () => ({
            rows: [
              {
                business_name: "Real Shop",
                email: "real@example.test",
                routing_email: "real@example.test",
                status: "active",
                quote_routing_enabled: true,
                zip_code: "10001",
              },
            ],
          }),
        }),
      },
    },
    {
      fetch: async () => {
        if (++count === 1)
          return new Response(
            JSON.stringify({
              ok: true,
              submission_id: 42,
              receipt_token: "test-receipt-token",
              installers_notified: 0,
            }),
          );
        throw new Error("simulated mail timeout");
      },
    },
  );
  const result = await POST(
    request("/api/quote-request", { ...validQuote(), installer_id: "123" }),
  );
  assert.equal(result.status, 200);
  assert.equal((await result.json()).reference, "VZ-42");
  assert.equal(count, 1);
  delete process.env.SENDGRID_API_KEY;
});
