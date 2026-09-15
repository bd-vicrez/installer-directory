const test = require("node:test"),
  assert = require("node:assert/strict"),
  load = require("./load-module.cjs"),
  { NextRequest } = require("next/server");

test("rendered analytics initializer executes and excludes private status fragments", () => {
  const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
  const source = fs.readFileSync(path.join(__dirname, "../src/components/GoogleAnalytics.tsx"), "utf8");
  const template = source.match(/\{`(window\.dataLayer[\s\S]*?)`\}/)[1];
  const script = vm.runInNewContext("`" + template + "`", { id: "G-QATEST" });
  for (const pathname of ["/", "/request-status", "/admin/applications"]) {
    const context = {
      location: { origin: "https://example.test", pathname, search: "", hash: "#private-status-token" },
    };
    context.window = context;
    vm.runInNewContext(script, context);
    const config = context.dataLayer.find((event) => event[0] === "config");
    assert.equal(config[1], "G-QATEST");
    assert.equal(config[2].send_page_view, pathname === "/");
    assert.equal(config[2].page_location, "https://example.test" + pathname);
    assert.equal(JSON.stringify(context.dataLayer).includes("private-status-token"), false);
  }
});
test("attribution preserves explicit campaign values and rejects lookalike domains", () => {
  const { attributedLink } = load("lib/attribution.ts");
  const original = "https://b2b.vicrez.com/path?utm_campaign=owned#apply";
  const u = new URL(attributedLink(original, "/for-shops", "Wholesale"));
  assert.equal(u.searchParams.get("utm_campaign"), "owned");
  assert.equal(u.searchParams.get("utm_source"), "installers");
  assert.equal(u.hash, "#apply");
  for (const url of [
    "https://b2b.vicrez.com.evil.test",
    "https://installers.vicrez.com",
    "mailto:qa@example.test",
    "/claim",
  ])
    assert.equal(attributedLink(url, "/", "test"), url);
});
test("search validates ordering and preserves legacy service URLs", () => {
  const { readSearchOptions } = load("lib/public-installers.ts");
  assert.equal(
    readSearchOptions(new URLSearchParams("service=Wheels%2FTires")).service,
    "wheels-tires",
  );
  assert.equal(
    readSearchOptions(
      new URLSearchParams("service=window-tint&inquiry=1&sort=nearest"),
    ).sort,
    "nearest",
  );
  for (const q of ["sort=ads", "inquiry=true"])
    assert.throws(() => readSearchOptions(new URLSearchParams(q)));
});
test("all onboarding review and data endpoints reject unauthenticated mutations", async () => {
  const denied = { requireAdmin: () => new Response("{}", { status: 401 }) };
  for (const [file, method] of [
    ["app/api/applications/[id]/route.ts", "PATCH"],
    ["app/api/admin/claims/route.ts", "PATCH"],
    ["app/api/admin/data-review/route.ts", "PATCH"],
    ["app/api/admin/installers/[id]/route.ts", "PUT"],
    ["app/api/admin/installers/bulk/route.ts", "PUT"],
  ]) {
    let accessed = false;
    const route = load(file, {
      "@/lib/admin-auth": denied,
      "@/lib/db": {
        getPool: () => {
          accessed = true;
          throw Error("must not read");
        },
      },
    });
    const response = await route[method](
      new NextRequest("https://example.test/api/test", {
        method: "PATCH",
        body: "{}",
      }),
      { params: Promise.resolve({ id: "1" }) },
    );
    assert.equal(response.status, 401);
    assert.equal(accessed, false);
  }
});
test("private status signatures expire and cannot be altered or substituted with record IDs", () => {
  const { statusToken, readStatusToken } = load("lib/onboarding.ts", {
    "@/lib/directory-rfq": {
      UUID: /^[0-9a-f-]{36}$/,
      rfqConfig: () => ({ secret: "fixture-secret".repeat(4) }),
    },
  });
  const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const token = statusToken("application", id, new Date());
  assert.equal(readStatusToken(token).id, id);
  for (const bad of [
    id,
    token + "x",
    statusToken("application", id, "2020-01-01"),
  ])
    assert.throws(() => readStatusToken(bad));
});
test("claim form rejects invalid boolean agreement without saving or granting access", async () => {
  let wrote = false;
  const route = load("app/api/claims/route.ts", {
    "@/lib/directory-rfq": {
      UUID: /^[0-9a-f-]{36}$/,
      sameOrigin: () => true,
      withinRateLimit: async () => true,
    },
    "@/lib/db": {
      getPool: () => {
        wrote = true;
        throw 0;
      },
    },
  });
  const r = await route.POST(
    new Request("https://example.test/api/claims", {
      method: "POST",
      body: JSON.stringify({ agreement: "true", request_id: "a".repeat(36) }),
    }),
  );
  assert.equal(r.status, 400);
  assert.equal(wrote, false);
});
test("new private ownership and provenance fields never enter public search payloads", () => {
  const { toPublicInstaller } = load("lib/public-installers.ts");
  const publicData = toPublicInstaller({
    owner_details: { email: "private@example.test" },
    location_evidence: { private: "evidence" },
    service_source: "internal",
    owner_details_confirmed_at: "2026-09-15",
    reviewer: "private",
  });
  for (const k of [
    "owner_details",
    "location_evidence",
    "service_source",
    "reviewer",
    "owner_details_confirmed_at",
  ])
    assert.equal(k in publicData, false);
});
