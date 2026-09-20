const test = require("node:test"),
  assert = require("node:assert/strict"),
  load = require("./load-module.cjs");
const { NextRequest, NextResponse } = require("next/server");
const pilot = load("lib/pilot.ts");
const listing = {
  status: "active",
  quote_routing_enabled: true,
  routing_email: "shop@example.test",
  google_status: null,
};
const complete = {
  contact_email: "SHOP@example.test",
  note: "Confirmed from the owner reply on test date.",
};
for (const [key] of pilot.PILOT_FIELDS)
  complete[key] = "Confirmed evidence from the owner, dated.";
test("pilot activation needs actual evidence for every gate and the current enabled recipient", () => {
  assert.equal(pilot.pilotMissing(complete, listing).length, 0);
  for (const [key] of pilot.PILOT_FIELDS)
    assert.ok(
      pilot.pilotMissing({ ...complete, [key]: "" }, listing).length > 0,
    );
  for (const diff of [
    { routing_email: "changed@example.test" },
    { quote_routing_enabled: false },
    { status: "inactive" },
    { google_status: "CLOSED_PERMANENTLY" },
  ])
    assert.ok(pilot.pilotMissing(complete, { ...listing, ...diff }).length > 0);
});
test("pilot input supports partial reviews but requires a note and ignores unknown data", () => {
  const result = pilot.pilotInput({
    decision: "reviewing",
    version: 0,
    evidence: { note: "Waiting for the owner reply.", secret: "ignored" },
  });
  assert.equal(result.evidence.authority, "");
  assert.equal(result.evidence.secret, undefined);
  for (const diff of [
    { decision: "invented" },
    { version: -1 },
    { evidence: { note: "" } },
    { evidence: { ...complete, authority: true } },
  ])
    assert.throws(() =>
      pilot.pilotInput({
        decision: "active",
        version: 0,
        evidence: complete,
        ...diff,
      }),
    );
});
test("pilot and response admin reads/writes require authentication before any access", async () => {
  let used = false;
  const route = load("app/api/admin/pilot/route.ts", {
    "@/lib/admin-auth": {
      requireAdmin: () =>
        NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    },
    "@/lib/db": {
      getPool: () => {
        used = true;
        throw Error();
      },
    },
  });
  for (const method of ["GET", "PATCH"])
    assert.equal(
      (
        await route[method](
          new NextRequest("https://example.test/api/admin/pilot", { method }),
        )
      ).status,
      401,
    );
  assert.equal(used, false);
});
test("shop response proxy rejects cross-origin, malformed tokens and throttled callers without forwarding", async () => {
  let calls = 0;
  const route = load("app/api/shop-response/route.ts", {
    "@/lib/directory-rfq": {
      sameOrigin: (r) => r.headers.get("origin") === "https://example.test",
      withinRateLimit: async () => false,
      rfqFetch: () => {
        calls++;
      },
    },
  });
  const req = (body, origin = "https://example.test") =>
    new Request("https://example.test/api/shop-response", {
      method: "POST",
      headers: { Origin: origin },
      body: JSON.stringify(body),
    });
  assert.equal(
    (
      await route.POST(
        req({ action: "view", token: "a".repeat(60) }, "https://other.test"),
      )
    ).status,
    403,
  );
  assert.equal(
    (await route.POST(req({ action: "view", token: "bad" }))).status,
    401,
  );
  assert.equal(
    (await route.POST(req({ action: "save", token: "a".repeat(60) }))).status,
    429,
  );
  assert.equal(calls, 0);
});
