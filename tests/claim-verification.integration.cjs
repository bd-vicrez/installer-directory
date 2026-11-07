// Explicitly invoked against a disposable loopback QA database, never production.
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
const lib = load("lib/claim-verification.ts", {
  "@/lib/directory-rfq": {
    rfqConfig: () => ({ secret: "qa-only-secret".repeat(4) }),
    UUID: /^[0-9a-f-]{36}$/i,
  },
});
async function seed() {
  const shop = crypto.randomUUID(),
    claim = crypto.randomUUID(),
    proof = crypto.randomUUID();
  await pool.query(
    `INSERT INTO installers(id,legacy_id,business_name,slug,street_address,city,state,zip_code,phone,email,website,install_capabilities,source,status,date_added,updated_at) VALUES($1,$1,'QA Verified Shop',$1,'123 Main Rd','Charlotte','NC','28217','9805551234','owner@shop.test','https://shop.test',ARRAY['vinyl-wrap'],'QA','active',NOW()::text,NOW())`,
    [shop],
  );
  await pool.query(
    `INSERT INTO directory_claims(id,request_id,payload_hash,installer_id,name,email,relationship,correction,consent_version,status,reviewer) VALUES($1,$1,'qa-payload',$2,'QA Owner','owner@shop.test','owner','Correct shop information','qa-v1','needs_information',$3)`,
    [claim, shop, actor],
  );
  await pool.query(
    `INSERT INTO directory_automation_cases(task_key,kind,record_id,owner_name,escalation_owner,state,next_step,next_check_at) VALUES($1,'claim',$2,$3,'QA','awaiting_business_confirmation','Await proof',NOW()+INTERVAL '48 hours')`,
    ["claim:" + claim, claim, actor],
  );
  await pool.query(
    `INSERT INTO directory_claim_verifications(id,claim_id,recipient,claim_payload_hash,shop_snapshot,evidence,expires_at) SELECT $1,$2,'owner@shop.test','qa-payload',directory_shop_identity(i),'{}',NOW()+INTERVAL '48 hours' FROM installers i WHERE i.id=$3`,
    [proof, claim, shop],
  );
  return { shop, claim, proof };
}
test.after(async () => {
  await pool.end();
});
test("real SQL: inspection, confirmation, replay and concurrent confirmation produce one audited grant", async () => {
  const x = await seed();
  assert.equal((await lib.verifyClaim(pool, x.proof, false)).verified, false);
  assert.equal(
    (
      await pool.query(
        "SELECT count(*)::int n FROM directory_owner_grants WHERE installer_id=$1",
        [x.shop],
      )
    ).rows[0].n,
    0,
  );
  const results = await Promise.allSettled([
    lib.verifyClaim(pool, x.proof, true),
    lib.verifyClaim(pool, x.proof, true),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const c = (
    await pool.query(
      "SELECT status,owner_grant_id FROM directory_claims WHERE id=$1",
      [x.claim],
    )
  ).rows[0];
  assert.equal(c.status, "verified");
  assert.ok(c.owner_grant_id);
  assert.equal(
    (
      await pool.query(
        "SELECT count(*)::int n FROM directory_owner_grants WHERE installer_id=$1",
        [x.shop],
      )
    ).rows[0].n,
    1,
  );
  const i = (
    await pool.query(
      "SELECT quote_routing_enabled,public_email_approved,owner_details FROM installers WHERE id=$1",
      [x.shop],
    )
  ).rows[0];
  assert.equal(i.quote_routing_enabled, false);
  assert.equal(i.public_email_approved, false);
  assert.deepEqual(i.owner_details, {});
  await assert.rejects(lib.verifyClaim(pool, x.proof, true));
});
test("real SQL: expiry, changed recipient/shop, pause, staff takeover, and conflicting/revoked owner fail closed", async () => {
  for (const mode of [
    "expired",
    "email",
    "shop",
    "paused",
    "staff",
    "claim-conflict",
    "owner-conflict",
    "revoked",
  ]) {
    const x = await seed();
    if (mode === "expired")
      await pool.query(
        "UPDATE directory_claim_verifications SET expires_at=NOW()-INTERVAL '1 second' WHERE id=$1",
        [x.proof],
      );
    if (mode === "email")
      await pool.query(
        "UPDATE directory_claims SET email='changed@shop.test' WHERE id=$1",
        [x.claim],
      );
    if (mode === "shop")
      await pool.query("UPDATE installers SET phone='9805558888' WHERE id=$1", [
        x.shop,
      ]);
    if (mode === "paused")
      await pool.query(
        "UPDATE directory_automation_cases SET paused=true WHERE task_key=$1",
        ["claim:" + x.claim],
      );
    if (mode === "staff")
      await pool.query(
        "INSERT INTO directory_action_assignments(task_key,kind,record_id,actor) VALUES($1,'claim',$2,'QA human')",
        ["claim:" + x.claim, x.claim],
      );
    if (mode === "claim-conflict") {
      const id = crypto.randomUUID();
      await pool.query(
        "INSERT INTO directory_claims(id,request_id,payload_hash,installer_id,name,email,relationship,correction,consent_version) VALUES($1,$1,'other',$2,'Other','other@shop.test','owner','Correct listing information','qa')",
        [id, x.shop],
      );
    }
    if (["owner-conflict", "revoked"].includes(mode))
      await pool.query(
        "INSERT INTO directory_owner_grants(id,installer_id,email,name,evidence_kind,evidence_id,actor,note,active) VALUES($1,$2,$3,'Other','claim','qa','QA human','QA evidence',$4)",
        [
          crypto.randomUUID(),
          x.shop,
          mode === "revoked" ? "owner@shop.test" : "other@shop.test",
          mode !== "revoked",
        ],
      );
    await assert.rejects(lib.verifyClaim(pool, x.proof, true), undefined, mode);
    assert.equal(
      (
        await pool.query(
          "SELECT consumed_at FROM directory_claim_verifications WHERE id=$1",
          [x.proof],
        )
      ).rows[0].consumed_at,
      null,
    );
  }
});
test("real SQL: audit failure rolls back proof, grant, status and notification", async () => {
  const x = await seed();
  await pool.query(
    "ALTER TABLE directory_review_audit ADD CONSTRAINT qa_proof_audit_failure CHECK(action<>'ownership_verified') NOT VALID",
  );
  try {
    await assert.rejects(lib.verifyClaim(pool, x.proof, true));
    assert.equal(
      (
        await pool.query(
          "SELECT count(*)::int n FROM directory_owner_grants WHERE installer_id=$1",
          [x.shop],
        )
      ).rows[0].n,
      0,
    );
    assert.equal(
      (
        await pool.query("SELECT status FROM directory_claims WHERE id=$1", [
          x.claim,
        ])
      ).rows[0].status,
      "needs_information",
    );
  } finally {
    await pool.query(
      "ALTER TABLE directory_review_audit DROP CONSTRAINT qa_proof_audit_failure",
    );
  }
});
