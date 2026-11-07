import copy,unittest
from unittest.mock import patch
from test_rules import fixture
from evidence import review_ai,EvidenceUnavailable,source_passages
from rules import ai_valid

class Reply:
 ok=True
 def __init__(self,data):self.data=data
 def json(self):return self.data
def response(ai):return Reply({'stop_reason':'tool_use','model':'qa-model','usage':{'input_tokens':1,'output_tokens':1},'content':[{'type':'tool_use','name':'record_review','input':copy.deepcopy(ai)}]})
class EvidenceTest(unittest.TestCase):
 def test_numbered_sources_produce_exact_quotes(self):
  app,ev=fixture();ids=list(source_passages(ev['pages']))[:2];ev['ai']['evidence']=[{'source_id':x} for x in ids]
  with patch('evidence.requests.post',return_value=response(ev['ai'])):
   result=review_ai(app,ev,{'model':'qa-model','anthropic_key':'qa-only'})
  self.assertTrue(ai_valid(result,ev['pages'],app['install_capabilities']));self.assertEqual(result['_source_ids'],ids)
 def test_invented_or_repeated_source_ids_fail_closed(self):
  for refs in ([{'source_id':'invented'},{'source_id':'also-invented'}],[{'source_id':'p1-1'},{'source_id':'p1-1'}],[{'source_id':['invalid']},{'source_id':'p1-2'}]):
   app,ev=fixture();ev['ai']['evidence']=refs
   with patch('evidence.requests.post',side_effect=[response(ev['ai']),response(ev['ai'])]):
    with self.assertRaises(EvidenceUnavailable):review_ai(app,ev,{'model':'qa-model','anthropic_key':'qa-only'})
 def test_invalid_quote_gets_one_retry_with_original_evidence(self):
  app,ev=fixture();good=ev['ai'];bad=copy.deepcopy(good);bad['evidence'][0]['quote']='A quotation that is not on the website.'
  with patch('evidence.requests.post',side_effect=[response(bad),response(good)]) as post:
   result=review_ai(app,ev,{'model':'qa-model','anthropic_key':'qa-only'})
  self.assertEqual(post.call_count,2);self.assertTrue(result['_quotation_retry']);self.assertTrue(ai_valid(result,ev['pages'],app['install_capabilities']))
 def test_retry_still_fails_closed(self):
  app,ev=fixture();bad=copy.deepcopy(ev['ai']);bad['evidence'][0]['quote']='A quotation that is not on the website.'
  with patch('evidence.requests.post',side_effect=[response(bad),response(bad)]) as post:
   with self.assertRaises(EvidenceUnavailable):review_ai(app,ev,{'model':'qa-model','anthropic_key':'qa-only'})
  self.assertEqual(post.call_count,2)
 def test_long_verified_passage_is_safely_shortened(self):
  app,ev=fixture();quote='Verified continuous passage about commercial vehicle wraps. '*7
  ev['pages'][0]['text']+=' '+quote;ev['ai']['evidence'][0]['quote']=quote
  with patch('evidence.requests.post',return_value=response(ev['ai'])) as post:
   result=review_ai(app,ev,{'model':'qa-model','anthropic_key':'qa-only'})
  self.assertEqual(post.call_count,1);self.assertTrue(ai_valid(result,ev['pages'],app['install_capabilities']));self.assertLessEqual(len(result['evidence'][0]['quote']),240)
 def test_unverified_suffix_is_not_hidden_by_shortening(self):
  app,ev=fixture();quote='Verified continuous passage about commercial vehicle wraps. '*7
  ev['pages'][0]['text']+=' '+quote;ev['ai']['evidence'][0]['quote']=quote+' Invented certification and invented address.'
  with patch('evidence.requests.post',side_effect=[response(ev['ai']),response(ev['ai'])]):
   with self.assertRaises(EvidenceUnavailable):review_ai(app,ev,{'model':'qa-model','anthropic_key':'qa-only'})
if __name__=='__main__':unittest.main()
