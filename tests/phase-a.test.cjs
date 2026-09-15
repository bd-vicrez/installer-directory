const test=require('node:test');
const assert=require('node:assert/strict');
const {NextRequest}=require('next/server');
const load=require('./load-module.cjs');
const id='11111111-1111-4111-8111-111111111111';
const request=(path,body,headers={})=>new NextRequest('https://installers.example.test'+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...headers},body:body===undefined?undefined:JSON.stringify(body)});
const shop={id:'shop',status:'active',routing_email:'private@example.test',quote_routing_enabled:true,install_capabilities:['Body Kits'],public_email:'public@example.test',public_email_approved:false};
const quote=()=>({request_id:id,session_id:id,customer_name:'Test Customer',customer_email:'customer@example.test',customer_phone:'2125550100',vehicle_year:'2024',vehicle_make:'Dodge',vehicle_model:'Charger',service:'body-kits',what_needed:'Diffuser',zip_code:'10001',sharing_consent:true});
const serviceMock=(overrides={})=>({UUID:/^[0-9a-f-]{36}$/i,sameOrigin:()=>true,withinRateLimit:async()=>true,recordQuoteEvent:async()=>{},rfqFetch:async()=>new Response(JSON.stringify({ok:true,submission_id:2,receipt_token:'signed-test-receipt'})),...overrides});

