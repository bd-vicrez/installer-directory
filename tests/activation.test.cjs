const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-module.cjs');

test('slow delivery evidence confirms the matching recipient without resending accepted mail', async () => {
  for (const recipient of ['support@vicrez.com', 'someone-else@example.test']) {
    const writes = [];
    const db = { query: async (sql, values) => {
      if (sql.includes('WITH candidates')) return { rows: [] };
      if (sql.includes('SELECT id,provider_id')) return { rows: [{ id: 'notice', provider_id: 'provider-123', recipient: 'support@vicrez.com' }] };
      writes.push({ sql, values }); return { rows: [] };
    } };
    const { processNotifications } = load('lib/notifications.ts', {}, {
      process: { env: { DIRECTORY_NOTIFICATIONS_ENABLED: '1', SENDGRID_API_KEY: 'fixture' } },
      AbortSignal: { timeout: ms => ({ budget: ms }) },
    });
    let lookups = 0;
    await processNotifications(db, async (url, options) => {
      assert.equal(options.method, undefined, 'Accepted mail must not be sent again');
      assert.ok(url.startsWith('https://api.sendgrid.com/v3/messages?'));
      lookups++;
      // Replay the observed provider lookup latency with a virtual timeout.
      if (options.signal.budget < 10520) throw Error('Provider lookup timed out');
      return new Response(JSON.stringify({ messages: [{ msg_id: 'provider-123.filter', to_email: recipient, status: 'delivered' }] }));
    });
    assert.equal(lookups, 1);
    const confirmed = writes.find(x => x.sql.includes("state=CASE WHEN $2='delivered'"));
    assert.ok(confirmed, 'A slow successful lookup must preserve its delivery evidence');
    assert.equal(confirmed.values[1], recipient === 'support@vicrez.com' ? 'delivered' : 'unknown');
  }
});
