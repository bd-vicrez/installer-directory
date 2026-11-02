const test=require('node:test'),assert=require('node:assert/strict');
const {NextRequest}=require('next/server'),load=require('./load-module.cjs');
const origin='https://installers.vicrez.com';
const req=(path,body,withOrigin=true)=>new NextRequest(origin+path,{method:'POST',headers:{'Content-Type':'application/json',...(withOrigin?{Origin:origin}:{})},body:JSON.stringify(body)});
const quote={request_id:'11111111-1111-4111-8111-111111111111',customer_name:'Internal QA',customer_email:'bd@vicrez.com',customer_phone:'2125550100',vehicle_year:2024,vehicle_make:'Honda',vehicle_model:'Civic',service:'body-kits',what_needed:'Front lip',zip_code:'90001',sharing_consent:true,hcaptcha_token:'one-time-token'};
test('verification configuration exposes only sitekey and mode',async()=>{
 const {GET}=load('app/api/quote-request/verification/route.ts',{'@/lib/directory-rfq':{rfqFetch:async()=>new Response(JSON.stringify({sitekey:'public-sitekey',mode:'verified',secret:'must-not-leak'}))}});
 const r=await GET();assert.deepEqual(await r.json(),{sitekey:'public-sitekey',mode:'verified'});assert.equal(r.headers.get('cache-control'),'no-store');
});
test('quote forwards the CAPTCHA token but ignores caller verification and recipients',async()=>{
 let sent;const {POST}=load('app/api/quote-request/route.ts',{'@/lib/quote-measurement':{recordSavedQuote:async()=>{}},'@/lib/directory-rfq':{UUID:/^[0-9a-f-]{36}$/,sameOrigin:()=>true,withinRateLimit:async()=>true,recordQuoteEvent:async()=>{},rfqFetch:async(p,b)=>{sent=b;return new Response(JSON.stringify({ok:true,submission_id:42,receipt_token:'test-receipt'}));}}});
 const r=await POST(req('/api/quote-request',{...quote,verified:true,installer_email:'unapproved@vicrez.com'}));assert.equal(r.status,200);assert.equal(sent.hcaptcha_token,'one-time-token');assert.equal(sent.verified,undefined);assert.equal(sent.installer_email,undefined);
});
test('staff review requires origin and takes actor only from authenticated identity',async()=>{
 let sent;const mocks={'@/lib/admin-auth':{requireAdmin:async()=>null,adminIdentity:()=>({username:'signed-in-staff'})},'@/lib/directory-rfq':{rfqFetch:async(p,b)=>{sent=b;return new Response('{"ok":true}');}}};
 const {POST}=load('app/api/admin/inquiries/review/route.ts',mocks);
 assert.equal((await POST(req('/api/admin/inquiries/review',{},false))).status,403);assert.equal(sent,undefined);
 const body={submission_id:42,action:'release',version:0,action_id:quote.request_id,note:'Confirmed customer and scope',confirmed:true,actor:'forged-staff'};
 assert.equal((await POST(req('/api/admin/inquiries/review',body))).status,200);assert.equal(sent.actor,'signed-in-staff');
});
test('backend rejection details and rate-limit status reach the form without a false receipt',async()=>{
 const {POST}=load('app/api/quote-request/route.ts',{'@/lib/directory-rfq':{UUID:/^[0-9a-f-]{36}$/,sameOrigin:()=>true,withinRateLimit:async()=>true,rfqFetch:async()=>new Response(JSON.stringify({detail:'Too many requests. Contact support.'}),{status:429})}});
 const r=await POST(req('/api/quote-request',quote));assert.equal(r.status,429);assert.equal((await r.json()).success,undefined);
});
