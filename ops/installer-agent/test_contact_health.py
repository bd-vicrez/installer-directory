import unittest
from unittest.mock import patch
import contact_health as h


class ContactHealthTests(unittest.TestCase):
    def test_invalid_scraped_content_is_not_an_email(self):
        for email in ['photo@2x.webp\" src=x', 'a@gmail.com&quot;],&quot;type', 'a@-bad.com', 'a@@x.com', '']:
            self.assertIsNone(h.email_domain(email))
        self.assertEqual(h.email_domain('Shop+quotes@Example.COM'), 'example.com')

    def test_two_resolvers_must_agree_before_dns_pause(self):
        for pair, state in [(['nxdomain']*2, 'failed'), (['null_mx']*2, 'failed'), (['no_mail_route']*2, 'failed'), (['nxdomain','unknown'], 'review'), (['nxdomain','mail_route'], 'review'), (['mail_route','implicit_mail_route'], 'clear')]:
            with self.subTest(pair=pair), patch.object(h, 'resolver_result', side_effect=pair):
                self.assertEqual(h.check_domain('example.com')['state'], state)

    def test_no_mx_with_address_records_is_valid_fallback(self):
        def query(resolver, domain, kind):
            return {'status': 0, 'answers': ['192.0.2.1'] if kind=='A' else []}
        self.assertEqual(h.resolver_result('resolver','example.com',query), 'implicit_mail_route')

    def test_null_mx_and_servfail_are_distinct(self):
        for response, expected in [({'status':0,'answers':['0 .']},'null_mx'), ({'status':2},'unknown')]:
            self.assertEqual(h.resolver_result('r','x.com',lambda *a: response), expected)

    def test_policy_block_does_not_mean_invalid_recipient(self):
        dns={'state':'clear','reason':'dns_route_present'}
        for category, reason, expected in [('blocks','550 5.7.1 policy','review'),('bounces','550 5.7.1 policy','review'),('bounces','550 5.1.1 no such user','failed'),('unsubscribes','','failed'),('spam_reports','','failed'),('invalid_emails','','failed')]:
            self.assertEqual(h.verdict('shop@example.com',dns,[{'category':category,'reason':reason}])[0],expected)
        self.assertEqual(h.verdict('shop@example.com',dns,[],False)[0],'review')

    def test_provider_pagination_filters_unrelated_addresses(self):
        calls=[]
        class Response:
            def __init__(self,rows): self.rows=rows
            def raise_for_status(self): pass
            def json(self): return self.rows
        def get(url,params,**kwargs):
            calls.append((url,params))
            self.assertEqual(params['limit'],500)
            return Response([{'email':'unrelated@example.com'}]*500 if params['offset']==0 else [{'email':'shop@example.com','reason':'550 5.1.1'}])
        result, errors=h.suppression_snapshot('test',{'shop@example.com'},get)
        self.assertFalse(errors);self.assertEqual(len(calls),10)
        self.assertEqual(list(result),['shop@example.com']);self.assertEqual(len(result['shop@example.com']),5)

    def test_provider_failure_is_visible(self):
        def get(*a,**kw): raise h.requests.Timeout()
        _, errors=h.suppression_snapshot('test',{'shop@example.com'},get)
        self.assertEqual(set(errors),set(h.CATEGORIES))

    def test_changed_contact_is_never_paused(self):
        class Cursor:
            def __enter__(self):return self
            def __exit__(self,*a):pass
            def execute(self,sql,args):
                if not sql.startswith('SELECT'):raise AssertionError('Unexpected mutation')
            def fetchone(self):return {'status':'active','quote_routing_enabled':True,'owner_inquiry_paused':False,'routing_email':'new@example.com','updated_at':'now'}
        class DB:
            def __enter__(self):return self
            def __exit__(self,*a):pass
            def cursor(self,**kw):return Cursor()
        self.assertFalse(h.apply_failure(DB(),{'installer_id':'shop','state':'failed','recipient_hash':h.recipient_key('old@example.com')},{'quote_routing_enabled':True,'updated_at':'now'},'Staff'))

    def test_dry_or_uncertain_results_do_not_update_database(self):
        for state in ['clear','review']:
            self.assertFalse(h.apply_failure(None,{'state':state},{'quote_routing_enabled':True},'Staff'))
        self.assertFalse(h.apply_failure(None,{'state':'failed'},{'quote_routing_enabled':False},'Staff'))

    def test_budget_exhaustion_is_uncertain(self):
        with patch.object(h,'resolver_result',side_effect=AssertionError('No network after budget')):
            self.assertEqual(h.check_domain('example.com',0)['state'],'review')


if __name__=='__main__':unittest.main()
