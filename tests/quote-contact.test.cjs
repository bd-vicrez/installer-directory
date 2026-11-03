const test = require('node:test'), assert = require('node:assert/strict');
const load = require('./load-module.cjs');
const {validCustomerEmail, customerReplyHref, quoteSupportHref, QUOTE_SUPPORT_EMAIL} = load('lib/quote-contact.ts');
const {validateQuoteInput} = load('lib/quote-validation.ts');
const sample = {request_id:'11111111-1111-4111-8111-111111111111',customer_name:'Internal QA',customer_phone:'2125550100',vehicle_year:2024,vehicle_make:'Honda',vehicle_model:'Civic',service:'body-kits',what_needed:'Front lip',zip_code:'90001',sharing_consent:true};

test('customer mailto preserves plus tags and reference without adding recipients or headers', () => {
  for (const email of ['customer+project@vicrez.com', "o'brien@example.test", 'a&b@example.test']) {
    assert.equal(validCustomerEmail(email), true);
    assert.equal(validateQuoteInput({...sample,customer_email:email}), null);
    const href = new URL(customerReplyHref(email,'VZ-42'));
    assert.equal(href.protocol,'mailto:');
    assert.equal(decodeURIComponent(href.pathname),email);
    assert.equal(href.searchParams.get('subject'),'Re: Vicrez installation inquiry VZ-42');
    assert.deepEqual([...href.searchParams.keys()],['subject']);
    assert.notEqual(decodeURIComponent(href.pathname),QUOTE_SUPPORT_EMAIL);
  }
  const help = new URL(quoteSupportHref('VZ-42'));
  assert.equal(help.pathname,QUOTE_SUPPORT_EMAIL);
  assert.equal(help.searchParams.get('subject'),'Help with installation inquiry VZ-42');
});

test('form rejects address lists, header injection and malformed reply mailboxes', () => {
  for (const email of ['a,b@example.test','a;b@example.test','a@example.test,b@example.test','a@example.test\r\nBcc: other@example.test','a@example.test?cc=other','a@example.test"','a..b@example.test','.a@example.test','a@-example.test','a@exam_ple.test','Display<a@example.test>']) {
    assert.equal(validCustomerEmail(email),false,email);
    assert.equal(customerReplyHref(email,'VZ-42'),null,email);
    assert.ok(validateQuoteInput({...sample,customer_email:email}),email);
  }
});
