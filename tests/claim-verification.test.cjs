const test = require("node:test"),
  assert = require("node:assert/strict"),
  load = require("./load-module.cjs"),
  { NextRequest } = require("next/server");
const secret = "qa-secret-".repeat(5),
  mocks = {
    "@/lib/directory-rfq": {
      rfqConfig: () => ({ secret }),
      UUID: /^[0-9a-f-]{36}$/i,
    },
  };
const lib = load("lib/claim-verification.ts", mocks),
  id = "00000000-0000-4000-8000-000000000001";
test("ownership confirmation routes are private measurement paths", () => {
  const p = load("lib/measurement-privacy.ts");
  assert.equal(p.privateMeasurementPath("/claim/verify"), true);
  assert.equal(p.privateMeasurementPath("/claim/verify/extra"), true);
  assert.equal(p.privateMeasurementPath("/claim"), false);
});
test("ownership proof tokens reject tampering, malformed inputs and owner sign-in tokens", () => {
  const token = lib.claimVerificationToken(id);
  assert.equal(lib.readClaimVerificationToken(token), id);
  const owner = load("lib/owner-access.ts", mocks);
  for (const bad of [
    null,
    "bad",
    token + "x",
    token + ".extra",
    owner.ownerLoginToken(id),
  ])
    assert.throws(() => lib.readClaimVerificationToken(bad));
});
test("inspection does not grant access, confirm is explicit, and changed proof rolls back", async () => {
  for (const [confirm, eligible] of [
    [false, true],
    [true, true],
    [true, false],
  ]) {
    const calls = [];
    let released = false;
    const client = {
      release() {
        released = true;
      },
      async query(sql, args) {
        calls.push(sql);
        if (sql.startsWith("SELECT claim_id"))
          return { rows: [{ claim_id: "claim" }] };
        if (sql.includes("SELECT v.*,c.installer_id"))
          return {
            rows: [
              {
                claim_id: "claim",
                installer_id: "shop",
                recipient: "shop@example.test",
                name: "Owner",
                business_name: "QA Shop",
                expires_at: "2030-01-01",
              },
            ],
          };
        if (sql.includes("AS eligible")) return { rows: [{ eligible }] };
        if (sql.startsWith("INSERT INTO directory_owner_grants"))
          return { rows: [{ id: "grant" }] };
        return { rows: [] };
      },
    };
    if (eligible) {
      await lib.verifyClaim({ connect: async () => client }, id, confirm);
      assert.equal(
        calls.some((s) => s.startsWith("INSERT INTO directory_owner_grants")),
        confirm,
      );
      assert.equal(calls.at(-1), "COMMIT");
    } else {
      await assert.rejects(
        lib.verifyClaim({ connect: async () => client }, id, confirm),
      );
      assert.equal(calls.at(-1), "ROLLBACK");
      assert.equal(
        calls.some((s) => s.startsWith("INSERT INTO directory_owner_grants")),
        false,
      );
    }
    assert.ok(released);
  }
});
test("ownership route rejects cross-origin requests and missing explicit confirmation", async () => {
  let writes = 0;
  const route = load("app/api/claims/verify/route.ts", {
    "@/lib/db": { getPool: () => ({}) },
    "@/lib/directory-rfq": {
      ...mocks["@/lib/directory-rfq"],
      withinRateLimit: async () => true,
    },
    "@/lib/claim-verification": {
      readClaimVerificationToken: () => id,
      verifyClaim: async () => {
        writes++;
        return { verified: true };
      },
    },
  });
  for (const [origin, body, status] of [
    [
      "https://attacker.test",
      { action: "confirm", confirm_authority: true },
      403,
    ],
    ["https://installers.vicrez.com", { action: "confirm" }, 400],
  ]) {
    const r = await route.POST(
      new NextRequest("https://installers.vicrez.com/api/claims/verify", {
        method: "POST",
        headers: { origin, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
    assert.equal(r.status, status);
  }
  assert.equal(writes, 0);
});
test("verification notification uses the business help address and a distinct private proof link", () => {
  const n = load("lib/notifications.ts", mocks);
  const msg = n.notificationMessage({
    id,
    kind: "claim",
    outcome: "ownership_verification",
    record_id: id,
    recipient: "shop@example.test",
    reference: "CLM-QA",
    public_message: "Shop: QA Shop",
  });
  assert.equal(msg.from.email, "b2bsupport@vicrez.com");
  assert.equal(msg.reply_to.email, "b2bsupport@vicrezcom.zendesk.com");
  assert.match(msg.content[0].value, /\/claim\/verify#/);
  assert.doesNotMatch(msg.content[0].value, /\/request-status#/);
  assert.equal(msg.tracking_settings.click_tracking.enable, false);
});
test("delivery rechecks proof eligibility and never sends an expired or mismatched proof", async () => {
  const old = {
    enabled: process.env.DIRECTORY_NOTIFICATIONS_ENABLED,
    key: process.env.SENDGRID_API_KEY,
  };
  process.env.DIRECTORY_NOTIFICATIONS_ENABLED = "1";
  process.env.SENDGRID_API_KEY = "qa-only";
  try {
    for (const proof of [
      { recipient: "shop@example.test", eligible: false },
      { recipient: "changed@example.test", eligible: true },
    ]) {
      let sends = 0;
      const calls = [];
      const n = load("lib/notifications.ts", mocks);
      const pool = {
        async query(sql) {
          calls.push(sql);
          if (sql.includes("WITH candidates"))
            return {
              rows: [
                {
                  id,
                  kind: "claim",
                  outcome: "ownership_verification",
                  record_id: id,
                  recipient: "shop@example.test",
                },
              ],
            };
          if (sql.startsWith("SELECT recipient")) return { rows: [proof] };
          return { rows: [] };
        },
      };
      await n.processNotifications(pool, async () => {
        sends++;
        throw Error("must not send");
      });
      assert.equal(sends, 0);
      assert.ok(calls.some((s) => s.includes("state='expired'")));
    }
  } finally {
    if (old.enabled === undefined)
      delete process.env.DIRECTORY_NOTIFICATIONS_ENABLED;
    else process.env.DIRECTORY_NOTIFICATIONS_ENABLED = old.enabled;
    if (old.key === undefined) delete process.env.SENDGRID_API_KEY;
    else process.env.SENDGRID_API_KEY = old.key;
  }
});
