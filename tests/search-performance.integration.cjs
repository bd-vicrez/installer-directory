// All fixtures live in a transaction-local temporary table; rollback removes them.
const {Pool}=require('pg'),assert=require('node:assert/strict'),load=require('./load-module.cjs');
if(!process.env.DATABASE_URL)throw Error('Explicit test database required');
const uri=new URL(process.env.DATABASE_URL);uri.searchParams.set('sslmode','verify-full');
const pool=new Pool({connectionString:uri.toString(),max:1});
(async()=>{
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  await client.query('CREATE TEMP TABLE installers ON COMMIT DROP AS SELECT * FROM public.installers WITH NO DATA');
  await client.query('SET LOCAL search_path=pg_temp,public');
  const base={status:'active',city:'San Diego',state:'CA',zip_code:'92101',street_address:'123 Main St',lat:32.7198,lng:-117.157,source:'directory',install_capabilities:['Body Kits'],routing_email:'private@qa.test',quote_routing_enabled:true,owner_inquiry_paused:false,owner_details:{parts_policy:'accepts-customer-parts'},owner_details_confirmed_at:'2026-01-01T00:00:00Z',owner_reconfirmed_at:'2026-01-01T00:00:00Z'};
  const fixtures=[
   {...base,id:910000001,business_name:'A eligible'},
   {...base,id:910000002,business_name:'B paused',owner_inquiry_paused:true},
   {...base,id:910000003,business_name:'C unknown location',street_address:'Mobile service area',lat:null,lng:null},
   {...base,id:910000004,business_name:'D removed',status:'removed'},
   {...base,id:910000005,business_name:'E distant',city:'San Francisco',lat:37.7749,lng:-122.4194,zip_code:'94103'},
   {...base,id:910000006,business_name:'F verified',source:'[New Dealer Form]'},
  ];
  await client.query('INSERT INTO installers SELECT * FROM json_populate_recordset(NULL::installers,$1::json)',[JSON.stringify(fixtures)]);
  const mod=load('lib/installer-search.ts',{
   '@/lib/db':{getPool:()=>({connect:async()=>({query:(...args)=>client.query(...args),release(){}})})},
   '@/lib/geocode':{geocodeLocation:async()=>({lat:base.lat,lng:base.lng,label:'San Diego, CA',city:base.city,state:base.state,zip:base.zip_code})},
  });
  const search=q=>mod.searchInstallers(new URLSearchParams(q));
  const results=await search('q=92101&limit=2');
  assert.equal(results.total,4);assert.equal(results.verified,1);assert.equal(results.location_unconfirmed,1);
  assert.deepEqual(Array.from(results.installers,s=>String(s.id)),['910000001','910000006']);
  assert.equal(results.installers[0].parts_policy,'Accepts customer-supplied parts; confirm your part');
  assert.equal(results.installers[0].owner_confirmed_at,'2026-01-01T00:00:00.000Z');
  assert.ok(!JSON.stringify(results).includes('private@qa.test'));
  assert.ok(!JSON.stringify(results).includes('owner_details'));
  const second=await search('q=92101&limit=2&offset=2');
  assert.deepEqual(Array.from(second.installers,s=>String(s.id)),['910000002','910000003']);
  assert.equal(second.installers[1].distance,null);
  const empty=await search('q=92101&offset=100');assert.equal(empty.total,4);assert.equal(empty.installers.length,0);
  const none=await search('lat=0&lng=0&radius=1');assert.equal(none.total,0);assert.equal(none.installers.length,0);
  assert.equal((await search('q=92101&inquiry=1')).total,3);
  assert.equal((await search('q=92101&tier=verified')).total,1);
  assert.equal((await search('q=92101&service=ppf')).total,0);
  assert.equal((await search('')).total,5);
  await client.query('UPDATE installers SET owner_inquiry_paused=true WHERE id::text=$1',['910000001']);
  const fresh=await search('q=92101&inquiry=1');assert.equal(fresh.total,2);assert.ok(!fresh.installers.some(s=>String(s.id)==='910000001'));
  console.log('Search integration passed: counts, order, pagination, empty pages, zero matches, service/tier/availability, public projection and fresh contact changes.');
 }finally{await client.query('ROLLBACK');client.release();await pool.end();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
