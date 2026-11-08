const test = require("node:test"),
  assert = require("node:assert/strict"),
  load = require("./load-module.cjs");
const recovery = load("lib/claim-recovery.ts"),
  actor = "Vicrez Installer Agent (AI)",
  now = Date.now();
const row = () => ({
  status: "needs_information",
  reviewer: actor,
  owner_name: actor,
  assignment_actor: actor,
  relationship: "owner",
  automation_state: "staff_attention",
  paused: true,
  evidence: { decision: { reason: "business_contact_not_corroborated" } },
  recovery_count: 0,
});
test("recovery permits new evidence but never overrides a human, conflicting ownership, revoked access or authority risks", () => {
  assert.equal(recovery.claimRecoveryStatus(row(), now).can_requeue, true);
  for (const change of [
    { reviewer: "staff" },
    { assignment_actor: "staff" },
    { owner_name: "staff" },
    { ownership_conflict: true },
    { relationship: "former employee" },
    { relationship: "marketing agency" },
    { status: "resolved" },
    { consumed_at: new Date() },
    { recovery_count: 3 },
    { last_recovery_at: new Date(now - 1000) },
    { evidence: { decision: { reason: "ownership_conflict" } } },
  ]) {
    const s = recovery.claimRecoveryStatus({ ...row(), ...change }, now);
    assert.equal(s.can_requeue, false, JSON.stringify(change));
    assert.equal(s.can_renew, false);
  }
});
test("renewal needs an expired proof; pending valid links never resend", () => {
  const p = {
    ...row(),
    automation_state: "awaiting_business_confirmation",
    proof_id: "proof",
    proof_expires_at: new Date(now + 1000),
  };
  assert.equal(recovery.claimRecoveryStatus(p, now).can_renew, false);
  p.proof_expires_at = new Date(now - 1000);
  assert.equal(recovery.claimRecoveryStatus(p, now).can_renew, true);
});
test("customer recovery guidance exposes neither research documents nor conflicting owners", () => {
  const x = {
    ...row(),
    ownership_conflict: true,
    email: "private@example.test",
    evidence: {
      research: { secret: "do-not-expose" },
      decision: { reason: "ownership_conflict" },
    },
  };
  const json = JSON.stringify(recovery.claimRecoveryStatus(x));
  assert.ok(!json.includes("private@"));
  assert.ok(!json.includes("do-not-expose"));
  assert.match(json, /support/);
});
test("watchdog detects missing, failed, stale and impossible future heartbeats without treating budget exhaustion as failure", () => {
  const w = load("lib/verification-watchdog.ts", { "@/lib/notifications": {} });
  assert.equal(
    w.verificationProblem(
      {
        checked_at: new Date(now),
        ok: true,
        details: { max_reviews_per_day: 20 },
      },
      now,
    ),
    null,
  );
  for (const r of [
    null,
    { checked_at: "invalid", ok: true },
    { checked_at: new Date(now - 7200000), ok: true },
    { checked_at: new Date(now + 600001), ok: true },
    { checked_at: new Date(now), ok: false },
  ])
    assert.ok(w.verificationProblem(r, now));
});
test("watchdog secret fails closed and is independent of the operations credential", () => {
  const w = load("lib/verification-watchdog.ts", { "@/lib/notifications": {} });
  const old = process.env.CRON_SECRET;
  try {
    delete process.env.CRON_SECRET;
    assert.equal(
      w.watchdogAuthorized(new Request("https://example.test")),
      false,
    );
    process.env.CRON_SECRET = "z".repeat(40);
    assert.equal(
      w.watchdogAuthorized(
        new Request("https://example.test", {
          headers: { authorization: "Bearer " + "z".repeat(40) },
        }),
      ),
      true,
    );
    assert.equal(
      w.watchdogAuthorized(
        new Request("https://example.test", {
          headers: { authorization: "Bearer wrong" },
        }),
      ),
      false,
    );
  } finally {
    if (old) process.env.CRON_SECRET = old;
    else delete process.env.CRON_SECRET;
  }
});
test("quote test proof is distinct from owner sign-in and ownership proof", () => {
  const mocks = {
      "@/lib/directory-rfq": {
        rfqConfig: () => ({ secret: "x".repeat(48) }),
        UUID: /^[0-9a-f-]{36}$/i,
      },
    },
    id = "00000000-0000-4000-8000-000000000001";
  const q = load("lib/owner-quote-setup.ts", mocks),
    owner = load("lib/owner-access.ts", mocks),
    claim = load("lib/claim-verification.ts", mocks);
  assert.equal(q.readQuoteSetupToken(q.quoteSetupToken(id)), id);
  for (const token of [
    null,
    "bad",
    q.quoteSetupToken(id) + "x",
    owner.ownerLoginToken(id),
    claim.claimVerificationToken(id),
  ])
    assert.throws(() => q.readQuoteSetupToken(token));
  assert.equal(
    load("lib/measurement-privacy.ts").privateMeasurementPath(
      "/owner/quote-setup",
    ),
    true,
  );
});
test("setup requires explicit participation and test permission", async () => {
  const q = load("lib/owner-quote-setup.ts");
  for (const b of [
    {},
    {
      request_id: "00000000-0000-4000-8000-000000000001",
      confirm_services: true,
      confirm_participation: true,
    },
  ])
    await assert.rejects(
      q.requestQuoteSetup(
        {
          connect: () => {
            throw Error("Must not connect");
          },
        },
        {},
        b,
      ),
      /Confirm/,
    );
});
test("new quote activation is blocked without confirmed setup while existing routing and disable actions remain available", async () => {
  for (const [before, enabled, ready, expected] of [
    [false, true, false, 409],
    [false, true, true, 200],
    [true, true, false, 200],
    [true, false, false, 200],
  ]) {
    const calls = [],
      c = {
        release() {},
        async query(sql) {
          calls.push(sql);
          if (sql.startsWith("SELECT routing_email"))
            return {
              rows: [
                {
                  routing_email: "shop@example.test",
                  quote_routing_enabled: before,
                },
              ],
            };
          if (sql.includes("directory_quote_setup_eligible"))
            return { rows: ready ? [{ id: "setup" }] : [] };
          if (sql.startsWith("UPDATE installers"))
            return { rows: [{ id: "shop", slug: "shop" }] };
          return { rows: [] };
        },
      };
    const api = load("app/api/admin/installer-contact/route.ts", {
      "@/lib/admin-auth": { requireAdmin: () => null },
      "@/lib/db": { getPool: () => ({ connect: async () => c }) },
      "@/lib/contact-refresh": { refreshContactPages() {} },
    });
    const r = await api.POST(
      new Request("https://installers.vicrez.com/api/admin/installer-contact", {
        method: "POST",
        headers: {
          origin: "https://installers.vicrez.com",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          id: "shop",
          routing_email: "shop@example.test",
          quote_routing_enabled: enabled,
          public_email: "",
          public_email_approved: false,
          note: "Owner participation has been reviewed",
        }),
      }),
    );
    assert.equal(r.status, expected);
    assert.equal(
      calls.some((s) => s.startsWith("UPDATE installers")),
      expected === 200,
    );
  }
});
