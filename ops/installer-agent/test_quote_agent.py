import unittest
from datetime import datetime,timezone
from unittest.mock import Mock
from agent import Agent

class QuoteAgentTests(unittest.TestCase):
 def agent(self,row):
  a=Agent.__new__(Agent);a.live=False;a.cfg={'owner_name':'Luis V.','owner_zendesk_id':42,'brand_id':1,'group_id':2,'max_messages_per_run':5};a.report={'inquiries':[],'messages':[]}
  a.current_requests=lambda:([row],True);a.query=Mock(return_value=[]);a.case=lambda *args:None;a.human_owned=lambda *args:False
  a.reminder=Mock(side_effect=AssertionError('Must not queue reminder'))
  return a
 def row(self):
  return {'submission_id':1,'created_at':datetime.now(timezone.utc).isoformat(),'email':'bd@vicrez.com','vehicle_year':2024,'vehicle_make':'Honda','vehicle_model':'Civic','service':'body-kits','routing_state':'matched','deliveries':[{'state':'accepted','delivery_unconfirmed_over_1h':1}]}
 def test_held_and_quarantined_requests_never_queue_customer_messages(self):
  for state in ['held','quarantined',None]:
   row=self.row()
   if state:row['intake_review']={'state':state}
   a=self.agent(row);a.live=True
   # Staff tracking is exercised separately; this fixture disallows any outbound preparation.
   a.db=Mock();a.db.__enter__=Mock(return_value=a.db);a.db.__exit__=Mock(return_value=False)
   cursor=Mock();cursor.__enter__=Mock(return_value=cursor);cursor.__exit__=Mock(return_value=False);a.db.cursor=Mock(return_value=cursor)
   a.save_case=Mock();a.assign=Mock();a.inquiries()
   self.assertEqual(a.report['inquiries'][0]['customer_update'],'held');a.reminder.assert_not_called()
   self.assertFalse(any('INSERT INTO directory_automation_messages' in str(c) for c in a.query.call_args_list))
   a.assign.assert_called_once()
 def test_unconfirmed_provider_acceptance_goes_to_staff_without_reminder(self):
  row=self.row();row['intake_review']={'state':'verified'};a=self.agent(row);a.inquiries()
  self.assertEqual(a.report['inquiries'][0]['state'],'staff_attention');self.assertIn('delivery is unconfirmed',a.report['inquiries'][0]['next_step']);a.reminder.assert_not_called()
 def test_dispatch_rechecks_verification_before_any_send(self):
  row=self.row();row['intake_review']={'state':'quarantined'};a=self.agent(row);a.live=True
  m={'record_ids':[1],'recipient':'bd@vicrez.com','event_key':'test:initial'}
  a.query=Mock(side_effect=lambda sql,*args:[m] if sql.startswith('SELECT * FROM directory_automation_messages') else [])
  a.rfq=lambda *args,**kwargs:{'requests':[row]};a.send_message=Mock(side_effect=AssertionError('Must not send'));a.dispatch();a.send_message.assert_not_called()
 def test_new_customer_ticket_is_private_before_single_public_message(self):
  row=self.row();a=self.agent(row);a.live=True
  user={'id':9,'active':True,'email':'bd@vicrez.com'}
  ticket={'id':88,'requester_id':9,'assignee_id':42,'updated_at':'2026-11-02T00:00:00Z','tags':['installer_quote_inquiry'],'status':'open'}
  calls=[]
  class Response:
   def __init__(self,d,status=200):self.d=d;self.status_code=status;self.ok=True
   def json(self):return self.d
  def zd(method,path,**kw):
   calls.append((method,path,kw))
   if path=='search.json':return Response({'results':[]})
   if path=='users/search.json':return Response({'users':[user]})
   if path=='tickets.json':
    t=kw['json']['ticket'];self.assertFalse(t['comment']['public']);self.assertEqual(t['recipient'],'b2bsupport@vicrezcom.zendesk.com');self.assertIn('installer_quote_inquiry',t['tags'])
    return Response({'ticket':ticket,'audit':{'events':[]}},201)
   if method=='GET':return Response({'ticket':ticket})
   self.assertTrue(kw['json']['ticket']['comment']['public'])
   # Stop before writing fake database/audit state; the two-step transport is verified.
   return Response({'ticket':ticket,'audit':{'events':[{'type':'Notification','recipients':[9]}]}})
  a.zd=zd
  a.db=Mock();a.db.__enter__=Mock(return_value=a.db);a.db.__exit__=Mock(return_value=False)
  cursor=Mock();cursor.__enter__=Mock(return_value=cursor);cursor.__exit__=Mock(return_value=False);a.db.cursor=Mock(return_value=cursor)
  import agent
  old=agent.atomic;agent.atomic=lambda *args:None
  try:a.send_message({'record_ids':[1],'recipient':'bd@vicrez.com','event_key':'test:initial','ticket_id':None,'subject':'Internal test','body':'Vicrez Installer Assistant (automated)'})
  finally:agent.atomic=old
  self.assertEqual(sum(m=='POST' and p=='tickets.json' for m,p,k in calls),1)
  self.assertEqual(sum(m=='PUT' and p=='tickets/88.json' for m,p,k in calls),1)
  self.assertEqual(a.report['messages'][0]['state'],'sent')

 def test_old_ticket_without_safeguards_is_held_before_public_send(self):
  a=self.agent(self.row());a.ticket_human_reply=lambda tid:False
  response=Mock();response.ok=True;response.json.return_value={'ticket':{'id':88,'tags':[],'recipient':'support@vicrezcom.zendesk.com'}}
  a.zd=Mock(return_value=response)
  a.send_message({'record_ids':[1],'recipient':'bd@vicrez.com','event_key':'test:followup','ticket_id':88,'subject':'Test','body':'Test'})
  self.assertEqual(a.zd.call_count,1)
  self.assertTrue(any("state='held'" in str(c) for c in a.query.call_args_list))

if __name__=='__main__':unittest.main()
