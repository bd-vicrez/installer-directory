"""Integration tests only run against the explicitly named disposable local QA database."""
import os,json,unittest,uuid
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import psycopg2
from psycopg2.extras import RealDictCursor,Json
import agent
from rules import ACTOR,fingerprint,decide
from test_rules import fixture

def db():
 cfg=json.loads(Path('/root/installer-operations/agent/state/qa-config.json').read_text())
 assert cfg['dbname']=='installer_agent_qa' and cfg['host']=='127.0.0.1'
 return psycopg2.connect(**cfg)
def make_agent():
 a=object.__new__(agent.Agent);a.cfg={'owner_name':'QA owner','owner_email':'qa@example.test','owner_zendesk_id':1,'max_messages_per_run':6};a.db=db();a.live=True;a.report={'messages':[],'errors':[]};return a
def seed():
 a,e=fixture();a['id']='qa-'+str(uuid.uuid4());a['status']='pending';a['reviewer']='';a['public_message']='';a['installer_id']=None
 with db() as c:
  with c.cursor() as q:
   q.execute("INSERT INTO applications(id,application_id,business_name,street_address,city,state,zip_code,phone,email,website,install_capabilities,details,consent_at,consent_version) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",(a['id'],'QA-'+a['id'],a['business_name'],a['street_address'],a['city'],a['state'],a['zip_code'],a['phone'],a['email'],a['website'],a['install_capabilities'],Json(a['details']),a['consent_at'],a['consent_version']))
 return a,e

class DatabaseTest(unittest.TestCase):
 def setUp(self):
  with db() as c:
   with c.cursor() as q:q.execute('TRUNCATE applications,installers,directory_review_audit,directory_notifications,directory_action_assignments,directory_automation_cases,directory_automation_reviews,directory_automation_messages,directory_inquiry_followup CASCADE')
 def test_approval_atomic_and_idempotent(self):
  a,e=seed();x=make_agent();d=decide(a,e,[])
  try:
   result=x.commit_application(a,fingerprint(a),e,d);self.assertEqual(result['status'],'approved')
   self.assertEqual(x.commit_application(a,fingerprint(a),e,d),'changed_during_review')
   rows=x.query('SELECT quote_routing_enabled,public_email_approved,owner_details FROM installers');self.assertEqual(len(rows),1);self.assertFalse(rows[0]['quote_routing_enabled']);self.assertFalse(rows[0]['public_email_approved']);self.assertEqual(rows[0]['owner_details'],{})
   self.assertEqual(x.query("SELECT count(*) n FROM directory_notifications WHERE outcome='approved'")[0]['n'],1)
   self.assertEqual(x.query("SELECT count(*) n FROM directory_review_audit WHERE action='approved'")[0]['n'],1)
   self.assertEqual(x.query('SELECT count(*) n FROM directory_owner_grants')[0]['n'],0)
  finally:x.db.close()
 def test_concurrent_approvals_create_one_listing(self):
  a,e=seed();d=decide(a,e,[])
  def run(_):
   x=make_agent()
   try:return x.commit_application(a,fingerprint(a),e,d)
   finally:x.db.close()
  with ThreadPoolExecutor(max_workers=2) as ex:results=list(ex.map(run,range(2)))
  self.assertEqual(sum(isinstance(r,dict) and r['status']=='approved' for r in results),1)
 def test_changed_input_and_human_takeover_stop(self):
  a,e=seed();x=make_agent()
  try:
   x.query("UPDATE applications SET phone='9805558888' WHERE id=%s",(a['id'],));self.assertEqual(x.commit_application(a,fingerprint(a),e,decide(a,e,[])),'changed_during_review')
   x.query('UPDATE applications SET phone=%s WHERE id=%s',(a['phone'],a['id']))
   x.query("INSERT INTO directory_action_assignments(task_key,kind,record_id,actor,note) VALUES(%s,'application',%s,'QA human','Manual review in progress')",('application:'+a['id'],a['id']))
   self.assertEqual(x.commit_application(a,fingerprint(a),e,decide(a,e,[])),'human_took_ownership')
   self.assertEqual(x.query('SELECT count(*) n FROM installers')[0]['n'],0)
  finally:x.db.close()
 def test_second_business_application_closes_as_duplicate(self):
  a,e=seed();x=make_agent()
  try:
   x.commit_application(a,fingerprint(a),e,decide(a,e,[]));b,f=seed()
   result=x.commit_application(b,fingerprint(b),f,decide(b,f,[]));self.assertEqual(result['status'],'rejected')
   self.assertEqual(x.query('SELECT count(*) n FROM installers')[0]['n'],1)
  finally:x.db.close()
 def test_audit_failure_rolls_back_listing_and_notification(self):
  a,e=seed();x=make_agent()
  try:
   x.query("ALTER TABLE directory_review_audit ADD CONSTRAINT qa_force_audit_failure CHECK(actor <> 'Vicrez Installer Agent (AI)')")
   try:
    with self.assertRaises(psycopg2.Error):x.commit_application(a,fingerprint(a),e,decide(a,e,[]))
    self.assertEqual(x.query('SELECT status FROM applications WHERE id=%s',(a['id'],))[0]['status'],'pending')
    self.assertEqual(x.query('SELECT count(*) n FROM installers')[0]['n'],0)
    self.assertEqual(x.query("SELECT count(*) n FROM directory_notifications WHERE outcome='approved'")[0]['n'],0)
   finally:x.query('ALTER TABLE directory_review_audit DROP CONSTRAINT qa_force_audit_failure')
  finally:x.db.close()
 def test_uncertain_message_is_not_retried(self):
  x=make_agent()
  try:
   x.query("INSERT INTO directory_automation_messages(event_key,kind,record_ids,recipient,subject,body,state) VALUES('qa-uncertain','inquiry','[9]','qa@example.test','qa','qa','sending')")
   x.rfq=lambda *a,**k: (_ for _ in ()).throw(AssertionError('Should not send'))
   x.send_message=lambda *a: (_ for _ in ()).throw(AssertionError('Should not send'))
   x.dispatch();self.assertEqual(x.query("SELECT state FROM directory_automation_messages WHERE event_key='qa-uncertain'")[0]['state'],'uncertain')
  finally:x.db.close()
 def test_customer_withdrawal_cancels_pending_message(self):
  x=make_agent()
  try:
   x.query("INSERT INTO directory_automation_messages(event_key,kind,record_ids,recipient,subject,body) VALUES('qa-withdrawn','inquiry','[9]','qa@example.test','qa','qa')")
   x.rfq=lambda *a,**k:{'requests':[{'email':'qa@example.test','customer_action':{'state':'withdrawn'}}]}
   x.send_message=lambda *a: (_ for _ in ()).throw(AssertionError('Should not send'))
   x.dispatch();self.assertEqual(x.query("SELECT state FROM directory_automation_messages WHERE event_key='qa-withdrawn'")[0]['state'],'cancelled')
  finally:x.db.close()
if __name__=='__main__':unittest.main()
