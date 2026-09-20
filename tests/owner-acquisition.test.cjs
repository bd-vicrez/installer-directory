const test = require("node:test"),
  assert = require("node:assert/strict"),
  crypto = require("crypto"),
  sharp = require("sharp"),
  load = require("./load-module.cjs"),
  { NextRequest } = require("next/server");
const acq = load("lib/acquisition.ts");
const plain = (x) => JSON.parse(JSON.stringify(x));
test("acquisition distinguishes organic, explicit paid, social and Vicrez referrals without raw URL storage", () => {
  for (const [url, ref, source, channel] of [
    [
      "https://installers.vicrez.com/",
      "https://www.google.com/search?q=private",
      "google",
      "organic",
    ],
    [
      "https://installers.vicrez.com/?utm_source=google&utm_medium=cpc",
      "https://google.com",
      "google",
      "paid",
    ],
    [
      "https://installers.vicrez.com/?utm_source=google",
      "",
      "google",
      "unknown",
    ],
    [
      "https://installers.vicrez.com/",
      "https://google.com.attacker.test",
      "referral",
      "referral",
    ],
    [
      "https://installers.vicrez.com/",
      "https://b2b.vicrez.com/order?email=private",
      "b2b",
      "referral",
    ],
    [
      "https://installers.vicrez.com/",
      "https://m.facebook.com/path",
      "facebook",
      "social",
    ],
  ])
    assert.deepEqual(plain(acq.classifyAcquisition(url, ref)), {
      source,
      channel,
    });
});
test("acquisition allowlist drops raw fields and opted-out attribution never includes a session", () => {
  assert.deepEqual(
    plain(
      acq.acquisitionInput({
        source: "person@example.test",
        channel: "private",
        session_id: "not-a-uuid",
        email: "private",
      }),
    ),
    { source: "unknown", channel: "unknown", session_id: null },
  );
  assert.equal(
    acq.acquisitionInput({
      source: "opted-out",
      session_id: crypto.randomUUID(),
    }).session_id,
    null,
  );
});
test("first-entry attribution survives navigation and module reload in the same browser session", () => {
  const session_id = crypto.randomUUID(),
    storage = new Map(),
    location = {
      href: "https://installers.vicrez.com/?utm_source=google&utm_medium=cpc",
    };
  const globals = {
    navigator: { doNotTrack: "0" },
    location,
    document: { referrer: "" },
    sessionStorage: {
      getItem: (k) => storage.get(k),
      setItem: (k, v) => storage.set(k, v),
    },
  };
  const mocks = { "@/lib/quote-telemetry": { quoteSession: () => session_id } };
  let client = load("lib/acquisition-client.ts", mocks, globals);
  assert.equal(client.sessionAcquisition().channel, "paid");
  location.href = "https://installers.vicrez.com/installer/example";
  client = load("lib/acquisition-client.ts", mocks, globals);
  assert.equal(client.sessionAcquisition().source, "google");
  assert.equal(client.sessionAcquisition().channel, "paid");
  globals.navigator.doNotTrack = "1";
  assert.equal(client.sessionAcquisition().session_id, null);
});
test("performance counts requests once despite several shop replies and keeps current booking states separate", () => {
  const rows = load("lib/performance.ts").performanceRows(
    [{ source: "google", channel: "organic", sessions: 3 }],
    [
      { submission_id: 1, source: "google", channel: "organic", responded: 1 },
      { submission_id: 1, source: "google", channel: "organic", responded: 1 },
      { submission_id: 2, source: "unknown", channel: "unknown", responded: 0 },
    ],
    [{ submission_id: 1, state: "booked" }],
  );
  assert.deepEqual(plain(rows.find((r) => r.source === "google")), {
    source: "google",
    channel: "organic",
    sessions: 3,
    saved: 1,
    responded: 1,
    quoted: 0,
    booked: 1,
  });
  assert.equal(rows.find((r) => r.source === "unknown").saved, 1);
});
test("owner login signatures cannot be substituted with onboarding status links or record IDs", () => {
  process.env.DIRECTORY_RFQ_SECRET = "isolated-test-secret-".repeat(3);
  const access = load("lib/owner-access.ts"),
    onboarding = load("lib/onboarding.ts"),
    id = crypto.randomUUID();
  assert.equal(access.readOwnerLoginToken(access.ownerLoginToken(id)), id);
  for (const token of [
    id,
    access.ownerLoginToken(id) + ".extra",
    access.ownerLoginToken(id).slice(0, -4) + "bad",
    onboarding.statusToken("claim", id, new Date()),
  ])
    assert.throws(() => access.readOwnerLoginToken(token));
});
test("image sanitizer rejects active/animated formats and strips metadata from bounded resized photos", async () => {
  const photos = load("lib/shop-photos.ts");
  await assert.rejects(() =>
    photos.sanitizeShopPhoto(
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"></svg>',
      ),
    ),
  );
  await assert.rejects(() =>
    photos.sanitizeShopPhoto(Buffer.alloc(4 * 1024 * 1024 + 1)),
  );
  const input = await sharp({
      create: { width: 2400, height: 1800, channels: 3, background: "#123456" },
    })
      .withMetadata()
      .jpeg()
      .toBuffer(),
    out = await photos.sanitizeShopPhoto(input),
    meta = await sharp(out.data).metadata();
  assert.equal(meta.format, "webp");
  assert.equal(meta.width, 1400);
  assert.equal(meta.exif, undefined);
  assert.equal(meta.icc, undefined);
  assert.throws(() => photos.photoIds([crypto.randomUUID(), "external-url"]));
});
test("owner and performance administration reject unauthenticated access before database use", async () => {
  const mocks = {
    "@/lib/db": {
      getPool: () => {
        throw Error("must not query");
      },
    },
    "@/lib/admin-auth": {
      requireAdmin: () => new Response(null, { status: 401 }),
    },
  };
  for (const path of ["admin/owners", "admin/performance"]) {
    const route = load("app/api/" + path + "/route.ts", mocks);
    assert.equal(
      (await route.GET(new NextRequest("https://example.test"))).status,
      401,
    );
    if (route.POST)
      assert.equal(
        (await route.POST(new NextRequest("https://example.test"))).status,
        401,
      );
  }
  const route = load("app/api/owner/shop/route.ts", mocks);
  assert.equal(
    (await route.GET(new NextRequest("https://example.test/api/owner/shop")))
      .status,
    401,
  );
});
test("pause blocks new routing while authenticated response purpose retains existing contact checks", async () => {
  process.env.INSTALLER_FEED_TOKEN = "fixture-token-".repeat(4);
  const row = {
    id: "a",
    business_name: "A",
    status: "active",
    routing_email: "qa@example.test",
    quote_routing_enabled: true,
    owner_inquiry_paused: true,
    google_status: null,
    install_capabilities: ["body-kits"],
  };
  const route = load("app/api/internal/quote-routing/route.ts", {
    "@/lib/db": { getPool: () => ({ query: async () => ({ rows: [row] }) }) },
  });
  const get = async (purpose) =>
    (
      await (
        await route.GET(
          new NextRequest(
            "https://example.test/api/internal/quote-routing?id=a" + purpose,
            {
              headers: {
                Authorization: "Bearer " + process.env.INSTALLER_FEED_TOKEN,
              },
            },
          ),
        )
      ).json()
    ).installers;
  assert.equal((await get("")).length, 0);
  assert.equal((await get("&purpose=response")).length, 1);
  row.quote_routing_enabled = false;
  assert.equal((await get("&purpose=response")).length, 0);
});
