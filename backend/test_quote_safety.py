import json
import sqlite3
import unittest
import uuid
from unittest.mock import AsyncMock, patch
import httpx
from fastapi import FastAPI, HTTPException
import test_directory_rfq as fixtures
rfq=fixtures.rfq

class SafetyTests(unittest.IsolatedAsyncioTestCase):
    setUp=fixtures.DirectoryTests.setUp
    tearDown=fixtures.DirectoryTests.tearDown
    count=fixtures.DirectoryTests.count
    save_verified=fixtures.DirectoryTests.save_verified

    def client(self):
        app=FastAPI();app.include_router(rfq.router)
        return httpx.AsyncClient(transport=httpx.ASGITransport(app=app),base_url='https://installers.vicrez.com',headers={'Authorization':'Bearer '+rfq.secret()})

    async def test_missing_configuration_saves_review_without_any_outbound_jobs(self):
        with patch.object(rfq.quote_safety,'config',return_value={}):
            async with self.client() as c:
                r=await c.post('/webhook/rfq/directory',json=self.data)
                self.assertEqual(r.status_code,200)
                sid=r.json()['submission_id']
                self.assertEqual(rfq.status_for(sid)['status'],'routing_needed')
                self.assertFalse(await rfq.run_one_job())
                self.assertEqual((await c.get('/internal/directory-rfq/verification-config')).json(),{'sitekey':None,'mode':'manual_review'})
        with rfq.connect() as conn:
            self.assertEqual(conn.execute('SELECT state FROM directory_outbox').fetchone()[0],'held')
            self.assertEqual(conn.execute('SELECT state FROM quote_intake_reviews').fetchone()[0],'held')

    async def test_confirmed_retry_does_not_reverify_or_promote_held_request(self):
        async with self.client() as c:
            with patch.object(rfq.quote_safety,'verification',AsyncMock(return_value={'state':'held','reason':'verification_setup_pending'})) as verify:
                a=await c.post('/webhook/rfq/directory',json=self.data)
                b=await c.post('/webhook/rfq/directory',json={**self.data,'hcaptcha_token':'changed-single-use-token'})
                self.assertEqual(a.json()['submission_id'],b.json()['submission_id'])
                self.assertTrue(b.json()['duplicate']);verify.assert_awaited_once()
                changed=await c.post('/webhook/rfq/directory',json={**self.data,'notes':'different'})
                self.assertEqual(changed.status_code,409)
        with rfq.connect() as conn:self.assertEqual(conn.execute('SELECT state FROM quote_intake_reviews').fetchone()[0],'held')

    async def test_reserved_addresses_and_injected_names_never_create_records(self):
        async with self.client() as c:
            for change in [{'email':'t@example.com'},{'email':'a@foo.invalid'},{'full_name':'${7*7} <%=7*7%>'}]:
                self.assertEqual((await c.post('/webhook/rfq/directory',json={**self.data,**change})).status_code,400)
        self.assertEqual(self.count('directory_requests'),0)

    async def test_token_checks_require_success_expected_hostname_and_real_configuration(self):
        cfg={'sitekey':'real-account-site','secret':'isolated-test-value'*3,'dispatch_enabled':True}
        for body in [{'success':False},{'success':True,'hostname':'attacker.example'},{'success':'true','hostname':'installers.vicrez.com'}]:
            transport=httpx.MockTransport(lambda request:httpx.Response(200,json=body))
            real=httpx.AsyncClient
            with patch.object(rfq.quote_safety,'config',return_value=cfg),patch.object(rfq.quote_safety.httpx,'AsyncClient',lambda **kw:real(transport=transport,**kw)):
                with self.assertRaises(HTTPException):await rfq.quote_safety.verification('bad-token')
        with patch.object(rfq.quote_safety,'config',return_value=cfg):
            with self.assertRaises(HTTPException):await rfq.quote_safety.verification(None)
        self.assertFalse(rfq.quote_safety.captcha_ready({**cfg,'sitekey':'10000000-ffff-ffff-ffff-000000000001'}))

    async def test_provider_timeout_holds_and_success_hashes_token_without_storing_secret(self):
        cfg={'sitekey':'real-account-site','secret':'isolated-test-value'*3,'dispatch_enabled':True}
        real=httpx.AsyncClient
        def fail(request):raise httpx.ReadTimeout('isolated')
        with patch.object(rfq.quote_safety,'config',return_value=cfg),patch.object(rfq.quote_safety.httpx,'AsyncClient',lambda **kw:real(transport=httpx.MockTransport(fail),**kw)):
            self.assertEqual((await rfq.quote_safety.verification('token'))['state'],'held')
        def success(request):
            self.assertEqual(str(request.url),'https://api.hcaptcha.com/siteverify')
            self.assertIn(b'sitekey=real-account-site',request.content)
            return httpx.Response(200,json={'success':True,'hostname':'installers.vicrez.com'})
        with patch.object(rfq.quote_safety,'config',return_value=cfg),patch.object(rfq.quote_safety.httpx,'AsyncClient',lambda **kw:real(transport=httpx.MockTransport(success),**kw)):
            decision=await rfq.quote_safety.verification('private-response-token')
        self.assertEqual(decision['state'],'verified');self.assertNotIn('private-response-token',json.dumps(decision));self.assertNotIn(cfg['secret'],json.dumps(decision))

    async def test_token_reuse_for_another_request_rolls_back_all_rows(self):
        decision={'state':'verified','reason':'captcha_verified','token_hash':'one-time-token-hash'}
        rfq.save_submission(self.data,decision)
        with self.assertRaises(sqlite3.IntegrityError):rfq.save_submission({**self.data,'request_id':str(uuid.uuid4())},decision)
        self.assertEqual(self.count('directory_requests'),1);self.assertEqual(self.count('directory_outbox'),1)

    async def test_staff_release_is_scoped_audited_and_idempotent(self):
        sid=rfq.save_submission(self.data)['submission_id']
        body={'submission_id':sid,'action':'release','actor':'Luis V.','note':'Verified real project and the recorded sharing permission.','confirmed':True,'version':0,'action_id':str(uuid.uuid4())}
        async with self.client() as c:
            self.assertEqual((await c.post('/internal/directory-rfq/intake-review',json={**body,'confirmed':False})).status_code,400)
            self.assertEqual((await c.post('/internal/directory-rfq/intake-review',json=body)).status_code,200)
            self.assertTrue((await c.post('/internal/directory-rfq/intake-review',json=body)).json()['duplicate'])
            self.assertEqual((await c.post('/internal/directory-rfq/intake-review',json={**body,'action_id':str(uuid.uuid4())})).status_code,409)
        with rfq.connect() as conn:
            self.assertTrue(rfq.quote_safety.may_dispatch(conn,sid))
            self.assertEqual(conn.execute('SELECT count(*) FROM quote_intake_audit').fetchone()[0],1)
            self.assertEqual(conn.execute('SELECT state FROM directory_outbox').fetchone()[0],'pending')

    async def test_legacy_records_are_visible_but_cannot_be_released_without_consent(self):
        with rfq.connect() as conn:conn.execute("INSERT INTO quote_intake_reviews(submission_id,source,state,reason) VALUES(1,'legacy','quarantined','invalid_probe')")
        async with self.client() as c:
            d=(await c.get('/internal/directory-rfq/requests?id=1')).json()['requests'][0]
            self.assertEqual(d['intake_review']['state'],'quarantined');self.assertEqual(d['deliveries'],[])
            self.assertIn(1,[i['submission_id'] for i in (await c.get('/internal/directory-rfq/action-items')).json()['items']])
            r=await c.post('/internal/directory-rfq/intake-review',json={'submission_id':1,'action':'release','actor':'Luis V.','note':'This legacy record has no recorded consent.','confirmed':True,'version':0,'action_id':str(uuid.uuid4())})
            self.assertEqual(r.status_code,409)

    async def test_quarantine_blocks_pending_delivery_and_preserves_request(self):
        sid=self.save_verified(self.data)['submission_id'];job=rfq.lease_job()
        with rfq.connect() as conn:conn.execute("UPDATE quote_intake_reviews SET state='quarantined' WHERE submission_id=?",(sid,))
        with patch.object(rfq,'routing_targets',AsyncMock()) as route:
            await rfq.run_route_job(job);route.assert_not_awaited()
        with rfq.connect() as conn:self.assertEqual(conn.execute('SELECT state FROM directory_outbox').fetchone()[0],'held')
        self.assertEqual(self.count('directory_requests'),1)

    async def test_suppressed_recipient_becomes_failed_without_provider_retry(self):
        sid=self.save_verified(self.data)['submission_id']
        with patch.object(rfq,'routing_targets',AsyncMock(return_value=[self.shop])):await rfq.run_one_job()
        with patch.object(rfq,'fetch_candidates',AsyncMock(return_value=[self.shop])),patch.object(rfq,'send_installer_event',AsyncMock(return_value='recipient_suppressed')) as send:
            await rfq.run_one_job();await rfq.run_one_job();send.assert_awaited_once()
        with rfq.connect() as conn:
            row=conn.execute("SELECT state,last_error FROM directory_outbox WHERE kind='installer'").fetchone()
        self.assertEqual(row['state'],'failed');self.assertIn('suppressed',row['last_error'])

    def test_contact_and_global_limits_are_bounded_without_storing_identifiers(self):
        with rfq.connect() as conn:
            for _ in range(6):rfq.quote_safety.rate_limit(conn,self.data,'isolated-limit-key')
        with self.assertRaises(HTTPException) as error:
            with rfq.connect() as conn:rfq.quote_safety.rate_limit(conn,self.data,'isolated-limit-key')
        self.assertEqual(error.exception.status_code,429)
        with rfq.connect() as conn:
            rows=[dict(x) for x in conn.execute('SELECT * FROM quote_intake_limits')]
        self.assertEqual(len(rows),3);self.assertNotIn(self.data['email'],json.dumps(rows));self.assertNotIn(self.data['phone'],json.dumps(rows))

if __name__=='__main__':unittest.main()
