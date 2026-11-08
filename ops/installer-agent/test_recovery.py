import unittest
from unittest.mock import patch
from rules import collect_pages
from claims import fingerprint
class RecoveryTest(unittest.TestCase):
 def test_supporting_page_is_fetched_only_from_verified_site_with_existing_page_limit(self):
  def page(url,root):return {'url':url,'text':'Public source','links':['/contact','/services','/locations','/about']}
  with patch('rules.fetch_page',side_effect=page):
   pages=collect_pages('https://shop.test','https://shop.test/business-contact')
   self.assertEqual(pages[1]['url'],'https://shop.test/business-contact');self.assertLessEqual(len(pages),4)
   pages=collect_pages('https://shop.test','https://attacker.test/contact');self.assertFalse(any('attacker' in p['url'] for p in pages))
 def test_new_information_changes_claim_research_fingerprint(self):
  c={'payload_hash':'p','shop_snapshot':{'website':'https://shop.test'},'details':{}}
  old=fingerprint(c);c['details']['applicant_update']={'evidence_url':'https://shop.test/about'};self.assertNotEqual(old,fingerprint(c))
if __name__=='__main__':unittest.main()
