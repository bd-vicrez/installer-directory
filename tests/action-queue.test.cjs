const test = require("node:test"),
  assert = require("node:assert/strict"),
  load = require("./load-module.cjs"),
  crypto = require("node:crypto");
const { NextRequest } = require("next/server"),
  m = load("lib/action-queue.ts");
const now = Date.parse("2026-09-20T12:00:00Z"),
  created = "2026-09-17T12:00:00Z";
test("queue closes resolved sources but preserves new shop replies and scheduled terminal follow-up", () => {
  const data = {
    applications: [
      {
        id: "1",
        application_id: "APP-1",
        business_name: "Test",
        status: "approved",
        submitted_at: created,
      },
    ],
    inquiries: [
      { submission_id: 1, created_at: created, service: "wrap" },
      {
        submission_id: 2,
        created_at: created,
        service: "wrap",
        last_response_at: "2026-09-20 11:00:00",
      },
      { submission_id: 3, created_at: created, service: "wrap" },
    ],
    followups: [
      { submission_id: 1, state: "booked", updated_at: created },
      { submission_id: 2, state: "declined", updated_at: created },
      {
        submission_id: 3,
        state: "booked",
        updated_at: created,
        next_followup_at: "2026-09-21T12:00:00Z",
      },
    ],
  };
  const items = m.deriveActions(data, now);
  assert.deepEqual(
    Array.from(items, (x) => x.key),
    ["inquiry:2", "inquiry:3"],
  );
  assert.match(items[0].reason, /New shop response/);
  assert.equal(items[0].source_due_at, "2026-09-21T11:00:00.000Z");
  assert.match(items[1].reason, /Scheduled/);
});
test("queue escalates unsent and unanswered inquiries without multiplying a request", () => {
  const items = m.deriveActions(
    {
      inquiries: [
        {
          submission_id: 9,
          created_at: "2026-09-17 12:00:00",
          service: "wrap",
          unanswered_over_48h: 3,
        },
        {
          submission_id: 10,
          created_at: created,
          service: "wrap",
          pending_deliveries: 2,
        },
      ],
    },
    now,
  );
  assert.equal(items.length, 2);
  assert.ok(items.every((x) => x.priority === "urgent"));
  assert.match(items[1].reason, /pending/);
});
test("assignments sort urgent before overdue and do not hide waiting or inactive staff", () => {
  const items = [
    { key: "a", priority: "normal", source_due_at: created },
    { key: "b", priority: "urgent", source_due_at: null },
  ];
  const rows = m.decorateActions(
    items,
    [
      {
        task_key: "a",
        assigned_to: "id",
        display_name: "Former staff",
        assignee_active: false,
        workflow: "waiting",
        due_at: created,
        version: 2,
      },
    ],
    now,
  );
  assert.equal(rows[0].key, "b");
  assert.equal(rows[1].workflow, "waiting");
  assert.equal(rows[1].assignee_active, false);
  assert.equal(rows[1].overdue, true);
});
test("waiting requires a bounded date; staff ids, notes and stale versions are validated", () => {
  const b = {
    kind: "inquiry",
    record_id: "1",
    workflow: "open",
    assigned_to: null,
    version: 0,
    due_at: null,
    note: "Follow up tomorrow",
  };
  assert.equal(m.actionInput(b).key, "inquiry:1");
  for (const patch of [
    { workflow: "done" },
    { workflow: "waiting" },
    { version: -1 },
    { assigned_to: "shared" },
    { note: "x" },
    { due_at: true },
    { due_at: "2040-01-01" },
  ])
    assert.throws(() => m.actionInput({ ...b, ...patch }));
});
test("queue requires authentication and strict same origin before touching sources", async () => {
  const db = {
    query: () => {
      throw Error("No database access allowed");
    },
  };
  const denied = load("app/api/admin/actions/route.ts", {
    "@/lib/db": { getPool: () => db },
    "@/lib/admin-auth": {
      requireAdmin: () => new Response("", { status: 401 }),
    },
  });
  for (const method of ["GET", "PATCH"])
    assert.equal(
      (
        await denied[method](
          new NextRequest("https://example.test/api/admin/actions", { method }),
        )
      ).status,
      401,
    );
  const route = load("app/api/admin/actions/route.ts", {
    "@/lib/db": { getPool: () => db },
    "@/lib/admin-auth": { requireAdmin: () => null },
  });
  assert.equal(
    (
      await route.PATCH(
        new NextRequest("https://example.test/api/admin/actions", {
          method: "PATCH",
          body: "{}",
        }),
      )
    ).status,
    403,
  );
});
test("pilot invitation preserves the reviewed body and refuses contact or candidate changes", async () => {
  const row = {
    id: "notice",
    kind: "pilot",
    recipient: "qa@example.test",
    public_message: "Prepared private invitation.",
    attempts: 1,
  };
  const notices = load(
    "lib/notifications.ts",
    {},
    {
      process: {
        env: {
          DIRECTORY_NOTIFICATIONS_ENABLED: "1",
          SENDGRID_API_KEY: "fixture",
        },
      },
    },
  );
  const valid = {
    recipient: row.recipient,
    email: row.recipient,
    status: "active",
    decision: "candidate",
    subject: notices.PILOT_SUBJECT,
    message_hash: crypto
      .createHash("sha256")
      .update(row.public_message)
      .digest("hex"),
  };
  for (const patch of [
    null,
    { email: "changed@example.test" },
    { decision: "declined" },
    { decision: "active" },
    { message_hash: "tampered" },
    {},
  ]) {
    let calls = 0,
      held = false;
    const db = {
      query: async (sql, v) => {
        if (sql.includes("WITH candidates")) return { rows: [row] };
        if (sql.includes("SELECT o.message_hash"))
          return { rows: patch === null ? [] : [{ ...valid, ...patch }] };
        if (sql.includes("state='held'")) held = true;
        return { rows: [] };
      },
    };
    await notices.processNotifications(db, async (url, opt) => {
      calls++;
      const body = JSON.parse(opt.body);
      assert.equal(body.content[0].value, row.public_message);
      assert.equal(body.subject, notices.PILOT_SUBJECT);
      assert.equal(body.tracking_settings.click_tracking.enable, false);
      return new Response(null, {
        status: 202,
        headers: { "x-message-id": "fixture" },
      });
    });
    assert.equal(calls, patch && Object.keys(patch).length === 0 ? 1 : 0);
    assert.equal(held, calls === 0);
  }
});
