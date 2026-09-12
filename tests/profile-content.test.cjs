const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, file);
const { getProfileDescription, getProfileQuoteNote, getProfileGuide, REVIEWED_PROFILE_SLUGS, serializeJsonLd } = require('../src/lib/profile-content.ts');
const { generateInstallerJsonLd } = require('../src/lib/seo.ts');
const shop = { id: 1, slug: 'b-wraps-las-vegas-nv', business_name: 'B wraps', city: 'Las Vegas', state: 'NV', source: '[New Dealer Form]', status: 'active', install_capabilities: ['Aero/Body Kits', 'Paint/Bodywork'], phone: '555-0100', google_phone: '555-0199', website: 'shop.example', google_website: 'other.example', internal_notes: 'rating: 5' };
test('pilot contains exactly ten unique profiles', () => assert.equal(new Set(REVIEWED_PROFILE_SLUGS).size, 10));
test('description uses recorded services, not assumed wraps or PPF', () => {
  const text = getProfileDescription(shop);
  assert.match(text, /Listed services: Aero\/Body Kits, Paint\/Bodywork/);
  assert.doesNotMatch(text, /PPF|window tint|Wheels/);
});
test('missing capabilities do not create service claims', () => {
  const text = getProfileDescription({ ...shop, install_capabilities: '' });
  assert.match(text, /Contact the shop to confirm/);
  assert.doesNotMatch(text, /body kits|PPF|wheels/);
});
test('legacy delimited capability strings remain supported', () => assert.match(getProfileDescription({ ...shop, install_capabilities: 'Vinyl Wrap;Paint/Bodywork' }), /Vinyl Wrap, Paint\/Bodywork/));
test('quote notes are only shown for eligible pilot dealer-form records', () => {
  assert.match(getProfileQuoteNote(shop), /Charger or Challenger/);
  for (const changed of [{ source: 'public listing' }, { source: 'manual' }, { status: 'removed' }, { status: 'non_us_excluded' }, { slug: 'unknown-shop' }]) assert.equal(getProfileQuoteNote({ ...shop, ...changed }), null);
});
test('guide links are grounded in recorded services', () => {
  assert.equal(getProfileGuide(shop).href, '/guides/how-to-choose-body-kit-installer');
  assert.equal(getProfileGuide({ ...shop, install_capabilities: [] }), null);
  assert.equal(getProfileGuide({ ...shop, install_capabilities: ['Widebody Kits'] }).href, '/guides/widebody-kit-installation-guide');
});
test('schema matches visible description and primary shop contact fields', () => {
  const schema = generateInstallerJsonLd(shop);
  assert.equal(schema.description, getProfileDescription(shop));
  assert.equal(schema.telephone, shop.phone);
  assert.equal(schema.url, 'https://shop.example');
});
test('schema does not fabricate aggregate rating, prices, shop image or parsed hours', () => {
  const schema = generateInstallerJsonLd(shop);
  for (const key of ['aggregateRating', 'priceRange', 'image', 'openingHoursSpecification']) assert.equal(schema[key], undefined);
});
test('schema does not republish third-party Google ratings as our own reviews', () => {
  assert.equal(generateInstallerJsonLd({ ...shop, google_rating: 4.5, google_review_count: 15 }).aggregateRating, undefined);
  assert.equal(generateInstallerJsonLd({ ...shop, google_rating: 7, google_review_count: 15 }).aggregateRating, undefined);
  assert.equal(generateInstallerJsonLd({ ...shop, google_rating: 4.5, google_review_count: 0 }).aggregateRating, undefined);
});
test('JSON-LD serialization cannot close its script element', () => {
  const encoded = serializeJsonLd({ name: '</script><script>alert(1)</script>' });
  assert.ok(!encoded.includes('<'));
  assert.equal(JSON.parse(encoded).name, '</script><script>alert(1)</script>');
});
