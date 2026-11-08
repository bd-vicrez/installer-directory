// Real schema, explicitly disposable database only. All mail uses a recording transport.
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  crypto = require("node:crypto"),
  { Pool } = require("pg"),
  load = require("./load-module.cjs");
const cfg = JSON.parse(
  fs.readFileSync(process.env.INSTALLER_QA_CONFIG, "utf8"),
);
assert.equal(cfg.host, "127.0.0.1");
assert.equal(cfg.dbname, "installer_agent_qa");
const pool = new Pool({ ...cfg, database: cfg.dbname }),
  actor = "Vicrez Installer Agent (AI)";
const mocks = {
  "@/lib/directory-rfq": {
    rfqConfig: () => ({ secret: "qa-secret".repeat(8) }),
    UUID: /^[0-9a-f-]{36}$/i,
    withinRateLimit: async () => true,
  },
};
const recovery = load("lib/claim-recovery.ts", mocks),
  proof = load("lib/claim-verification.ts", mocks),
  setup = load("lib/owner-quote-setup.ts", mocks),
  listing = load("lib/listing-freshness.ts");
async function seed() {
  const s = crypto.randomUUID(),
    c = crypto.randomUUID(),
    v = crypto.randomUUID();
  await pool.query(
    `INSERT INTO installers(id,legacy_id,business_name,slug,street_address,city,state,zip_code,phone,email,website,install_capabilities,source,status,date_added,updated_at) VALUES($1,$1,'QA Recovery Shop',$1,'123 Main Rd','Charlotte','NC','28217','9805551234','owner@shop.test','https://shop.test',ARRAY['vinyl-wrap'],'QA','active',NOW()::text,NOW())`,
    [s],
  );
  await pool.query(
    `INSERT INTO directory_claims(id,request_id,payload_hash,installer_id,name,email,relationship,correction,consent_version,status,reviewer) VALUES($1,$1,'qa-payload',$2,'QA Owner','owner@shop.test','owner','Correct shop information','qa-v1','needs_information',$3)`,
    [c, s, actor],
  );
  await pool.query(
    `INSERT INTO directory_automation_cases(task_key,kind,record_id,owner_name,escalation_owner,state,next_step,next_check_at,evidence,paused) VALUES($1,'claim',$2,$3,'QA','staff_attention','Needs proof',NOW(),' {"decision":{"reason":"proof_expired_or_request_changed"}}',true)`,
    ["claim:" + c, c, actor],
  );
  await pool.query(
    `INSERT INTO directory_claim_verifications(id,claim_id,recipient,claim_payload_hash,shop_snapshot,evidence,expires_at,cancelled_at) SELECT $1,$2,'owner@shop.test','qa-payload',directory_shop_identity(i),'{}',NOW()-INTERVAL '1 hour',NOW() FROM installers i WHERE i.id=$3`,
    [v, c, s],
  );
  return { s, c, v };
}
async function recover(x, id = crypto.randomUUID(), kind = "renewal") {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query("SELECT pg_advisory_xact_lock(19313,hashtext($1))", [
      "claim:" + x.c,
    ]);
    await c.query("SELECT id FROM directory_claims WHERE id=$1 FOR UPDATE", [
      x.c,
    ]);
    const r = await recovery.requestClaimRecovery(c, x.c, id, kind);
    await c.query("COMMIT");
    return r;
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}
test.after(() => pool.end());
// These two singleton monitor fixtures must start fresh on each disposable-QA run.
test.before(async () => {
  await pool.query(
    "DELETE FROM directory_notifications WHERE starts_with(event_key,'verification-watchdog:')",
  );
  await pool.query("DELETE FROM directory_verification_incidents");
  await pool.query(
    "DELETE FROM directory_operation_runs WHERE name IN ('installer-verification','verification-watchdog')",
  );
});
test("real SQL: expired proof renewal is idempotent, preserves history and cannot grant access", async () => {
  const x = await seed(),
    id = crypto.randomUUID();
  assert.deepEqual(await Promise.all([recover(x, id), recover(x, id)]), [
    true,
    true,
  ]);
  const a = (
    await pool.query(
      "SELECT state,paused FROM directory_automation_cases WHERE task_key=$1",
      ["claim:" + x.c],
    )
  ).rows[0];
  assert.equal(a.state, "recovery_requested");
  assert.equal(a.paused, false);
  assert.equal(
    (
      await pool.query(
        "SELECT count(*)::int n FROM directory_claim_recovery_requests WHERE claim_id=$1",
        [x.c],
      )
    ).rows[0].n,
    1,
  );
  await assert.rejects(proof.verifyClaim(pool, x.v, true));
  assert.equal(
    (
      await pool.query(
        "SELECT count(*)::int n FROM directory_owner_grants WHERE installer_id=$1",
        [x.s],
      )
    ).rows[0].n,
    0,
  );
  await assert.rejects(recover(x));
});
test("real SQL: staff takeover, conflicting and revoked grants block recovery", async () => {
  for (const mode of ["staff", "conflict", "revoked", "agency"]) {
    const x = await seed();
    if (mode === "staff")
      await pool.query(
        "INSERT INTO directory_action_assignments(task_key,kind,record_id,actor) VALUES($1,'claim',$2,'Human reviewer')",
        ["claim:" + x.c, x.c],
      );
    if (mode === "agency")
      await pool.query(
        "UPDATE directory_claims SET relationship='marketing agency' WHERE id=$1",
        [x.c],
      );
    if (["conflict", "revoked"].includes(mode))
      await pool.query(
        `INSERT INTO directory_owner_grants(id,installer_id,email,name,evidence_kind,evidence_id,actor,note,active) VALUES($1,$2,$3,'QA','claim',$4,'QA','QA only',$5)`,
        [
          crypto.randomUUID(),
          x.s,
          mode === "conflict" ? "different@shop.test" : "owner@shop.test",
          x.c,
          mode !== "revoked",
        ],
      );
    await assert.rejects(recover(x));
    assert.equal(
      (
        await pool.query(
          "SELECT count(*)::int n FROM directory_claim_recovery_requests WHERE claim_id=$1",
          [x.c],
        )
      ).rows[0].n,
      0,
    );
  }
});
test("real SQL: supplied information only requeues eligible automated holds", async () => {
  const x = await seed();
  await pool.query(
    "DELETE FROM directory_claim_verifications WHERE claim_id=$1",
    [x.c],
  );
  await pool.query(
    `UPDATE directory_automation_cases SET evidence='{"decision":{"reason":"business_contact_not_corroborated"}}' WHERE task_key=$1`,
    ["claim:" + x.c],
  );
  assert.equal(await recover(x, crypto.randomUUID(), "information"), true);
  const y = await seed();
  await pool.query(
    `UPDATE directory_automation_cases SET evidence='{"decision":{"reason":"ownership_conflict"}}' WHERE task_key=$1`,
    ["claim:" + y.c],
  );
  assert.equal(await recover(y, crypto.randomUUID(), "information"), false);
});
test("real SQL: audit failure rolls back recovery, proof cancellation and queue changes", async () => {
  const x = await seed();
  await pool.query(
    `CREATE FUNCTION qa_fail_recovery() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.record_id='${x.c}' AND NEW.action='verification_recovery_requested' THEN RAISE EXCEPTION 'QA failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER qa_fail_recovery BEFORE INSERT ON directory_review_audit FOR EACH ROW EXECUTE FUNCTION qa_fail_recovery()`,
  );
  try {
    await assert.rejects(recover(x));
    assert.equal(
      (
        await pool.query(
          "SELECT state FROM directory_automation_cases WHERE task_key=$1",
          ["claim:" + x.c],
        )
      ).rows[0].state,
      "staff_attention",
    );
    assert.equal(
      (
        await pool.query(
          "SELECT count(*)::int n FROM directory_claim_recovery_requests WHERE claim_id=$1",
          [x.c],
        )
      ).rows[0].n,
      0,
    );
  } finally {
    await pool.query(
      "DROP TRIGGER qa_fail_recovery ON directory_review_audit; DROP FUNCTION qa_fail_recovery()",
    );
  }
});
async function ownerSeed() {
  const x = await seed(),
    id = crypto.randomUUID();
  await pool.query(
    `INSERT INTO directory_owner_grants(id,installer_id,email,name,evidence_kind,evidence_id,actor,note) VALUES($1,$2,'owner@shop.test','QA','claim',$3,'QA','QA only')`,
    [id, x.s, x.c],
  );
  return {
    ...x,
    owner: { id, installer_id: x.s, email: "owner@shop.test", version: 1 },
  };
}
async function startSetup(x) {
  const shop = (await pool.query("SELECT * FROM installers WHERE id=$1", [x.s]))
      .rows[0],
    id = crypto.randomUUID(),
    b = {
      request_id: id,
      snapshot_hash: listing.listingHash(shop),
      confirm_services: true,
      confirm_participation: true,
      confirm_test: true,
    };
  await setup.requestQuoteSetup(pool, x.owner, b);
  return { id, b };
}
test("real SQL: setup opt-in and receipt confirmation are idempotent and never enable routing", async () => {
  const x = await ownerSeed(),
    { id, b } = await startSetup(x);
  await setup.requestQuoteSetup(pool, x.owner, b);
  assert.equal(
    (
      await pool.query(
        "SELECT count(*)::int n FROM directory_notifications WHERE event_key=$1",
        ["owner-setup:" + id],
      )
    ).rows[0].n,
    1,
  );
  assert.equal(
    (await setup.confirmQuoteSetup(pool, id, false)).confirmed,
    false,
  );
  const results = await Promise.allSettled([
    setup.confirmQuoteSetup(pool, id, true),
    setup.confirmQuoteSetup(pool, id, true),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(
    (
      await pool.query("SELECT directory_quote_setup_eligible($1,true) ok", [
        id,
      ])
    ).rows[0].ok,
    true,
  );
  assert.equal(
    (
      await pool.query(
        "SELECT quote_routing_enabled FROM installers WHERE id=$1",
        [x.s],
      )
    ).rows[0].quote_routing_enabled,
    false,
  );
  assert.equal(
    (
      await pool.query(
        "SELECT decision FROM directory_shop_pilot WHERE installer_id=$1",
        [x.s],
      )
    ).rows[0].decision,
    "candidate",
  );
});
test("real SQL: revoked owner, changed shop, pause, expiry and recipient changes block setup proof", async () => {
  for (const mode of [
    "revoked",
    "changed",
    "paused",
    "expired",
    "recipient",
    "staff_hold",
  ]) {
    const x = await ownerSeed(),
      { id } = await startSetup(x);
    if (mode === "revoked")
      await pool.query(
        "UPDATE directory_owner_grants SET active=false WHERE id=$1",
        [x.owner.id],
      );
    if (mode === "changed")
      await pool.query(
        "UPDATE installers SET street_address='456 Changed St' WHERE id=$1",
        [x.s],
      );
    if (mode === "paused")
      await pool.query(
        "UPDATE installers SET owner_inquiry_paused=true WHERE id=$1",
        [x.s],
      );
    if (mode === "expired")
      await pool.query(
        "UPDATE directory_owner_quote_setup SET expires_at=NOW()-INTERVAL '1 hour' WHERE id=$1",
        [id],
      );
    if (mode === "recipient")
      await pool.query(
        "UPDATE directory_owner_grants SET email='different@shop.test' WHERE id=$1",
        [x.owner.id],
      );
    if (mode === "staff_hold")
      await pool.query(
        "INSERT INTO directory_shop_pilot(installer_id,decision) VALUES($1,'paused')",
        [x.s],
      );
    await assert.rejects(
      setup.confirmQuoteSetup(pool, id, true),
      undefined,
      mode,
    );
  }
});
test("real SQL: an existing participation hold blocks requested tests and stays unchanged", async () => {
  const x = await ownerSeed();
  await pool.query(
    "INSERT INTO directory_shop_pilot(installer_id,decision,reviewer) VALUES($1,'paused','SEO reviewer')",
    [x.s],
  );
  await assert.rejects(startSetup(x));
  assert.equal(
    (
      await pool.query(
        "SELECT count(*)::int n FROM directory_owner_quote_setup WHERE installer_id=$1",
        [x.s],
      )
    ).rows[0].n,
    0,
  );
  assert.equal(
    (
      await pool.query(
        "SELECT reviewer FROM directory_shop_pilot WHERE installer_id=$1",
        [x.s],
      )
    ).rows[0].reviewer,
    "SEO reviewer",
  );
});
test("real SQL: setup audit failure rolls back receipt confirmation", async () => {
  const x = await ownerSeed(),
    { id } = await startSetup(x);
  await pool.query(
    `CREATE FUNCTION qa_fail_setup() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.record_id='${x.s}' AND NEW.action='delivery_test_confirmed' THEN RAISE EXCEPTION 'QA failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER qa_fail_setup BEFORE INSERT ON directory_review_audit FOR EACH ROW EXECUTE FUNCTION qa_fail_setup()`,
  );
  try {
    await assert.rejects(setup.confirmQuoteSetup(pool, id, true));
    assert.equal(
      (
        await pool.query(
          "SELECT confirmed_at FROM directory_owner_quote_setup WHERE id=$1",
          [id],
        )
      ).rows[0].confirmed_at,
      null,
    );
  } finally {
    await pool.query(
      "DROP TRIGGER qa_fail_setup ON directory_review_audit; DROP FUNCTION qa_fail_setup()",
    );
  }
});
test("real SQL: independent watchdog sends one outage and one recovery, no customer notices", async () => {
  const old = { ...process.env };
  Object.assign(process.env, {
    DIRECTORY_VERIFICATION_WATCHDOG_ENABLED: "1",
    DIRECTORY_NOTIFICATIONS_ENABLED: "1",
    SENDGRID_API_KEY: "qa-only",
    DIRECTORY_STAFF_ALERT_EMAILS: "qa@vicrez.com",
  });
  const w = load("lib/verification-watchdog.ts", mocks),
    sends = [];
  const transport = async (url, opts) => {
    sends.push(JSON.parse(opts.body));
    return new Response(null, {
      status: 202,
      headers: { "x-message-id": "qa-message" },
    });
  };
  try {
    await pool.query(
      "INSERT INTO directory_operation_runs(name,ok,checked_at,details) VALUES('installer-verification',true,NOW()-INTERVAL '3 hours','{}') ON CONFLICT(name) DO UPDATE SET checked_at=EXCLUDED.checked_at,ok=true",
    );
    await Promise.all([
      w.checkVerificationWatchdog(pool, transport),
      w.checkVerificationWatchdog(pool, transport),
    ]);
    await w.checkVerificationWatchdog(pool, transport);
    assert.equal(sends.length, 1);
    assert.match(sends[0].subject, /outage/i);
    assert.equal(sends[0].reply_to.email, "b2bsupport@vicrezcom.zendesk.com");
    await pool.query(
      "UPDATE directory_operation_runs SET checked_at=NOW(),ok=true WHERE name='installer-verification'",
    );
    await w.checkVerificationWatchdog(pool, transport);
    await w.checkVerificationWatchdog(pool, transport);
    assert.equal(sends.length, 2);
    assert.match(sends[1].subject, /recovered/i);
    assert.ok(
      sends.every((x) => x.personalizations[0].to[0].email === "qa@vicrez.com"),
    );
    assert.ok(sends.every((x) => !x.mail_settings?.bypass_list_management));
  } finally {
    for (const k of [
      "DIRECTORY_VERIFICATION_WATCHDOG_ENABLED",
      "DIRECTORY_NOTIFICATIONS_ENABLED",
      "SENDGRID_API_KEY",
      "DIRECTORY_STAFF_ALERT_EMAILS",
    ])
      if (k in old) process.env[k] = old[k];
      else delete process.env[k];
  }
});
test("real SQL: metrics separate mailbox delivery, explicit confirmation and held work", async () => {
  const metrics = load("lib/verification-metrics.ts").verificationMetrics;
  const before = await metrics(pool);
  const previous = before.queue.find((x) => x.kind === "claim");
  const fresh = await seed();
  const m = await metrics(pool);
  assert.ok(m.queue.some((x) => x.kind === "claim"));
  const current = m.queue.find((x) => x.kind === "claim");
  assert.equal(current.open, previous.open + 1);
  assert.equal(current.awaiting_information, previous.awaiting_information + 1);
  assert.equal(current.held, previous.held + 1);
  await recover(fresh);
  const recovered = (await metrics(pool)).queue.find((x) => x.kind === "claim");
  assert.equal(recovered.open, current.open);
  assert.equal(recovered.awaiting_information, current.awaiting_information);
  assert.equal(recovered.held, current.held - 1);
  assert.equal(recovered.recovery_requested, current.recovery_requested + 1);
  assert.ok(Array.isArray(m.delivery_30d));
  assert.equal(typeof m.attempts_used_utc_day, "number");
  assert.equal(m.watchdog.ok, true);
});
test("real SQL: uncertain watchdog sends stay held instead of duplicating an outage message", async () => {
  const old = { ...process.env };
  Object.assign(process.env, {
    DIRECTORY_VERIFICATION_WATCHDOG_ENABLED: "1",
    DIRECTORY_NOTIFICATIONS_ENABLED: "1",
    SENDGRID_API_KEY: "qa-only",
    DIRECTORY_STAFF_ALERT_EMAILS: "qa@vicrez.com",
  });
  try {
    const w = load("lib/verification-watchdog.ts", mocks);
    let sent = 0;
    await pool.query(
      "UPDATE directory_operation_runs SET checked_at=NOW()-INTERVAL '3 hours' WHERE name='installer-verification'",
    );
    const transport = async () => {
      sent++;
      throw new Error("Timeout after possible acceptance");
    };
    const first = await w.checkVerificationWatchdog(pool, transport);
    assert.equal(first.alert_delivery_attention, 1);
    await w.checkVerificationWatchdog(pool, transport);
    assert.equal(sent, 1);
  } finally {
    for (const k of [
      "DIRECTORY_VERIFICATION_WATCHDOG_ENABLED",
      "DIRECTORY_NOTIFICATIONS_ENABLED",
      "SENDGRID_API_KEY",
      "DIRECTORY_STAFF_ALERT_EMAILS",
    ])
      if (k in old) process.env[k] = old[k];
      else delete process.env[k];
  }
});
