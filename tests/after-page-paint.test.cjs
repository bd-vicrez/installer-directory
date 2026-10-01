const test=require('node:test'),assert=require('node:assert/strict'),load=require('./load-module.cjs');
function fixture(complete) {
 let next=1;const frames=new Map(),events=new Map();
 const mod=load('lib/after-page-paint.ts',{}, {
  document:{readyState:complete?'complete':'loading'},
  window:{addEventListener:(n,fn)=>events.set(n,fn),removeEventListener:(n)=>events.delete(n)},
  requestAnimationFrame:fn=>{const id=next++;frames.set(id,fn);return id;},
  cancelAnimationFrame:id=>frames.delete(id),
 });
 return {schedule:mod.afterPagePaint,load:()=>events.get('load')?.(),frame:()=>{const current=[...frames];frames.clear();current.forEach(([,fn])=>fn());}};
}
test('nonessential work waits for load and two paint opportunities',()=>{
 const f=fixture(false);let calls=0;f.schedule(()=>calls++);
 f.frame();assert.equal(calls,0);f.load();f.frame();assert.equal(calls,0);f.frame();assert.equal(calls,1);f.frame();assert.equal(calls,1);
});
test('already-loaded documents still paint before nonessential work',()=>{
 const f=fixture(true);let calls=0;f.schedule(()=>calls++);
 f.frame();assert.equal(calls,0);f.frame();assert.equal(calls,1);
});
test('unmount cancels callbacks before load and between frames',()=>{
 for(const stage of ['before-load','first-frame','second-frame']) {
  const f=fixture(false);let calls=0;const cancel=f.schedule(()=>calls++);
  if(stage!=='before-load')f.load();if(stage==='second-frame')f.frame();
  cancel();f.load();f.frame();f.frame();assert.equal(calls,0);
 }
});
