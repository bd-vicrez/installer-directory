import json
import unittest
import uuid
import httpx
from fastapi import FastAPI
import test_directory_rfq as fixtures
import inquiry_workspace
from inquiry_workspace_service import create_app
from pathlib import Path


class WorkspaceTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.fixture = fixtures.DirectoryTests()
        self.fixture.setUp()
        self.rfq = fixtures.rfq
        with self.rfq.connect() as conn:
            conn.execute("INSERT INTO quote_intake_reviews(submission_id,source,state,reason) VALUES(1,'legacy','held','historical_review')")
        secret_path=Path(self.fixture.tmp.name)/'workspace-secret'
        secret_path.write_text(self.rfq.secret())
        self.app = create_app(self.rfq.DB_PATH,secret_path)
        self.app.include_router(self.rfq.router)
        self.headers = {'Authorization':'Bearer '+self.rfq.secret()}

    def tearDown(self):
        self.fixture.tearDown()

    def seed(self, count=75):
        ids=[]
        for i in range(count):
            state=['verified','held','quarantined'][i%3]
            row=self.rfq.save_submission({**self.fixture.data,'request_id':str(uuid.uuid4())}, {'state':state,'reason':'isolated_test'})
            ids.append(row['submission_id'])
        return ids

    async def test_full_scope_counts_pagination_and_no_private_fields(self):
        ids=self.seed()
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=self.app),base_url='https://test') as client:
            first=(await client.get('/internal/directory-rfq/workspace?scope=all&limit=20',headers=self.headers)).json()
            self.assertEqual(first['counts'],{'verified':25,'held':26,'quarantined':25,'all':76})
            seen=[r['submission_id'] for r in first['items']]
            data=first
            while data['next_cursor']:
                data=(await client.get(f"/internal/directory-rfq/workspace?scope=all&limit=20&before={data['next_cursor']}&snapshot={first['snapshot']}",headers=self.headers)).json()
                seen += [r['submission_id'] for r in data['items']]
            self.assertEqual(seen,sorted(ids+[1],reverse=True))
            for secret in ['full_name','customer@vicrez.com','2125550100','receipt_token','payload','notes']:
                self.assertNotIn(secret,json.dumps(first))

    async def test_snapshot_excludes_new_arrivals_and_selected_crosses_scope(self):
        ids=self.seed(60)
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=self.app),base_url='https://test') as client:
            first=(await client.get('/internal/directory-rfq/workspace?scope=all',headers=self.headers)).json()
            self.seed(3)
            second=(await client.get(f"/internal/directory-rfq/workspace?scope=all&before={first['next_cursor']}&snapshot={first['snapshot']}",headers=self.headers)).json()
            self.assertEqual(second['counts']['all'],61)
            self.assertFalse(set(r['submission_id'] for r in first['items']) & set(r['submission_id'] for r in second['items']))
            selected=(await client.get('/internal/directory-rfq/workspace?id=1',headers=self.headers)).json()
            self.assertEqual(selected['items'][0]['flow'],'legacy')
            self.assertEqual(selected['items'][0]['intake_scope'],'held')

    async def test_auth_invalid_parameters_and_old_api_compatibility(self):
        self.seed(2)
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=self.app),base_url='https://test') as client:
            denied = await client.get('/internal/directory-rfq/workspace')
            self.assertEqual(denied.status_code,401)
            self.assertEqual(denied.headers['cache-control'],'private, no-store')
            for query in ['scope=oops','limit=0','limit=51','before=2','snapshot=-1','id=1&before=2&snapshot=3','id=bad']:
                self.assertEqual((await client.get('/internal/directory-rfq/workspace?'+query,headers=self.headers)).status_code,400,query)
            old=(await client.get('/internal/directory-rfq/requests?id=1',headers=self.headers)).json()
            self.assertEqual(old['requests'][0]['submission_id'],1)
            self.assertIn('routing_counts',old)
            self.assertEqual(old['version'],'phase-a')

    def test_overview_does_not_change_records_or_dispatch(self):
        self.seed(4)
        with self.rfq.connect() as conn:
            before='\n'.join(conn.iterdump())
            data=inquiry_workspace.overview(conn,{'scope':'all'})
            self.assertEqual(before,'\n'.join(conn.iterdump()))
            self.assertEqual(len(data['items']),5)

    async def test_empty_scope_and_missing_id(self):
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=self.app),base_url='https://test') as client:
            data=(await client.get('/internal/directory-rfq/workspace',headers=self.headers)).json()
            self.assertEqual(data['items'],[]);self.assertIsNone(data['next_cursor'])
            self.assertEqual(data['counts']['held'],1)
            missing=(await client.get('/internal/directory-rfq/workspace?id=999',headers=self.headers)).json()
            self.assertEqual(missing['items'],[])

    async def test_missing_database_fails_closed_without_creating_a_file(self):
        missing = Path(self.fixture.tmp.name) / 'missing.sqlite'
        app = create_app(missing, Path(self.fixture.tmp.name) / 'workspace-secret')
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),base_url='https://test') as client:
            response = await client.get('/internal/directory-rfq/workspace',headers=self.headers)
            self.assertEqual(response.status_code,503)
            self.assertEqual(response.headers['cache-control'],'private, no-store')
            self.assertFalse(missing.exists())
