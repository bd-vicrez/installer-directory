const test = require('node:test');
const assert = require('node:assert/strict');
const entries = require('../src/lib/consolidated-profiles.json');
const config = require('../next.config');

test('reviewed profile aliases redirect directly to a retained profile with no chains or loops', async () => {
  const redirects = await config.redirects();
  const sources = new Set(entries.map((e) => e.from));
  assert.equal(sources.size, entries.length);
  for (const entry of entries) {
    assert.notEqual(entry.duplicateId, entry.retainedId);
    assert.ok(!sources.has(entry.to), 'aliases must never point to another alias');
    const redirect = redirects.find((r) => r.source === `/installer/${entry.from}`);
    assert.deepEqual(redirect, {source: `/installer/${entry.from}`, destination: `/installer/${entry.to}`, permanent: true});
  }
});
