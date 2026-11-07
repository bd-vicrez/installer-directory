const test = require("node:test"),
  assert = require("node:assert/strict"),
  load = require("./load-module.cjs");
const { NextRequest } = require("next/server");
const { followupRevision } = load("lib/followup-revision.ts");
const original = {
  submission_id: 41,
  state: "contacted",
  note: "Customer was contacted",
  actor: "Staff A",
  public_message: "Awaiting your reply",
  next_followup_at: null,
  updated_at: "2026-11-07T04:00:00Z",
};
function setup(row = original) {
  const calls = [];
  const client = {
    query: async (sql, values) => {
      calls.push(sql);
      if (sql.includes("FOR UPDATE")) return { rows: row ? [row] : [] };
      return { rows: [] };
    },
    release() {},
  };
  const route = load("app/api/admin/inquiry-followup/route.ts", {
    "@/lib/admin-auth": {
      requireAdmin: async () => null,
      adminIdentity: () => ({ username: "Staff B" }),
    },
    "@/lib/db": { getPool: () => ({ connect: async () => client }) },
    "@/lib/directory-rfq": {
      sameOrigin: () => true,
      rfqFetch: async () =>
        new Response(JSON.stringify({ requests: [{ submission_id: 41 }] })),
    },
  });
  const save = (revision) =>
    route.POST(
      new NextRequest("https://test/api/admin/inquiry-followup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-followup-version": "1",
        },
        body: JSON.stringify({
          submission_id: 41,
          state: "quoted",
          note: "Confirmed installation estimate",
          public_message: "Your estimate is ready",
          revision,
        }),
      }),
    );
  return { save, calls };
}
test("stale staff save is rejected under lock before writes, preserving private/public notes", async () => {
  const { save, calls } = setup({
    ...original,
    note: "Newer evidence from Staff A",
  });
  const r = await save(followupRevision(original));
  assert.equal(r.status, 409);
  assert(calls.includes("ROLLBACK"));
  assert(!calls.some((s) => s.startsWith("INSERT") || s.startsWith("UPDATE")));
  assert(
    calls.findIndex((s) => s.includes("pg_advisory_xact_lock")) <
      calls.findIndex((s) => s.includes("FOR UPDATE")),
  );
});
test("matching revision can save and missing revision fails closed", async () => {
  const current = setup();
  assert.equal((await current.save(followupRevision(original))).status, 200);
  assert(current.calls.includes("COMMIT"));
  const missing = setup();
  assert.equal((await missing.save(undefined)).status, 409);
  assert.equal(missing.calls.length, 0);
});
test("first-save race rejects absent revision once another staff member created the record", async () => {
  const exists = setup();
  assert.equal((await exists.save("absent")).status, 409);
  const empty = setup(null);
  assert.equal((await empty.save("absent")).status, 200);
});
test("every editable follow-up field affects its revision", () => {
  for (const patch of [
    { state: "booked" },
    { note: "New note" },
    { actor: "Another staff member" },
    { public_message: "New public update" },
    { next_followup_at: "2026-11-09T00:00:00Z" },
  ])
    assert.notEqual(
      followupRevision(original),
      followupRevision({ ...original, ...patch }),
    );
});
test("workspace enforces auth and allowlisted filters without backend work", async () => {
  let called = false;
  const denied = load("app/api/admin/inquiry-workspace/route.ts", {
    "@/lib/admin-auth": {
      requireAdmin: async () => new Response("", { status: 401 }),
    },
    "@/lib/directory-rfq": {
      rfqFetch: async () => {
        called = true;
      },
    },
  });
  assert.equal(
    (
      await denied.GET(
        new NextRequest("https://test/api/admin/inquiry-workspace"),
      )
    ).status,
    401,
  );
  assert.equal(called, false);
  const route = load("app/api/admin/inquiry-workspace/route.ts", {
    "@/lib/admin-auth": { requireAdmin: async () => null },
    "@/lib/directory-rfq": {
      rfqFetch: async () => {
        called = true;
        throw Error();
      },
    },
  });
  for (const query of [
    "scope=all&scope=held",
    "secret=1",
    "id=" + "1".repeat(40),
  ])
    assert.equal(
      (
        await route.GET(
          new NextRequest("https://test/api/admin/inquiry-workspace?" + query),
        )
      ).status,
      400,
    );
  assert.equal(called, false);
  const failed = await route.GET(
    new NextRequest("https://test/api/admin/inquiry-workspace?scope=all"),
  );
  assert.equal(failed.status, 503);
  assert.equal(failed.headers.get("cache-control"), "private, no-store");
});
