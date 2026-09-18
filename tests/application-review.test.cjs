const test=require('node:test'),assert=require('node:assert/strict'),load=require('./load-module.cjs');
const {NextRequest}=require('next/server');
const app={id:'application-qa',status:'pending',street_address:'2028 S Michigan Ave',city:'Chicago',state:'IL',zip_code:'60616',location_evidence:null};
const location={eligible:true,lat:41.85,lng:-87.62,formatted_address:'2028 S Michigan Ave, Chicago, IL 60616, USA',precision:'ROOFTOP'};
function setup({changed=false,auditFails=false}={}){
 const writes=[];let lookups=0;
 const db={query:async sql=>({rows:[app]}),connect:async()=>({query:async(sql,args)=>{
  writes.push({sql,args});
  if(sql.startsWith('UPDATE applications'))return {rows:changed?[]:[{id:app.id}]};
  if(auditFails&&sql.startsWith('INSERT INTO directory_review_audit'))throw Error('fixture audit failure');
  return {rows:[]};
 },release:()=>{}})};
 const route=load('app/api/applications/[id]/route.ts',{
  '@/lib/db':{getPool:()=>db},'@/lib/admin-auth':{requireAdmin:()=>null,adminIdentity:()=>({username:'signed-in-reviewer'})},
  '@/lib/address-review':{addressCandidate:async()=>{lookups++;return location}},'@/lib/contact-refresh':{refreshContactPages:()=>{}},
 });
 return {writes,lookups:()=>lookups,patch:body=>route.PATCH(new NextRequest('https://example.test/api/applications/'+app.id,{method:'PATCH',headers:{Origin:'https://example.test'},body:JSON.stringify(body)}),{params:Promise.resolve({id:app.id})})};
}
test('address lookup works before the review note and audits only location evidence',async()=>{
 const s=setup(),r=await s.patch({action:'locate',status:'approved',note:''});
 assert.equal(r.status,200);assert.equal((await r.json()).location.eligible,true);assert.equal(s.lookups(),1);
 assert.ok(s.writes.some(x=>x.sql==='COMMIT'));
 assert.ok(s.writes.some(x=>x.sql.includes("'address-lookup'")&&x.args[1]==='signed-in-reviewer'));
 assert.ok(!s.writes.some(x=>x.sql.includes('SET status=')||x.sql.includes('INSERT INTO installers')));
});
test('an address changed during lookup cannot receive stale evidence',async()=>{
 const s=setup({changed:true}),r=await s.patch({action:'locate'});
 assert.equal(r.status,409);assert.match((await r.json()).error,/changed during lookup/);
 assert.ok(s.writes.some(x=>x.sql==='ROLLBACK'));assert.ok(!s.writes.some(x=>x.sql==='COMMIT'));
});
test('lookup audit failure rolls back and never claims success',async()=>{
 const s=setup({auditFails:true}),r=await s.patch({action:'locate'});
 assert.equal(r.status,503);assert.ok(s.writes.some(x=>x.sql==='ROLLBACK'));assert.ok(!s.writes.some(x=>x.sql==='COMMIT'));
});
test('approval still requires a review note with an actionable error',async()=>{
 const s=setup(),r=await s.patch({status:'approved',note:''});
 assert.equal(r.status,400);assert.match((await r.json()).error,/internal review note.*10 characters/);assert.equal(s.writes.length,0);
});
