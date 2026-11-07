import tempfile,unittest
from pathlib import Path
from unittest.mock import patch
from agent import Agent
class VerificationRunTest(unittest.TestCase):
 def test_hourly_scope_never_routes_quotes_or_dispatches_messages(self):
  a=object.__new__(Agent);a.live=False;a.report={'errors':[]};seen=[]
  a.query=lambda *args:[{'locked':True}]
  a.applications=lambda:seen.append('applications')
  a.verification_health=lambda:seen.append('health')
  def forbidden(*args):raise AssertionError('Hourly scope must not operate inquiry workflows')
  a.inquiries=a.dispatch=a.health=forbidden
  with tempfile.TemporaryDirectory() as tmp,patch('agent.ROOT',Path(tmp)),patch('agent.claims.run',side_effect=lambda worker:seen.append('claims')),patch('agent.contact_health.run',side_effect=forbidden):
   a.run(verification_only=True)
  self.assertEqual(seen,['applications','claims','health'])
if __name__=='__main__':unittest.main()
