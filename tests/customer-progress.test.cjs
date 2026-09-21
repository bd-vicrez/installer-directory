const test = require("node:test"),
  assert = require("node:assert/strict"),
  load = require("./load-module.cjs"),
  { NextRequest } = require("next/server");
const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
test("project links are restricted to Vicrez and lose tracking parameters", () => {
  const { projectBrief } = load("lib/project-brief.ts");
  assert.equal(
    projectBrief({
      product_url: "https://www.vicrez.com/a-part?email=private#extra",
    }).product_url,
    "https://www.vicrez.com/a-part",
  );
  for (const url of [
    "http://www.vicrez.com/a",
    "https://vicrez.com.evil.test/a",
    "https://user:pass@vicrez.com/a",
    "https://vicrez.com:8443/a",
    "javascript:alert(1)",
  ])
    assert.throws(() => projectBrief({ product_url: url }));
  assert.throws(() => projectBrief({ tire_size: "x".repeat(81) }));
});
test("completed projects need supported services, past dates, meaningful descriptions and real photo identifiers", () => {
  const { projectExamples, ownerDetails } = load("lib/onboarding.ts");
  const p = {
    vehicle: "2020 Dodge Charger",
    summary: "Installed and test fitted the owner-supplied front splitter.",
    service: "body-kits",
    completed_month: "2026-01",
    photo_id: id,
  };
  assert.equal(projectExamples([p])[0].vehicle, p.vehicle);
  for (const patch of [
    { summary: "Short" },
    { completed_month: "2099-01" },
    { completed_month: "2026-13" },
    { photo_id: "url" },
    { service: "invented" },
  ])
    assert.throws(() => projectExamples([{ ...p, ...patch }]));
  assert.equal(
    ownerDetails({ projects: [p] }).projects,
    undefined,
    "Public applications cannot bypass owner project/photo review",
  );
});
test("owner freshness expires after ninety days and invalidates when confirmed details change", () => {
  const f = load("lib/listing-freshness.ts"),
    row = {
      id: "shop",
      business_name: "Fixture",
      install_capabilities: ["wrap"],
      owner_reconfirmed_at: "2026-01-01T00:00:00Z",
      owner_details: { hours_note: "By appointment" },
    };
  row.owner_reconfirmation_hash = f.listingHash(row);
  assert.equal(f.listingFreshness(row, Date.parse("2026-02-01")).current, true);
  assert.equal(
    f.listingFreshness(row, Date.parse("2026-05-01")).current,
    false,
  );
  assert.equal(
    f.listingFreshness(
      { ...row, owner_details: { hours_note: "Closed" } },
      Date.parse("2026-02-01"),
    ).current,
    false,
  );
  assert.equal(
    f.listingHash({ ...row, private_note: "secret" }),
    row.owner_reconfirmation_hash,
  );
});
test("withdrawn customer inquiries leave queue; alternative requests and 72-hour escalation are urgent", () => {
  const { deriveActions } = load("lib/action-queue.ts");
  const item = { created_at: "2026-01-01 00:00:00", service: "wrap" };
  const rows = deriveActions({
    inquiries: [
      { ...item, submission_id: 1, customer_state: "withdrawn" },
      {
        ...item,
        submission_id: 2,
        customer_state: "alternative_requested",
        customer_action_at: "2026-01-04 00:00:00",
      },
      { ...item, submission_id: 3, escalation_due: 1 },
    ],
  });
  assert.equal(rows.length, 2);
  assert.match(rows[0].reason, /another shop/);
  assert.match(rows[1].reason, /72 elapsed/);
  assert.ok(rows.every((r) => r.priority === "urgent"));
});
test("progress and project endpoints reject missing origins before processing private material", async () => {
  for (const file of [
    "app/api/inquiry-progress/route.ts",
    "app/api/inquiry-project/route.ts",
  ]) {
    let called = false;
    const m = load(file, {
      "@/lib/directory-rfq": {
        rfqFetch: () => {
          called = true;
          throw Error();
        },
      },
    });
    assert.equal(
      (
        await m.POST(
          new NextRequest("https://example.test/api", {
            method: "POST",
            body: "{}",
          }),
        )
      ).status,
      403,
    );
    assert.equal(called, false);
  }
});
test("staff-only photo scope and reminder requests require staff authentication", async () => {
  const denied = { requireAdmin: () => new Response("", { status: 401 }) };
  const m = load("app/api/inquiry-project/route.ts", {
    "@/lib/admin-auth": denied,
  });
  assert.equal(
    (
      await m.POST(
        new NextRequest("https://example.test/api", {
          method: "POST",
          headers: { Origin: "https://example.test" },
          body: JSON.stringify({
            scope: "staff",
            action: "list",
            submission_id: 1,
          }),
        }),
      )
    ).status,
    401,
  );
  const r = load("app/api/admin/inquiry-reminder/route.ts", {
    "@/lib/admin-auth": denied,
  });
  assert.equal(
    (
      await r.POST(
        new NextRequest("https://example.test/api", {
          method: "POST",
          body: "{}",
        }),
      )
    ).status,
    401,
  );
});
test("reminder delivery rechecks response eligibility and final staff outcomes before contacting provider", async () => {
  for (const mode of ["closed", "booked", "changed", "eligible"]) {
    let sends = 0,
      expired = false;
    const m = load(
      "lib/notifications.ts",
      {
        "@/lib/directory-rfq": {
          rfqFetch: async () =>
            new Response(
              JSON.stringify(
                mode === "closed"
                  ? { detail: "Closed" }
                  : {
                      recipient:
                        mode === "changed"
                          ? "different@example.test"
                          : "shop@example.test",
                      submission_id: 1,
                      url: "https://installers.vicrez.com/shop-response#private-fixture",
                    },
              ),
              { status: mode === "closed" ? 409 : 200 },
            ),
        },
      },
      {
        process: {
          env: {
            DIRECTORY_NOTIFICATIONS_ENABLED: "1",
            SENDGRID_API_KEY: "fake",
          },
        },
      },
    );
    const db = {
      query: async (sql) => {
        if (sql.includes("WITH candidates"))
          return {
            rows: [
              {
                id,
                record_id: id,
                kind: "inquiry-reminder",
                recipient: "shop@example.test",
                reference: "VZ-1",
                attempts: 1,
              },
            ],
          };
        if (sql.includes("SELECT state FROM directory_inquiry_followup"))
          return { rows: mode === "booked" ? [{ state: "booked" }] : [] };
        if (sql.includes("state='expired'")) expired = true;
        return { rows: [] };
      },
    };
    await m.processNotifications(db, async (url, o) => {
      sends++;
      const msg = JSON.parse(o.body);
      assert.match(msg.subject, /Reminder/);
      assert.match(msg.content[0].value, /shop-response#private-fixture/);
      assert.equal(msg.tracking_settings.click_tracking.enable, false);
      return new Response(null, { status: 202 });
    });
    assert.equal(sends, mode === "eligible" ? 1 : 0);
    assert.equal(expired, mode !== "eligible");
  }
});
