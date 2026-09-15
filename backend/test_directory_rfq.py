"""Isolated tests: temporary SQLite records and mocked provider/routing calls."""
import asyncio
import importlib.util
import json
import sqlite3
import tempfile
import time
import unittest
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from unittest.mock import AsyncMock, patch

import httpx
from fastapi import FastAPI, HTTPException

spec = importlib.util.spec_from_file_location('directory_rfq',Path(__file__).with_name('directory_rfq.py'))
rfq = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rfq)


class DirectoryTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        rfq.DB_PATH = str(Path(self.tmp.name)/'rfq.sqlite')
        self.secret = patch.object(rfq,'secret',return_value='isolated-test-secret-'*3); self.secret.start()
        with sqlite3.connect(rfq.DB_PATH) as conn:
            conn.execute('''CREATE TABLE rfq_submissions(id INTEGER PRIMARY KEY AUTOINCREMENT,full_name TEXT,email TEXT,phone TEXT,
              vehicle_year INTEGER,vehicle_make TEXT,vehicle_model TEXT,kit_interest TEXT,install_timeline TEXT,zip_code TEXT,budget_range TEXT,
              preferred_installer_id TEXT,notes TEXT,source_page TEXT,request_id TEXT UNIQUE,status TEXT,is_b2b INTEGER)''')
            conn.execute("INSERT INTO rfq_submissions(full_name,email,status) VALUES('Legacy','legacy@example.test','new')")
        conn.close()
        rfq.init_directory_db()
        self.data = rfq.validate_submission(dict(request_id=str(uuid.uuid4()),full_name='Test Customer',email='customer@example.test',phone='2125550100',vehicle_year=2024,vehicle_make='Dodge',vehicle_model='Charger',what_needed='Install rear diffuser',service='body-kits',flow='network',zip_code='10001',sharing_consent=True,consent_version='directory-quote-2026-09-15'))
        self.shop = dict(id='shop-one',business_name='Test Shop',email='shop@example.test',city='Test City',state='NY',zip_code='10001',lat=40.75,lng=-73.99,services=['body-kits'])
    def tearDown(self):
        self.secret.stop()
        assert Path(self.tmp.name).resolve().parent == Path(tempfile.gettempdir()).resolve()
        self.tmp.cleanup()
    def count(self,table):
        with rfq.connect() as conn:return conn.execute('SELECT count(*) FROM '+table).fetchone()[0]
    def ready(self):
        with rfq.connect() as conn:conn.execute("UPDATE directory_outbox SET next_attempt=0,lease_until=0 WHERE state IN ('pending','sending')")
    async def routed(self):
        saved=rfq.save_submission(self.data)
        with patch.object(rfq,'routing_targets',AsyncMock(return_value=[self.shop])):await rfq.run_one_job()
        return saved

    async def test_durable_measurement_reconciles_without_personal_data_or_duplicate_events(self):
        await self.routed()
        rfq.save_submission(self.data)
        with patch.object(rfq,'fetch_candidates',AsyncMock(return_value=[self.shop])),patch.object(rfq,'send_installer_event',AsyncMock(return_value=202)):
            await rfq.run_one_job()
        with rfq.connect() as conn:
            rows=[dict(row) for row in conn.execute('SELECT * FROM directory_measurement_events')]
        self.assertEqual(sorted(row['event'] for row in rows),['quote_matched','quote_notification_accepted','quote_saved'])
        self.assertEqual(len({row['request_ref'] for row in rows}),1)
        for value in [self.data['email'],self.data['phone'],self.data['full_name'],self.data['zip_code'],self.data['notes'],self.shop['email']]:
            if value:self.assertNotIn(value,json.dumps(rows))
        rfq.init_directory_db()
        self.assertEqual(self.count('directory_measurement_events'),3)

    async def test_measurement_endpoint_is_private_aggregate_and_reconciles(self):
        rfq.save_submission(self.data)
        app=FastAPI();app.include_router(rfq.router)
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),base_url='https://example.test') as client:
            self.assertEqual((await client.get('/internal/directory-rfq/measurement')).status_code,401)
            response=await client.get('/internal/directory-rfq/measurement',headers={'Authorization':'Bearer '+rfq.secret()})
        data=response.json();self.assertEqual(data['saved_requests'],1);self.assertTrue(data['reconciled'])
        self.assertNotIn(self.data['email'],response.text);self.assertNotIn('request_ref',response.text)

    def test_migration_keeps_legacy_and_does_not_backfill_notifications(self):
        rfq.init_directory_db();rfq.init_directory_db()
        self.assertEqual(self.count('rfq_submissions'),1);self.assertEqual(self.count('directory_outbox'),0)
    def test_request_and_outbox_are_atomic(self):
        with rfq.connect() as conn:conn.execute("CREATE TRIGGER reject_job BEFORE INSERT ON directory_outbox BEGIN SELECT RAISE(ABORT,'fixture'); END")
        with self.assertRaises(sqlite3.IntegrityError):rfq.save_submission(self.data)
        self.assertEqual(self.count('rfq_submissions'),1);self.assertEqual(self.count('directory_requests'),0)
    def test_same_payload_is_idempotent_but_edited_payload_conflicts(self):
        first=rfq.save_submission(self.data);second=rfq.save_submission(self.data)
        self.assertEqual(first['submission_id'],second['submission_id']);self.assertTrue(second['duplicate'])
        with self.assertRaises(HTTPException) as caught:rfq.save_submission({**self.data,'notes':'Changed after uncertain receipt'})
        self.assertEqual(caught.exception.status_code,409);self.assertEqual(self.count('directory_outbox'),1)
    def test_concurrent_retries_create_one_submission(self):
        with ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(rfq.save_submission,[self.data,self.data]))
        self.assertEqual(results[0]['submission_id'],results[1]['submission_id']);self.assertEqual(self.count('rfq_submissions'),2)
    def test_receipts_are_signed_and_scoped_to_request(self):
        saved=rfq.save_submission(self.data)
        self.assertEqual(rfq.verify_receipt(saved['receipt_token']),(saved['submission_id'],self.data['request_id']))
        with self.assertRaises(HTTPException):rfq.verify_receipt(saved['receipt_token'][:-6]+'tamper')
        with patch.object(rfq.time,'time',return_value=time.time()+8*86400):
            with self.assertRaises(HTTPException):rfq.verify_receipt(saved['receipt_token'])
    def test_validation_requires_actual_consent_and_valid_service(self):
        for changed in [{'sharing_consent':'true'},{'service':'unknown'},{'email':'bad'},{'flow':'network','preferred_installer_id':'shop'},{'zip_code':'invalid'},{'vehicle_make':'Dodge\nInjected'},{'notes':'a'*501},{'vehicle_year':True}]:
            with self.subTest(changed=changed),self.assertRaises(HTTPException):rfq.validate_submission({**self.data,**changed})
    async def test_selected_shop_does_not_require_coordinates_or_substitute(self):
        selected={**self.data,'flow':'selected','preferred_installer_id':'shop-one'}
        with patch.object(rfq,'fetch_candidates',AsyncMock(return_value=[{**self.shop,'lat':None,'lng':None}])) as fetch,patch.object(rfq,'zip_location',AsyncMock()) as geo:
            self.assertEqual(len(await rfq.routing_targets(selected)),1);geo.assert_not_awaited();fetch.assert_awaited_once_with(installer_id='shop-one')
        with patch.object(rfq,'fetch_candidates',AsyncMock(return_value=[])),patch.object(rfq,'zip_location',AsyncMock()) as geo:
            self.assertEqual(await rfq.routing_targets(selected),[]);geo.assert_not_awaited()
    async def test_network_requires_service_and_valid_nearby_coordinates(self):
        candidates=[self.shop,{**self.shop,'id':'tires','services':['wheels-tires']},{**self.shop,'id':'unknown','lat':None},{**self.shop,'id':'far','lat':34,'lng':-118}]
        with patch.object(rfq,'fetch_candidates',AsyncMock(return_value=candidates)),patch.object(rfq,'zip_location',AsyncMock(return_value=(40.75,-73.99))):
            result=await rfq.routing_targets(self.data);self.assertEqual([s['id'] for s in result],['shop-one'])
    async def test_network_other_does_not_guess_recipients(self):
        with patch.object(rfq,'fetch_candidates',AsyncMock()) as fetch:
            self.assertEqual(await rfq.routing_targets({**self.data,'service':'other'}),[]);fetch.assert_not_awaited()
    async def test_no_match_keeps_receipt_and_enters_review(self):
        saved=rfq.save_submission(self.data)
        with patch.object(rfq,'routing_targets',AsyncMock(return_value=[])):await rfq.run_one_job()
        self.assertEqual(rfq.status_for(saved['submission_id'])['status'],'routing_needed');self.assertEqual(self.count('directory_outbox'),1)
    async def test_feed_failure_retries_without_inventing_match(self):
        saved=rfq.save_submission(self.data)
        with patch.object(rfq,'routing_targets',AsyncMock(side_effect=TimeoutError)):await rfq.run_one_job()
        self.assertEqual(rfq.status_for(saved['submission_id'])['status'],'routing_pending')
        with rfq.connect() as conn:self.assertEqual(conn.execute('SELECT state FROM directory_outbox').fetchone()[0],'pending')
    async def test_notification_has_stable_id_and_actual_template_fields(self):
        saved=await self.routed()
        with patch.object(rfq,'fetch_candidates',AsyncMock(return_value=[self.shop])),patch.object(rfq,'send_installer_event',AsyncMock(return_value=202)) as send:
            await rfq.run_one_job();event=send.await_args.args[0]['data']['attributes']
            self.assertEqual(event['properties']['customer_email'],self.data['email']);self.assertEqual(event['properties']['vehicle_year'],2024)
            self.assertEqual(event['properties']['rfq_id'],'VZ-'+str(saved['submission_id']));self.assertTrue(rfq.UUID_RE.fullmatch(event['unique_id']))
        self.assertEqual(rfq.status_for(saved['submission_id'])['status'],'provider_accepted')
    async def test_ambiguous_provider_retry_reuses_event_id(self):
        await self.routed();events=[]
        async def provider(event):
            events.append(event['data']['attributes']['unique_id'])
            if len(events)==1:raise TimeoutError('simulated acceptance with lost reply')
            return 202
        with patch.object(rfq,'fetch_candidates',AsyncMock(return_value=[self.shop])),patch.object(rfq,'send_installer_event',provider):
            await rfq.run_one_job();self.ready();await rfq.run_one_job()
        self.assertEqual(len(events),2);self.assertEqual(len(set(events)),1)
    async def test_opt_out_or_address_change_cancels_pending_delivery(self):
        for candidates in [[],[{**self.shop,'email':'changed@example.test'}]]:
            with self.subTest(candidates=candidates):
                self.data['request_id']=str(uuid.uuid4());await self.routed()
                with patch.object(rfq,'fetch_candidates',AsyncMock(return_value=candidates)),patch.object(rfq,'send_installer_event',AsyncMock()) as send:
                    await rfq.run_one_job();send.assert_not_awaited()
    async def test_one_failed_recipient_does_not_repeat_an_accepted_recipient(self):
        second={**self.shop,'id':'shop-two','email':'two@example.test'}
        rfq.save_submission(self.data)
        with patch.object(rfq,'routing_targets',AsyncMock(return_value=[self.shop,second])):await rfq.run_one_job()
        async def candidates(**kw):return [self.shop] if kw.get('installer_id')=='shop-one' else [second]
        sent=[]
        async def provider(event):
            target=event['data']['attributes']['properties']['installer_id'];sent.append(target);return 202 if target=='shop-one' else 400
        with patch.object(rfq,'fetch_candidates',candidates),patch.object(rfq,'send_installer_event',provider):
            await rfq.run_one_job();await rfq.run_one_job();self.ready();await rfq.run_one_job()
        self.assertEqual(sorted(sent),['shop-one','shop-two'])
    def test_expired_lease_can_resume_and_stale_worker_cannot_finish(self):
        rfq.save_submission(self.data);first=rfq.lease_job();self.assertIsNone(rfq.lease_job());self.ready();second=rfq.lease_job()
        self.assertEqual(first['id'],second['id']);self.assertNotEqual(first['lease_token'],second['lease_token'])
        rfq.finish_job(first,'accepted')
        with rfq.connect() as conn:self.assertEqual(conn.execute('SELECT state FROM directory_outbox').fetchone()[0],'sending')
    async def test_private_endpoint_auth_and_public_receipt_redaction(self):
        app=FastAPI();app.include_router(rfq.router)
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),base_url='https://test.local') as client:
            denied=await client.get('/internal/directory-rfq/requests');self.assertEqual(denied.status_code,401)
            headers={'Authorization':'Bearer '+rfq.secret()}
            accepted=await client.post('/webhook/rfq/directory',json=self.data,headers=headers);self.assertEqual(accepted.status_code,200)
            status=await client.post('/webhook/rfq/directory/status',json={'token':accepted.json()['receipt_token']},headers=headers)
            self.assertEqual(status.status_code,200);self.assertNotIn(self.data['email'],status.text);self.assertNotIn(self.data['phone'],status.text)
            admin=await client.get('/internal/directory-rfq/requests',headers=headers);self.assertEqual(admin.status_code,200)
            self.assertEqual(len(admin.json()['requests']),1)


if __name__=='__main__':unittest.main()
