const test = require('node:test'), assert = require('node:assert/strict');
const {NextRequest} = require('next/server');
const load = require('./load-module.cjs');
const eligible = {status:'active', routing_email:'shop@example.com', quote_routing_enabled:true, owner_inquiry_paused:false, google_status:'OPERATIONAL'};
function fixture(row, failure) {
  const calls = {connect:0, query:0, release:0};
  const {GET} = load('app/api/quote-availability/route.ts', {'@/lib/db-pool':{getPool:()=>({connect:async()=>{
    calls.connect++;
    if(failure === 'connect') throw Error('private connection detail');
    return {query:async(sql,params)=>{
      calls.query++;
      assert.deepEqual(Array.from(params),['shop-id']);
      if(failure === 'query') throw Error('private query detail');
      return {rows:row?[row]:[]};
    },release(){calls.release++;}};
  }})}});
  return {calls, get:(suffix='?id=shop-id')=>GET(new NextRequest('https://example.test/api/quote-availability'+suffix))};
}
test('availability rejects missing/oversized ids without acquiring a connection',async()=>{
  for(const suffix of ['', '?id=', '?id='+'x'.repeat(81)]) {
    const {get,calls}=fixture(eligible);const r=await get(suffix);
    assert.equal(r.status,400);assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(calls.connect,0);
  }
});
test('availability stays live, returns only a boolean and releases the connection',async()=>{
  const {get,calls}=fixture(eligible);
  for(let i=0;i<2;i++) {
    const r=await get();assert.equal(r.status,200);
    assert.deepEqual(await r.json(),{available:true});
    assert.equal(r.headers.get('cache-control'),'no-store');
    assert.match(r.headers.get('server-timing'),/^connect;dur=\d+\.\d, query;dur=\d+\.\d, total;dur=\d+\.\d$/);
  }
  assert.deepEqual(calls,{connect:2,query:2,release:2});
});
test('unavailable, paused, closed, missing and unroutable shops cannot receive quotes',async()=>{
  for(const row of [null, {...eligible,status:'pending'}, {...eligible,quote_routing_enabled:false}, {...eligible,owner_inquiry_paused:true}, {...eligible,google_status:'CLOSED_PERMANENTLY'}, {...eligible,google_status:'CLOSED_TEMPORARILY'}, {...eligible,routing_email:''}]) {
    const {get,calls}=fixture(row);const r=await get();
    assert.deepEqual(await r.json(),{available:false});assert.equal(calls.release,1);
  }
});
test('connection and query failures give a safe retryable error',async()=>{
  for(const failure of ['connect','query']) {
    const {get,calls}=fixture(eligible,failure);const r=await get();
    assert.equal(r.status,503);assert.equal(r.headers.get('cache-control'),'no-store');
    assert.deepEqual(await r.json(),{error:'Contact availability could not be checked.'});
    assert.equal(calls.release,failure==='query'?1:0);
  }
});
