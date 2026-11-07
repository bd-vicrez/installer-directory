const test=require('node:test'),assert=require('node:assert/strict'),load=require('./load-module.cjs');
const job='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
function fixture(data) {
  const keys=new Set(),calls=[];
  const db={query:async(sql,args)=>{
    calls.push({sql,args});
    if(sql.startsWith('SELECT event_key'))return {rows:[...keys].map(event_key=>({event_key}))};
    if(sql.includes('INSERT INTO directory_notifications')){
      if(keys.has(args[0]))return {rows:[]};
      keys.add(args[0]);return {rows:[{id:keys.size}]};
    }
    return {rows:[]};
  }};
  const {queueQuoteDeliveryAlerts}=load('lib/quote-delivery-alerts.ts',{'@/lib/directory-rfq':{UUID:/^[a-f0-9-]{36}$/,rfqFetch:async()=>{
    if(data instanceof Error)throw data;return new Response(JSON.stringify(data));
  }}});
  return {run:()=>queueQuoteDeliveryAlerts(db),keys,calls};
}
test('fast alerts deduplicate, preserve human records, and only address configured Vicrez staff',async()=>{
  process.env.DIRECTORY_STAFF_ALERT_EMAILS='BD@vicrez.com,bd@vicrez.com,external@example.test';
  const alert={submission_id:41,job_id:job,reason:'recipient_suppressed'};
  const f=fixture({enabled:true,provider_evidence_ok:true,alerts:[alert,alert]});
  assert.equal((await f.run()).queued,1);assert.equal((await f.run()).queued,0);
  assert.equal(f.keys.size,1);
  for(const c of f.calls.filter(x=>/INSERT INTO directory_(inquiry_followup|action_assignments)/.test(x.sql)))assert.match(c.sql,/ON CONFLICT\([^)]*\) DO NOTHING/);
  const notice=f.calls.find(c=>c.sql.includes('INSERT INTO directory_notifications'));
  assert.equal(notice.args[2],'bd@vicrez.com');assert.match(notice.args[4],/Keep the suppression in place/);
  assert.ok(f.calls.filter(x=>x.sql.includes('directory_operation_runs')).every(c=>c.args[0]===true));
});
test('outages and malformed evidence raise one staff monitor warning per hour',async()=>{
  process.env.DIRECTORY_STAFF_ALERT_EMAILS='bd@vicrez.com';
  for(const data of [Error('private token'),{enabled:true,provider_evidence_ok:true,alerts:[null,{submission_id:41,job_id:job,reason:'toString'}]}]){
    const f=fixture(data);assert.equal((await f.run()).ok,false);assert.equal((await f.run()).queued,0);
    assert.equal(f.keys.size,1);assert.ok([...f.keys][0].startsWith('quote-delivery:monitor:'));
    assert.ok(!JSON.stringify(f.calls).includes('private token'));
    assert.equal(f.calls.filter(x=>x.sql.includes('directory_inquiry_followup')).length,0);
  }
});
test('disabled monitor does not queue messages and missing staff configuration is unhealthy',async()=>{
  let f=fixture({enabled:false,alerts:[]});assert.equal((await f.run()).enabled,false);assert.equal(f.calls.length,0);
  process.env.DIRECTORY_STAFF_ALERT_EMAILS='';f=fixture({enabled:true,provider_evidence_ok:true,alerts:[]});assert.equal((await f.run()).ok,false);assert.equal(f.keys.size,0);
});
test('operations monitoring is isolated from notification sends and delivery reconciliation',async()=>{
  const calls=[];
  const {POST}=load('app/api/internal/operations/route.ts',{
    '@/lib/db':{getPool:()=>({})},
    '@/lib/notifications':{operationsAuthorized:()=>true,processNotifications:async()=>{calls.push('send');return {enabled:true}},reconcileNotificationDelivery:async()=>{calls.push('delivery');return {enabled:true}}},
    '@/lib/operations-health':{},
    '@/lib/quote-delivery-alerts':{queueQuoteDeliveryAlerts:async()=>{calls.push('quote');return {enabled:true}}},
  });
  for(const query of ['?quotes=1','','?delivery=1'])assert.equal((await POST(new Request('https://example.test/api/internal/operations'+query,{method:'POST'}))).status,200);
  assert.deepEqual(calls,['quote','send','delivery']);
});
test('reminder headers target each request customer and reject unsafe reply addresses',()=>{
  const {notificationMessage}=load('lib/notifications.ts');
  const row={kind:'inquiry-reminder',reference:'VZ-41',id:1,recipient:'shop@example.test',reminder_url:'https://installers.vicrez.com/shop-response#private'};
  for(const customer of ['one+project@example.test','two@example.test']){
    const message=notificationMessage({...row,customer_email:customer,customer_reply_url:'mailto:'+customer});
    assert.equal(message.reply_to.email,customer);assert.equal(message.from.email,'b2bsupport@vicrez.com');
    assert.equal(message.personalizations[0].to[0].email,row.recipient);
    assert.equal(message.personalizations[0].cc,undefined);assert.equal(message.personalizations[0].bcc,undefined);
    assert.match(message.content[0].value,/b2bsupport@vicrezcom.zendesk.com/);
  }
  for(const customer of ['',undefined,'a@example.test\r\nBcc: b@example.test','a@example.test,b@example.test'])assert.throws(()=>notificationMessage({...row,customer_email:customer}));
});
