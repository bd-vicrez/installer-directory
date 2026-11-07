import copy,unittest
from claims import contact_basis,decide,fingerprint
from test_rules import fixture

def claim_fixture():
 a,e=fixture();c={'id':'qa-claim','payload_hash':'qa-hash','email':a['email'],'relationship':'owner','consent_at':a['consent_at'],'consent_version':'claim-v1','ownership_conflict':False,
 'shop_snapshot':{**{k:a[k] for k in ('id','business_name','street_address','city','state','zip_code','phone','website')},'status':'active'}}
 return c,e
class ClaimsTest(unittest.TestCase):
 def test_domain_contact_is_eligible_for_challenge_not_owner_access(self):
  c,e=claim_fixture();d=decide(c,e);self.assertEqual(d['state'],'awaiting_business_confirmation');self.assertNotIn('grant_id',d)
 def test_lookalike_subdomain_and_personal_email_not_assumed_authorized(self):
  for email in ('owner@wrapstudio.test.attacker.test','owner@unrelated.test','owner@gmail.com'):
   c,e=claim_fixture();c['email']=email;self.assertEqual(decide(c,e)['state'],'staff_attention')
 def test_public_email_requires_mailto_and_independent_shop_contact_classification(self):
  c,e=claim_fixture();c['email']='shop@gmail.com';p=e['pages'][0];p['text']+=' Contact our shop: shop@gmail.com';
  self.assertIsNone(contact_basis(c,e));p['links']=['mailto:shop@gmail.com'];self.assertIsNone(contact_basis(c,e))
  e['ai']['business_contact_emails']=['shop@gmail.com'];self.assertEqual(contact_basis(c,e),'published_business_email')
 def test_agency_former_employee_and_test_claims_require_staff(self):
  for rel in ('Marketing Agency','former employee test','Independent security researcher','SEO consultant'):
   c,e=claim_fixture();c['relationship']=rel;self.assertEqual(decide(c,e)['state'],'staff_attention')
 def test_owner_conflict_closed_shop_and_missing_evidence_hold(self):
  for field in ('conflict','closed','phone','source','ai'):
   c,e=claim_fixture()
   if field=='conflict':c['ownership_conflict']=True
   elif field=='closed':c['shop_snapshot']['status']='removed'
   elif field=='phone':e['place']['nationalPhoneNumber']='9805559999'
   elif field=='source':e['pages'][0]['text']='No business evidence'
   else:e['ai']['safe_public_address']=False
   self.assertEqual(decide(c,e)['state'],'staff_attention')
 def test_fingerprint_binds_business_identity_and_claim_content(self):
  c,e=claim_fixture();other=copy.deepcopy(c);other['shop_snapshot']['phone']='changed';self.assertNotEqual(fingerprint(c),fingerprint(other));other=copy.deepcopy(c);other['payload_hash']='new';self.assertNotEqual(fingerprint(c),fingerprint(other))
if __name__=='__main__':unittest.main()