test('contact eligibility requires enabled active valid routing, not a legacy email',()=>{
  const {canReceiveQuote}=load('lib/installer-contact.ts');assert.equal(canReceiveQuote(shop),true);
  for(const changes of [{quote_routing_enabled:false},{status:'removed'},{status:'non_us_excluded'},{routing_email:''},{routing_email:'bad'},{google_status:'CLOSED_PERMANENTLY'},{google_status:'CLOSED_TEMPORARILY'}])assert.equal(canReceiveQuote({...shop,...changes}),false);
  assert.equal(canReceiveQuote({status:'active',email:'legacy@example.test'}),false);
});
test('public email needs explicit approval, timestamp and valid public field',()=>{
  const {publicContactEmail}=load('lib/installer-contact.ts');assert.equal(publicContactEmail(shop),null);
  assert.equal(publicContactEmail({...shop,public_email_approved:true}),null);
  assert.equal(publicContactEmail({...shop,public_email_approved:true,public_email_approved_at:'2026-09-15'}),'public@example.test');
  assert.equal(publicContactEmail({...shop,public_email_approved:true,public_email_approved_at:'2026-09-15',public_email:'invalid'}),null);
});
test('public projection adds only availability and never routing/public-approval records',()=>{
  const {toPublicInstaller}=load('lib/public-installers.ts');const result=toPublicInstaller({...shop,public_email_approval_note:'private permission record'});
  assert.equal(result.quote_available,true);for(const field of ['email','routing_email','quote_routing_enabled','public_email','public_email_approval_note'])assert.equal(field in result,false);
  assert.ok(!JSON.stringify(result).includes('@example.test'));
});
test('service aliases distinguish PPF, paint, wrap, tint and tire work',()=>{
  const {recordedQuoteServices}=load('lib/quote-services.ts');
  assert.deepEqual(Array.from(recordedQuoteServices(['body_kits','aero'])),['body-kits']);
  assert.deepEqual(Array.from(recordedQuoteServices('Paint protection film (PPF)')),['ppf']);
  assert.deepEqual(Array.from(recordedQuoteServices('Vinyl Wraps')),['vinyl-wrap']);
  assert.deepEqual(Array.from(recordedQuoteServices('Tinting')),['window-tint']);
  assert.deepEqual(Array.from(recordedQuoteServices('Wheels/Tires')),['wheels-tires']);
  assert.deepEqual(Array.from(recordedQuoteServices('unknown')),[]);
});
test('quote validation enforces service, boolean consent, scalar values and bounded fields',()=>{
  const {validateQuoteInput}=load('lib/quote-validation.ts');assert.equal(validateQuoteInput(quote()),null);
  for(const changes of [{service:'unknown'},{sharing_consent:'true'},{request_id:null},{vehicle_year:[2024]},{install_timeline:'Soon\nInjected'},{customer_email:'<customer>@example.test'},{installer_id:''}])assert.ok(validateQuoteInput({...quote(),...changes}));
});
test('availability endpoint returns only a safe boolean',async()=>{
  const {GET}=load('app/api/quote-availability/route.ts',{'@/lib/db':{getPool:()=>({query:async()=>({rows:[shop]})})}});
  const response=await GET(request('/api/quote-availability?id=shop'));assert.equal(response.status,200);assert.deepEqual(await response.json(),{available:true});assert.equal(response.headers.get('cache-control'),'no-store');
});
test('private recipient search blocks untrusted callers before reading records',async()=>{
  process.env.INSTALLER_FEED_TOKEN='test-feed-secret-'.repeat(3);
  const {GET}=load('app/api/internal/quote-routing/route.ts',{'@/lib/db':{getPool:()=>{throw new Error('Must not read records');}}});
  const response=await GET(request('/api/internal/quote-routing?service=body-kits'));assert.equal(response.status,401);
});
test('private recipient search filters out unsuitable and disabled shops',async()=>{
  process.env.INSTALLER_FEED_TOKEN='test-feed-secret-'.repeat(3);
  const {GET}=load('app/api/internal/quote-routing/route.ts',{'@/lib/db':{getPool:()=>({query:async()=>({rows:[shop,{...shop,id:'tires',install_capabilities:['Wheels/Tires']},{...shop,id:'disabled',quote_routing_enabled:false}]})})}});
  const response=await GET(request('/api/internal/quote-routing?service=body-kits',undefined,{authorization:'Bearer '+process.env.INSTALLER_FEED_TOKEN}));const result=await response.json();assert.deepEqual(result.installers.map(r=>r.id),['shop']);assert.equal(response.headers.get('cache-control'),'private, no-store');
});
test('selected shop request is rejected before forwarding if contact became unavailable',async()=>{
  let forwarded=false;const {POST}=load('app/api/quote-request/route.ts',{'@/lib/db':{getPool:()=>({query:async()=>({rows:[{...shop,quote_routing_enabled:false}]})})},'@/lib/directory-rfq':serviceMock({rfqFetch:async()=>{forwarded=true;throw new Error();}})});
  const response=await POST(request('/api/quote-request',{...quote(),installer_id:'shop',installer_email:'forged@example.test'}));assert.equal(response.status,409);assert.equal(forwarded,false);
});
test('selected shop request forwards an allowlist and preserves the exact selection',async()=>{
  let payload;const {POST}=load('app/api/quote-request/route.ts',{'@/lib/db':{getPool:()=>({query:async()=>({rows:[shop]})})},'@/lib/directory-rfq':serviceMock({rfqFetch:async(path,body)=>{payload=body;return new Response(JSON.stringify({ok:true,submission_id:2,receipt_token:'signed-test-receipt'}));}})});
  const response=await POST(request('/api/quote-request',{...quote(),installer_id:'shop',installer_email:'forged@example.test',untrusted_extra:'private'}));assert.equal(response.status,200);assert.equal(payload.flow,'selected');assert.equal(payload.preferred_installer_id,'shop');assert.equal(payload.installer_email,undefined);assert.equal(payload.untrusted_extra,undefined);assert.equal(payload.sharing_consent,true);
});
test('request conflict cannot be mistaken for a saved edited inquiry',async()=>{
  const {POST}=load('app/api/quote-request/route.ts',{'@/lib/directory-rfq':serviceMock({rfqFetch:async()=>new Response('{}',{status:409})})});
  const response=await POST(request('/api/quote-request',quote()));assert.equal(response.status,409);assert.equal((await response.json()).code,'request_changed');
});
test('rate limits and origin checks prevent forwarding',async()=>{
  for(const override of [{sameOrigin:()=>false},{withinRateLimit:async()=>false}]){
    let sent=false;const {POST}=load('app/api/quote-request/route.ts',{'@/lib/directory-rfq':serviceMock({...override,rfqFetch:async()=>{sent=true;throw new Error();}})});const response=await POST(request('/api/quote-request',quote()));assert.ok([403,429].includes(response.status));assert.equal(sent,false);
  }
});
test('server measurement is idempotent and excludes customer details',async()=>{
  let args;const {recordQuoteEvent}=load('lib/directory-rfq.ts',{'@/lib/db':{getPool:()=>({query:async config=>{args=config;return {rows:[]};}})}});
  await recordQuoteEvent('quote_received',{id:'directory-quote-2',flow:'selected',service:'body-kits',session_id:id,email:'never@example.test'});assert.match(args.text,/ON CONFLICT\(id\) DO NOTHING/);assert.equal(args.query_timeout,2000);assert.ok(!JSON.stringify(args).includes('never@'));
});
test('rate storage hashes the network identifier and enforces returned count',async()=>{
  process.env.DIRECTORY_RFQ_SECRET='s'.repeat(48);let values;
  const {withinRateLimit}=load('lib/directory-rfq.ts',{'@/lib/db':{getPool:()=>({query:async(sql,args)=>{values=args;return {rows:[{count:13}]};}})}});
  assert.equal(await withinRateLimit('198.51.100.123','quote-submit',12,900),false);assert.match(values[0],/^[0-9a-f]{64}$/);assert.ok(!JSON.stringify(values).includes('198.51.100.123'));
});
test('client telemetry cannot claim a server receipt or store extra personal data',async()=>{
  let recorded;const {POST}=load('app/api/quote-events/route.ts',{'@/lib/directory-rfq':serviceMock({recordQuoteEvent:async(event,data)=>{recorded={event,data};}})});
  const data={id,session_id:id,flow:'network',service:'body-kits',event:'quote_received'};
  assert.equal((await POST(request('/api/quote-events',data))).status,400);
  assert.equal((await POST(request('/api/quote-events',{...data,event:'quote_open',email:'excluded@example.test',query:'precise location'}))).status,204);assert.ok(!JSON.stringify(recorded).includes('excluded@'));assert.equal(recorded.data.query,undefined);
});
test('customer status proxy whitelists response fields',async()=>{
  const {POST}=load('app/api/quote-request/status/route.ts',{'@/lib/directory-rfq':serviceMock({rfqFetch:async()=>new Response(JSON.stringify({reference:'VZ-2',status:'routing_pending',message:'Saved',private_email:'hidden@example.test'}))})});
  const response=await POST(request('/api/quote-request/status',{token:'signed-token'}));assert.equal(response.status,200);assert.equal((await response.json()).private_email,undefined);
});
test('inquiry and contact administration require a valid admin session',async()=>{
  for(const file of ['app/api/admin/inquiries/route.ts','app/api/admin/installer-contact/route.ts']){
    const {GET}=load(file,{'@/lib/directory-rfq':serviceMock({rfqFetch:async()=>{throw new Error('Must not read');}})});assert.equal((await GET(request('/api/admin/test'))).status,401);
  }
});

