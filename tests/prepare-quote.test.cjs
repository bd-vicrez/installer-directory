const test=require('node:test'),assert=require('node:assert/strict'),load=require('./load-module.cjs');
const {prepareQuoteDialog}=load('lib/prepare-quote.ts');
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
test('quote import overlaps the live check and the dialog waits for both',async()=>{
 const check=deferred(),module=deferred();let importing=false,checking=false,finished=false;
 const ready=prepareQuoteDialog(()=>{checking=true;return check.promise;},()=>{importing=true;return module.promise;}).then(x=>{finished=true;return x;});
 await Promise.resolve();assert.equal(checking,true);assert.equal(importing,true);
 check.resolve(true);await Promise.resolve();assert.equal(finished,false);
 module.resolve({});assert.equal(await ready,true);
});
test('denied shops never open, including when the speculative import fails',async()=>{
 const module=deferred();const ready=prepareQuoteDialog(async()=>false,()=>module.promise);
 assert.equal(await ready,false);module.reject(Error('offline'));await Promise.resolve();
});
test('check and import failures stay retryable and never permit the quote',async()=>{
 await assert.rejects(prepareQuoteDialog(async()=>{throw Error('check failed');},async()=>({})),/check failed/);
 await assert.rejects(prepareQuoteDialog(async()=>true,async()=>{throw Error('download failed');}),/could not load/);
 assert.equal(await prepareQuoteDialog(async()=>true,async()=>({})),true);
});
test('search releases its pooled connection if its query fails',async()=>{
 let released=false;
 const {searchInstallers}=load('lib/installer-search.ts',{'@/lib/db':{getPool:()=>({connect:async()=>({query:async()=>{throw Error('database unavailable');},release(){released=true;}})})}});
 await assert.rejects(searchInstallers(new URLSearchParams('limit=6')),/database unavailable/);
 assert.equal(released,true);
});
