const test=require('node:test'),assert=require('node:assert/strict'),load=require('./load-module.cjs');
const {decorateActions}=load('lib/action-queue.ts');
const {deriveActions}=load('lib/action-queue.ts');
const item={key:'inquiry:9',kind:'inquiry',record_id:'9',source_due_at:null,priority:'normal'};
test('automation ownership appears without inventing a staff login',()=>{
 const [r]=decorateActions([item],[{task_key:item.key,actor:'Vicrez Installer Agent (AI)',automation_owner:'Vicrez Installer Agent (AI)',escalation_owner:'Named support owner',zendesk_ticket_id:123}]);
 assert.equal(r.automation_owner,'Vicrez Installer Agent (AI)');assert.equal(r.assigned_to,null);assert.equal(r.support_ticket_id,123);
});
test('manual takeover or paused automation removes automated ownership',()=>{
 for(const patch of [{actor:'human-reviewer'},{automation_paused:true},{assigned_to:'staff-uuid'}]){
  const [r]=decorateActions([item],[{task_key:item.key,actor:'Vicrez Installer Agent (AI)',automation_owner:'Vicrez Installer Agent (AI)',...patch}]);
  assert.equal(r.automation_owner,null);
 }
});

test('daily contact checks use a 30-hour freshness window and failures stay actionable',()=>{
 const now=Date.parse('2026-10-09T12:00:00Z');
 const row={name:'contact-health',ok:true,checked_at:'2026-10-08T13:00:00Z'};
 assert.equal(deriveActions({runs:[row]},now).length,0);
 assert.equal(deriveActions({runs:[{...row,ok:false}]},now).length,1);
 assert.equal(deriveActions({runs:[{...row,checked_at:'2026-10-08T05:00:00Z'}]},now).length,1);
});
