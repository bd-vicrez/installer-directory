const test = require("node:test"),
  assert = require("node:assert/strict"),
  load = require("./load-module.cjs");
const uuid = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
test("signed legacy application receipts remain readable without accepting unsigned identifiers", () => {
  const m = load("lib/onboarding.ts", {
    "@/lib/directory-rfq": {
      UUID: /^[0-9a-f-]{36}$/,
      rfqConfig: () => ({ secret: "qa-only-".repeat(8) }),
    },
  });
  const token = m.statusToken("application", "legacy_app_13", new Date());
  assert.equal(m.readStatusToken(token).id, "legacy_app_13");
  assert.throws(() => m.readStatusToken("legacy_app_13"));
  assert.throws(() =>
    m.readStatusToken(m.statusToken("application", "bad/id", new Date())),
  );
  assert.throws(() =>
    m.readStatusToken(m.statusToken("claim", "legacy_app_13", new Date())),
  );
});
test("discovery events project only bounded non-contact fields", () => {
  const { discoveryInput } = load("lib/discovery.ts");
  const result = discoveryInput({
    id: uuid,
    session_id: uuid,
    event: "search",
    page: "home",
    service: "Wheels/Tires",
    result_bucket: "6-24",
    email: "private@example.test",
    query: "private address",
    lat: 42,
  });
  assert.equal(result.service, "wheels-tires");
  for (const field of ["email", "query", "lat"])
    assert.equal(field in result, false);
  for (const patch of [
    { page: "/request-status#secret" },
    { result_bucket: "92887" },
    { listing_id: "email@example.test" },
    { campaign_source: "personal-data" },
    { event: "quote_saved" },
    { id: "bad" },
  ])
    assert.throws(() =>
      discoveryInput({ id: uuid, session_id: uuid, event: "search", ...patch }),
    );
});
test("notification copy contains only public review information and disables link rewriting", () => {
  const { notificationMessage } = load("lib/notifications.ts", {
    "@/lib/onboarding": { statusToken: () => "private-status-fixture" },
  });
  const m = notificationMessage({
    id: uuid,
    kind: "application",
    record_id: uuid,
    recipient: "qa@example.test",
    reference: "APP-QA",
    outcome: "needs_information",
    public_message: "Confirm your street number.",
    review_note: "PRIVATE REVIEW EVIDENCE",
    created_at: new Date(),
  });
  const encoded = JSON.stringify(m);
  assert.ok(encoded.includes("Confirm your street number."));
  assert.ok(!encoded.includes("PRIVATE REVIEW EVIDENCE"));
  assert.ok(encoded.includes("request-status#private-status-fixture"));
  assert.equal(m.tracking_settings.click_tracking.enable, false);
  assert.equal(m.tracking_settings.open_tracking.enable, false);
  assert.equal(m.personalizations.length, 1);
});
test("notification transport distinguishes acceptance, explicit refusal, throttle and uncertain sends", async () => {
  for (const [mode, expected] of [
    ["accepted", "accepted"],
    ["refused", "failed"],
    ["throttled", "retry"],
    ["network", "uncertain"],
    ["server", "uncertain"],
  ]) {
    const writes = [],
      row = {
        id: uuid,
        kind: "test",
        record_id: "qa",
        recipient: "qa@example.test",
        reference: "TEST-QA",
        outcome: "test",
        attempts: 1,
      };
    const db = {
      query: async (sql, v) => {
        if (sql.includes("WITH candidates")) return { rows: [row] };
        if (sql.includes("SELECT id,provider_id")) return { rows: [] };
        writes.push({ sql, v });
        return { rows: [] };
      },
    };
    const env = {
      DIRECTORY_NOTIFICATIONS_ENABLED: "1",
      SENDGRID_API_KEY: "test-only",
    };
    const { processNotifications } = load(
      "lib/notifications.ts",
      {},
      { process: { env } },
    );
    let sends = 0;
    await processNotifications(db, async () => {
      sends++;
      if (mode === "network") throw Error("timeout");
      return new Response(null, {
        status:
          mode === "accepted"
            ? 202
            : mode === "refused"
              ? 400
              : mode === "throttled"
                ? 429
                : 503,
        headers: { "x-message-id": "provider-qa" },
      });
    });
    assert.equal(sends, 1);
    const update = writes.find((w) => w.sql.includes("accepted_at=CASE"));
    assert.equal(update.v[1], expected);
  }
});
test("notification service pause never claims work or calls the provider", async () => {
  let calls = 0;
  const { processNotifications } = load(
    "lib/notifications.ts",
    {},
    { process: { env: { DIRECTORY_NOTIFICATIONS_ENABLED: "0" } } },
  );
  const result = await processNotifications(
    {
      query: async () => {
        calls++;
      },
    },
    async () => {
      calls++;
    },
  );
  assert.equal(result.enabled, false);
  assert.equal(calls, 0);
});
test("operations requires its own secret and rejects caller supplied lookalikes", () => {
  const { operationsAuthorized } = load(
    "lib/notifications.ts",
    {},
    { process: { env: { DIRECTORY_OPERATIONS_SECRET: "x".repeat(48) } } },
  );
  assert.equal(
    operationsAuthorized(new Request("https://example.test")),
    false,
  );
  assert.equal(
    operationsAuthorized(
      new Request("https://example.test", {
        headers: { Authorization: "Bearer " + "é".repeat(48) },
      }),
    ),
    false,
  );
  assert.equal(
    operationsAuthorized(
      new Request("https://example.test", {
        headers: { Authorization: "Bearer " + "x".repeat(48) },
      }),
    ),
    true,
  );
  assert.equal(
    operationsAuthorized(
      new Request("https://example.test", {
        headers: { Authorization: "Bearer " + "y".repeat(48) },
      }),
    ),
    false,
  );
});
test("authenticator codes follow the RFC vector and reject consumed counters", () => {
  const security = load(
    "lib/staff-security.ts",
    {},
    { process: { env: { ADMIN_SECRET: "test-secret-".repeat(4) } } },
  );
  const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
  assert.equal(security.totpCode(secret, 1), "287082");
  assert.equal(security.verifyTotp(secret, "287082", -1, 59000), 1);
  assert.equal(security.verifyTotp(secret, "287082", 1, 59000), null);
  const sealed = security.sealTotp(secret);
  assert.ok(!sealed.includes(secret));
  assert.equal(security.openTotp(sealed), secret);
  assert.throws(() => security.openTotp(sealed.slice(0, -5) + "xxxxx"));
  const hash = security.passwordHash("test-long-password");
  assert.ok(security.verifyPassword("test-long-password", hash));
  assert.equal(security.verifyPassword("wrong-password", hash), false);
});
test("named sessions check active membership and token version; shared login can be retired", async () => {
  const { NextRequest } = require("next/server");
  let active = true,
    version = 1,
    namedOnly = false;
  const db = {
    query: async (sql, args) => ({
      rows: sql.includes("directory_staff_users")
        ? active && args[2] === version
          ? [{ id: uuid, username: "qa.staff" }]
          : []
        : [{ named_only: namedOnly }],
    }),
  };
  const auth = load(
    "lib/admin-auth.ts",
    { "@/lib/db": { getPool: () => db } },
    {
      process: {
        env: { ADMIN_SECRET: "qa-secret-".repeat(5), ADMIN_USERNAME: "admin" },
      },
    },
  );
  const request = (t) =>
    new NextRequest("https://example.test/admin", {
      headers: { cookie: "admin_token=" + t },
    });
  const token = auth.generateToken({
    id: uuid,
    username: "qa.staff",
    token_version: 1,
  });
  const r = request(token);
  assert.equal(await auth.requireAdmin(r), null);
  assert.equal(auth.adminIdentity(r).username, "qa.staff");
  version = 2;
  assert.equal((await auth.requireAdmin(request(token))).status, 401);
  version = 1;
  active = false;
  assert.equal((await auth.requireAdmin(request(token))).status, 401);
  const legacy = auth.generateToken();
  assert.equal(await auth.requireAdmin(request(legacy)), null);
  namedOnly = true;
  assert.equal((await auth.requireAdmin(request(legacy))).status, 401);
});
