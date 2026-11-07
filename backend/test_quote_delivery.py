"""No external sends: suppression, matching and failure evidence regressions."""
import copy
import json
import unittest
import uuid
from unittest.mock import AsyncMock, patch
import httpx
from fastapi import FastAPI
import test_directory_rfq as base

rfq=base.rfq
delivery=rfq.quote_delivery
RealClient=httpx.AsyncClient


class DeliveryTests(unittest.IsolatedAsyncioTestCase):
    setUp=base.DirectoryTests.setUp
    tearDown=base.DirectoryTests.tearDown
    save_verified=base.DirectoryTests.save_verified
    routed=base.DirectoryTests.routed
    customer_fixture=base.DirectoryTests.customer_fixture
    count=base.DirectoryTests.count

    def provider(self, handler):
        return patch.object(delivery.httpx,'AsyncClient',side_effect=lambda **kwargs:RealClient(transport=httpx.MockTransport(handler),**kwargs))

    async def test_provider_checks_batch_normalize_cache_force_and_never_mutate(self):
        self.eligibility.stop(); calls=[]
        def handler(request):
            calls.append(request);self.assertEqual(request.method,'GET')
            self.assertIn('any(email,',request.url.params['filter'])
            self.assertNotIn(', ',request.url.params['filter'])
            return httpx.Response(200,json={'data':[
              {'id':'p1','attributes':{'email':'Suppressed@Example.test','subscriptions':{'email':{'marketing':{'can_receive_email_marketing':False,'suppression':[{'reason':'USER_SUPPRESSED'}]}}}}},
              {'id':'p2','attributes':{'email':'allowed@example.test','subscriptions':{'email':{'marketing':{'can_receive_email_marketing':True}}}}},
              {'id':'p3','attributes':{'email':'unknown@example.test'}}], 'links':{'next':None}})
        emails=[' Suppressed@Example.test ','allowed@example.test','new@example.test','unknown@example.test','ALLOWED@example.test']
        with self.provider(handler),patch.object(delivery,'headers',return_value={}):
            result=await delivery.recipient_states(emails,rfq.connect)
            self.assertEqual({k:v['state'] for k,v in result.items()},{'suppressed@example.test':'suppressed','allowed@example.test':'allowed','new@example.test':'allowed','unknown@example.test':'unknown'})
            await delivery.recipient_states(emails,rfq.connect);self.assertEqual(len(calls),1)
            await delivery.recipient_states(emails,rfq.connect,force=True);self.assertEqual(len(calls),2)
        with rfq.connect() as conn:
            stored=json.dumps([dict(r) for r in conn.execute('SELECT * FROM directory_recipient_checks')])
            self.assertNotIn('@',stored)

    async def test_provider_errors_partial_pages_and_duplicate_profiles_fail_closed(self):
        self.eligibility.stop()
        profile={'id':'p','attributes':{'email':'shop@example.test','subscriptions':{'email':{'marketing':{'can_receive_email_marketing':True}}}}}
        for status,data in [(429,{}),(500,{}),(200,{'data':[],'links':{'next':'next'}}),(200,{'data':[profile,profile]}),(200,{'data':None})]:
            with self.subTest(status=status,data=data),self.provider(lambda request:httpx.Response(status,json=data)),patch.object(delivery,'headers',return_value={}):
                self.assertEqual((await delivery.recipient_states(['shop@example.test'],rfq.connect,force=True))['shop@example.test']['state'],'unknown')

    async def test_network_uses_three_unique_eligible_inboxes_without_altering_branches(self):
        shops=[{**self.shop,'id':str(i),'email':email} for i,email in enumerate(['shared@example.test',' SHARED@EXAMPLE.TEST ','blocked@example.test','two@example.test','three@example.test','four@example.test'])]
        before=copy.deepcopy(shops)
        async def states(emails,*args,**kwargs):return {e.strip().lower():{'state':'suppressed' if e=='blocked@example.test' else 'allowed'} for e in emails}
        with patch.object(delivery,'recipient_states',side_effect=states):
            result=await rfq.eligible_unique_recipients(shops)
        self.assertEqual([x['id'] for x in result],['0','3','4']);self.assertEqual(shops,before)
        with patch.object(delivery,'recipient_states',AsyncMock(return_value={'shared@example.test':{'state':'unknown'}})):
            with self.assertRaises(RuntimeError):await rfq.eligible_unique_recipients(shops[:1])

    async def test_selected_suppression_never_substitutes_another_shop(self):
        with patch.object(rfq,'fetch_candidates',AsyncMock(return_value=[self.shop,{**self.shop,'id':'other','email':'other@example.test'}])),patch.object(delivery,'recipient_states',AsyncMock(return_value={self.shop['email']:{'state':'suppressed'}})):
            result=await rfq.routing_targets({**self.data,'flow':'selected','preferred_installer_id':self.shop['id']})
            self.assertEqual(result,[])

    async def test_selected_preflight_blocks_save_and_captcha_but_confirmed_retry_keeps_receipt(self):
        data={**self.data,'flow':'selected','preferred_installer_id':self.shop['id']}
        app=FastAPI();app.include_router(rfq.router)
        with patch.object(rfq.quote_safety,'config',return_value={'dispatch_enabled':True,'recipient_preflight_enabled':True}),patch.object(rfq,'selected_shop_available',AsyncMock(return_value=False)) as check,patch.object(rfq.quote_safety,'verification',AsyncMock()) as verify:
            async with RealClient(transport=httpx.ASGITransport(app=app),base_url='https://example.test',headers={'Authorization':'Bearer '+rfq.secret()}) as client:
                r=await client.post('/webhook/rfq/directory',json=data)
                self.assertEqual(r.status_code,409);self.assertEqual(r.json()['code'],'shop_unavailable');self.assertEqual(self.count('directory_requests'),0);verify.assert_not_awaited()
                saved=self.save_verified(data);r=await client.post('/webhook/rfq/directory',json=data)
                self.assertEqual(r.status_code,200);self.assertEqual(r.json()['submission_id'],saved['submission_id']);self.assertEqual(check.await_count,1)

    async def test_reminders_keep_customer_reply_and_refuse_suppression_or_negative_evidence(self):
        saved,job,client=await self.customer_fixture()
        with patch.object(rfq,'fetch_candidates',AsyncMock(return_value=[self.shop])):
            async with client:
                r=await client.post('/internal/directory-rfq/reminder-check',json={'job_id':job['id']})
                self.assertEqual(r.status_code,200);self.assertEqual(r.json()['customer_email'],self.data['email']);self.assertIn('mailto:',r.json()['customer_reply_url'])
                for state,code in [('suppressed',409),('unknown',503)]:
                    with patch.object(delivery,'recipient_states',AsyncMock(return_value={self.shop['email']:{'state':state}})) as eligibility:
                        self.assertEqual((await client.post('/internal/directory-rfq/reminder-check',json={'job_id':job['id']})).status_code,code)
                        self.assertTrue(eligibility.call_args.kwargs['force'])
                with rfq.connect() as conn:conn.execute('INSERT INTO directory_delivery_checks(job_id,state) VALUES(?,?)',(job['id'],'bounced'))
                self.assertEqual((await client.post('/internal/directory-rfq/reminder-check',json={'job_id':job['id']})).status_code,409)

    def evidence(self):
        job={'id':'job','payload':json.dumps({'installer':{'email':'shop@example.test'}})}
        trigger={'attributes':{'event_properties':{'$event_id':'job'},'datetime':'2026-11-06T01:00:00Z'}}
        event={'id':'received','attributes':{'datetime':'2026-11-06T01:00:10Z','event_properties':{'$flow':delivery.FLOW,'$message':delivery.MESSAGE,'Recipient Email Address':'shop@example.test','$event_id':delivery.MESSAGE+':send1'}},'relationships':{'metric':{'data':{'id':'T3YY6J'}}}}
        return job,trigger,event

    def test_delivery_evidence_requires_unique_trigger_and_send_and_failure_wins(self):
        job,trigger,event=self.evidence()
        self.assertEqual(delivery.evidence_for(job,[trigger],[event])['state'],'delivered')
        bounce=copy.deepcopy(event);bounce['id']='bounce';bounce['relationships']['metric']['data']['id']='UdpNYA'
        self.assertEqual(delivery.evidence_for(job,[trigger],[event,bounce])['state'],'bounced')
        self.assertEqual(delivery.evidence_for(job,[trigger,copy.deepcopy(trigger)],[event])['state'],'unconfirmed')
        another=copy.deepcopy(trigger);another['attributes']['event_properties']['$event_id']='other-job'
        self.assertEqual(delivery.evidence_for(job,[trigger,another],[event])['state'],'ambiguous')
        second=copy.deepcopy(event);second['attributes']['event_properties']['$event_id']=delivery.MESSAGE+':send2'
        self.assertEqual(delivery.evidence_for(job,[trigger],[event,second])['state'],'ambiguous')
        for key,value in [('$flow','other'),('$message','other'),('Recipient Email Address','other@example.test')]:
            wrong=copy.deepcopy(event);wrong['attributes']['event_properties'][key]=value
            self.assertEqual(delivery.evidence_for(job,[trigger],[wrong])['state'],'unconfirmed')
        self.assertEqual(delivery.epoch('2026-11-06T01:00:00-05:00'),delivery.epoch('2026-11-06T06:00:00Z'))

    async def test_monitor_preserves_evidence_on_outage_and_rejects_partial_or_wrong_profile_events(self):
        saved,job,client=await self.customer_fixture();await client.aclose()
        with rfq.connect() as conn:conn.execute('INSERT INTO directory_delivery_checks(job_id,state,event_id) VALUES(?,?,?)',(job['id'],'delivered','prior-evidence'))
        for status,data in [(500,{}),(200,{'data':[],'links':{'next':'more'}}),(200,{'data':[{'relationships':{'profile':{'data':{'id':'wrong'}}}}]})]:
            with rfq.connect() as conn:conn.execute('UPDATE directory_delivery_checks SET checked_at=0')
            with self.provider(lambda request:httpx.Response(status,json=data)),patch.object(delivery,'headers',return_value={}):
                result=await delivery.reconcile(rfq.connect);self.assertFalse(result['provider_evidence_ok'])
            with rfq.connect() as conn:
                row=conn.execute('SELECT * FROM directory_delivery_checks').fetchone();self.assertEqual(row['state'],'delivered');self.assertEqual(row['event_id'],'prior-evidence');self.assertEqual(row['last_error'],'provider_evidence_unavailable')

    async def test_alerts_only_verified_open_requests_and_no_eligible_route(self):
        saved,job,client=await self.customer_fixture();await client.aclose()
        self.assertEqual(delivery.alerts(rfq.connect)['alerts'][0]['reason'],'delivery_unconfirmed')
        with rfq.connect() as conn:conn.execute("UPDATE directory_outbox SET state='failed',last_error='recipient_suppressed_no_automatic_override' WHERE id=?",(job['id'],))
        self.assertEqual(delivery.alerts(rfq.connect)['alerts'][0]['reason'],'recipient_suppressed')
        with rfq.connect() as conn:conn.execute("UPDATE quote_intake_reviews SET state='quarantined' WHERE submission_id=?",(saved['submission_id'],))
        self.assertEqual(delivery.alerts(rfq.connect)['alerts'],[])
        with rfq.connect() as conn:
            conn.execute("UPDATE quote_intake_reviews SET state='verified' WHERE submission_id=?",(saved['submission_id'],))
            conn.execute("INSERT INTO directory_customer_actions(submission_id,state,version) VALUES(?,'closed',1)",(saved['submission_id'],))
        self.assertEqual(delivery.alerts(rfq.connect)['alerts'],[])
        other=self.save_verified({**self.data,'request_id':str(uuid.uuid4())})
        with patch.object(rfq,'routing_targets',AsyncMock(return_value=[])):await rfq.run_one_job()
        self.assertEqual(delivery.alerts(rfq.connect)['alerts'][0]['reason'],'routing_unavailable')

    async def test_admin_and_customer_status_use_delivery_evidence(self):
        saved,job,client=await self.customer_fixture()
        with rfq.connect() as conn:conn.execute('INSERT INTO directory_delivery_checks(job_id,state) VALUES(?,?)',(job['id'],'delivered'))
        self.assertEqual(rfq.status_for(saved['submission_id'])['status'],'provider_delivered')
        async with client:
            r=await client.get('/internal/directory-rfq/action-items');self.assertEqual(r.status_code,200)
            self.assertEqual(next(x for x in r.json()['items'] if x['submission_id']==saved['submission_id'])['failed_deliveries'],0)
            with rfq.connect() as conn:conn.execute("UPDATE directory_delivery_checks SET state='bounced'")
            self.assertEqual(rfq.status_for(saved['submission_id'])['status'],'needs_attention')
            r=await client.get('/internal/directory-rfq/action-items');item=next(x for x in r.json()['items'] if x['submission_id']==saved['submission_id'])
            self.assertEqual(item['failed_deliveries'],1);self.assertEqual(item['unanswered_over_48h'],0)


if __name__=='__main__':unittest.main()
