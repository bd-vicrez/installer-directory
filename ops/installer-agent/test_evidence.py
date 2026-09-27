import copy,unittest
from unittest.mock import patch
from test_rules import fixture
from evidence import review_ai
from rules import ai_valid

class Reply:
 ok=True
 def __init__(self,data):self.data=data
 def json(self):return self.data
def response(ai):return Reply({'stop_reason':'tool_use','model':'qa-model','usage':{'input_tokens':1,'output_tokens':1},'content':[{'type':'tool_use','name':'record_review','input':copy.deepcopy(ai)}]})
class EvidenceTest(unittest.TestCase):
 def test_invalid_quote_gets_one_retry_with_original_evidence(self):
  app,ev=fixture();good=ev['ai'];bad=copy.deepcopy(good);bad['evidence'][0]['quote']='A quotation that is not on the website.'
  with patch('evidence.requests.post',side_effect=[response(bad),response(good)]) as post:
   result=review_ai(app,ev,{'model':'qa-model','anthropic_key':'qa-only'})
  self.assertEqual(post.call_count,2);self.assertTrue(result['_quotation_retry']);self.assertTrue(ai_valid(result,ev['pages'],app['install_capabilities']))
 def test_retry_still_fails_closed(self):
  app,ev=fixture();bad=copy.deepcopy(ev['ai']);bad['evidence'][0]['quote']='A quotation that is not on the website.'
  with patch('evidence.requests.post',side_effect=[response(bad),response(bad)]) as post:
   result=review_ai(app,ev,{'model':'qa-model','anthropic_key':'qa-only'})
  self.assertEqual(post.call_count,2);self.assertFalse(ai_valid(result,ev['pages'],app['install_capabilities']))
if __name__=='__main__':unittest.main()
