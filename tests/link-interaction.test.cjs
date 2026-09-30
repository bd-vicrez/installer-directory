const test = require("node:test"), assert = require("node:assert/strict");
const load = require("./load-module.cjs");

test("outbound attribution covers pointer, keyboard and context-menu actions without scanning the page", () => {
  const listeners = new Map();
  let cleanup;
  class Element {
    constructor(href) { this.href = href; this.textContent = "Wholesale"; this.writes = 0; }
    closest() { return this; }
    getAttribute() { return this.href; }
    setAttribute(_name, value) { this.href = value; this.writes++; }
  }
  const document = {
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: (name, fn) => {
      assert.equal(listeners.get(name), fn);
      listeners.delete(name);
    },
    querySelectorAll: () => { throw Error("No page-wide scan needed"); },
  };
  const component = load("components/UtmLinkAppender.tsx", {
    react: { useEffect: (fn) => { cleanup = fn(); } },
    "next/navigation": { usePathname: () => "/for-shops" },
  }, { document, Element });
  component.default();
  for (const action of ["pointerdown", "focusin", "contextmenu", "click", "auxclick"]) {
    // Each link represents content inserted after mount.
    const link = new Element("https://b2b.vicrez.com/path?utm_campaign=owned#apply");
    assert.equal(link.writes, 0);
    listeners.get(action)({ target: link });
    const url = new URL(link.href);
    assert.equal(url.searchParams.get("utm_source"), "installers");
    assert.equal(url.searchParams.get("utm_medium"), "for-shops");
    assert.equal(url.searchParams.get("utm_campaign"), "owned");
    assert.equal(url.hash, "#apply");
    listeners.get("click")({ target: link });
    assert.equal(link.writes, 1);
  }
  for (const href of ["/apply", "tel:5551234567", "https://b2b.vicrez.com.evil.test"]) {
    const link = new Element(href);
    listeners.get("click")({ target: link });
    assert.equal(link.href, href);
    assert.equal(link.writes, 0);
  }
  cleanup();
  assert.equal(listeners.size, 0);
});
