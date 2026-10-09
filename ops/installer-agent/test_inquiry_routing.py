import unittest
from datetime import datetime, timezone
from agent import Agent


class RoutingTests(unittest.TestCase):
    def test_unmatched_recent_inquiry_goes_to_staff_without_reminder(self):
        a=Agent.__new__(Agent);a.live=False;a.cfg={'owner_name':'Staff owner'};a.report={'inquiries':[]}
        row={'submission_id':1,'created_at':datetime.now(timezone.utc).isoformat(),'email':'example@example.com','vehicle_year':2020,'vehicle_make':'Example','vehicle_model':'Car','service':'other','routing_state':'needs_review','deliveries':[]}
        a.current_requests=lambda:([row],True);a.query=lambda *args:[];a.case=lambda *args:None;a.human_owned=lambda *args:False
        a.reminder=lambda *args:self.fail('Unmatched inquiries must not queue shop reminders')
        a.inquiries()
        result=a.report['inquiries'][0]
        self.assertEqual(result['state'],'staff_attention');self.assertIn('No eligible shop delivery',result['next_step'])
        message=a.customer_message('VZ-1','routing_review',False)
        self.assertIn('could not be matched',message);self.assertNotIn('checking for a response',message)
        self.assertIn('needs staff review to find an eligible shop',a.inquiry_public_status(row))

    def test_public_status_distinguishes_delivered_and_answered_requests(self):
        a=Agent.__new__(Agent)
        row={'routing_state':'routed','deliveries':[{}]}
        self.assertIn('monitored for a shop response',a.inquiry_public_status(row))
        row['deliveries'][0]['response_state']='accepted'
        self.assertIn('response is recorded',a.inquiry_public_status(row))


if __name__=='__main__':unittest.main()