test('contact changes require real booleans and a permission record before any database write',async()=>{
  const {POST}=load('app/api/admin/installer-contact/route.ts',{'@/lib/admin-auth':{requireAdmin:()=>null},'@/lib/db':{getPool:()=>{throw new Error('Must not write');}},'@/lib/contact-refresh':{refreshContactPages:()=>{}}});
  const valid={id:'shop',routing_email:'route@example.test',quote_routing_enabled:true,public_email:'',public_email_approved:false,note:'Owner requested routing only'};
  for(const change of [{quote_routing_enabled:'true'},{public_email_approved:true},{note:'short'}])assert.equal((await POST(request('/api/admin/installer-contact',{...valid,...change}))).status,400);
});

test('contact permission changes commit with their audit record and refresh the profile',async()=>{
  const calls=[];let refreshed='';const client={query:async(sql,args)=>{calls.push({sql,args});return {rows:sql.startsWith('UPDATE')?[{...shop,slug:'test-shop'}]:[]};},release:()=>{}};
  const {POST}=load('app/api/admin/installer-contact/route.ts',{'@/lib/admin-auth':{requireAdmin:()=>null},'@/lib/db':{getPool:()=>({connect:async()=>client})},'@/lib/contact-refresh':{refreshContactPages:slug=>{refreshed=slug;}}});
  const response=await POST(request('/api/admin/installer-contact',{id:'shop',routing_email:'route@example.test',quote_routing_enabled:false,public_email:'public@example.test',public_email_approved:true,note:'Owner approved this public email'}));
  assert.equal(response.status,200);assert.equal(refreshed,'test-shop');assert.match(calls[1].sql,/public_email_approved_at=CASE WHEN/);assert.equal(calls[1].args[2],false);assert.equal(calls[1].args[4],true);assert.match(calls[2].sql,/installer_contact_audit/);assert.equal(calls[3].sql,'COMMIT');
});

test('an audit write failure rolls back contact changes',async()=>{
  const calls=[];const client={query:async(sql)=>{calls.push(sql);if(sql.includes('installer_contact_audit'))throw new Error('simulated');return {rows:sql.startsWith('UPDATE')?[{...shop,slug:'test-shop'}]:[]};},release:()=>{}};
  const {POST}=load('app/api/admin/installer-contact/route.ts',{'@/lib/admin-auth':{requireAdmin:()=>null},'@/lib/db':{getPool:()=>({connect:async()=>client})},'@/lib/contact-refresh':{refreshContactPages:()=>{throw new Error('Must not refresh');}}});
  const response=await POST(request('/api/admin/installer-contact',{id:'shop',routing_email:'route@example.test',quote_routing_enabled:false,public_email:'',public_email_approved:false,note:'Owner requested contact removal'}));
  assert.equal(response.status,503);assert.equal(calls.at(-1),'ROLLBACK');assert.ok(!calls.includes('COMMIT'));
});
