import unittest,uuid
from psycopg2.extras import Json
import test_database
from test_database import make_agent,seed
from rules import fingerprint,decide as app_decide
import claims

class ClaimDatabaseTest(unittest.TestCase):
 setUp=test_database.DatabaseTest.setUp
 def test_worker_queues_one_proof_without_grant_or_duplicate_review_email(self):
  a,e=seed();x=make_agent()
  try:
   shop=x.commit_application(a,fingerprint(a),e,app_decide(a,e,[]))['installer_id'];cid=str(uuid.uuid4())
   x.query("INSERT INTO directory_claims(id,request_id,payload_hash,installer_id,name,email,relationship,correction,consent_version) VALUES(%s,%s,'qa-payload',%s,'QA owner',%s,'owner','Correct business listing','qa-v1')",(cid,cid,shop,a['email']))
   c=x.query(claims.SELECT+' WHERE c.id=%s',(cid,))[0];d=claims.decide(c,e)
   # QA harness creates this NOLOGIN role with the production table privileges.
   exists=x.query("SELECT 1 FROM pg_roles WHERE rolname='installer_agent_v1'")
   if exists:x.query('SET ROLE installer_agent_v1')
   self.assertEqual(claims.commit(x,c,e,d),'awaiting_business_confirmation')
   self.assertEqual(claims.commit(x,c,e,d),'awaiting_existing_proof')
   self.assertEqual(x.query('SELECT count(*) n FROM directory_claim_verifications')[0]['n'],1)
   self.assertEqual(x.query('SELECT count(*) n FROM directory_owner_grants')[0]['n'],0)
   self.assertEqual(x.query("SELECT count(*) n FROM directory_notifications WHERE outcome='ownership_verification' AND state='pending'")[0]['n'],1)
   self.assertEqual(x.query("SELECT count(*) n FROM directory_notifications WHERE kind='claim' AND outcome='needs_information' AND state='pending'")[0]['n'],0)
   self.assertTrue(x.query('SELECT directory_claim_proof_eligible(id) eligible FROM directory_claim_verifications')[0]['eligible'])
  finally:x.db.close()
 def test_staff_takeover_prevents_proof_queue(self):
  a,e=seed();x=make_agent()
  try:
   shop=x.commit_application(a,fingerprint(a),e,app_decide(a,e,[]))['installer_id'];cid=str(uuid.uuid4())
   x.query("INSERT INTO directory_claims(id,request_id,payload_hash,installer_id,name,email,relationship,correction,consent_version) VALUES(%s,%s,'qa',%s,'QA owner',%s,'owner','Correct business listing','qa-v1')",(cid,cid,shop,a['email']))
   c=x.query(claims.SELECT+' WHERE c.id=%s',(cid,))[0];d=claims.decide(c,e)
   x.query("INSERT INTO directory_action_assignments(task_key,kind,record_id,actor) VALUES(%s,'claim',%s,'QA human')",('claim:'+cid,cid))
   self.assertEqual(claims.commit(x,c,e,d),'changed_or_human_owned');self.assertEqual(x.query('SELECT count(*) n FROM directory_claim_verifications')[0]['n'],0)
  finally:x.db.close()
 def test_explicit_recovery_gets_fresh_evidence_and_a_different_proof(self):
  a,e=seed();x=make_agent()
  try:
   shop=x.commit_application(a,fingerprint(a),e,app_decide(a,e,[]))['installer_id'];cid=str(uuid.uuid4())
   x.query("INSERT INTO directory_claims(id,request_id,payload_hash,installer_id,name,email,relationship,correction,consent_version) VALUES(%s,%s,'qa-payload',%s,'QA owner',%s,'owner','Correct business listing','qa-v1')",(cid,cid,shop,a['email']))
   c=x.query(claims.SELECT+' WHERE c.id=%s',(cid,))[0]
   self.assertEqual(claims.commit(x,c,e,claims.decide(c,e)),'awaiting_business_confirmation')
   old=x.query('SELECT id FROM directory_claim_verifications WHERE claim_id=%s',(cid,))[0]['id']
   x.query("UPDATE directory_claim_verifications SET cancelled_at=NOW(),expires_at=NOW()-INTERVAL '1 hour' WHERE id=%s",(old,))
   x.query("UPDATE directory_automation_cases SET state='recovery_requested',paused=false WHERE task_key=%s",('claim:'+cid,))
   x.query("INSERT INTO directory_claim_recovery_requests(id,claim_id,kind) VALUES(%s,%s,'renewal')",(str(uuid.uuid4()),cid))
   if x.query("SELECT 1 FROM pg_roles WHERE rolname='installer_agent_v1'"):x.query('SET ROLE installer_agent_v1')
   self.assertEqual(claims.commit(x,c,e,claims.decide(c,e)),'awaiting_business_confirmation')
   rows=x.query('SELECT id,directory_claim_proof_eligible(id) eligible FROM directory_claim_verifications WHERE claim_id=%s',(cid,))
   self.assertEqual(len(rows),2);self.assertEqual(sum(r['eligible'] for r in rows),1)
   self.assertFalse(next(r['eligible'] for r in rows if r['id']==old))
   self.assertEqual(x.query('SELECT count(*) n FROM directory_owner_grants')[0]['n'],0)
  finally:x.db.close()
if __name__=='__main__':unittest.main()
