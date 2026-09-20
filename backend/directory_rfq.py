"""Directory inquiry receipts and durable delivery queue.

Mounted by the existing FastAPI application. Legacy RFQ endpoints and their
records remain compatible; only new directory requests create delivery jobs.
No historical notification jobs are synthesized during migration/startup.
"""
import asyncio
import base64
import hashlib
import hmac
import json
import logging
import math
import os
import re
import sqlite3
import time
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

import httpx
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

router = APIRouter()
logger = logging.getLogger(__name__)
DB_PATH = os.getenv('RFQ_DB_PATH', '/app/data/rfq_submissions.db')
SECRET_PATH = Path('/app/data/directory-rfq-secret')
FEED_TOKEN_PATH = Path('/app/data/installer-feed-token')
ROUTING_URL = 'https://installers.vicrez.com/api/internal/quote-routing'
SERVICE_PATH = Path(__file__).with_name('quote-services.json')
if not SERVICE_PATH.exists():
    SERVICE_PATH = Path(__file__).parent.parent / 'shared' / 'quote-services.json'
SERVICES = {s['id']: s for s in json.loads(SERVICE_PATH.read_text())}
UUID_RE = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.I)
MAX_ATTEMPTS = 8


@contextmanager
def connect():
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA foreign_keys=ON')
    try:
        with conn:
            yield conn
    finally:
        conn.close()


def init_directory_db():
    # rfq_webhook.init_db creates the existing submissions table at app startup.
    with connect() as conn:
        conn.executescript('''
        CREATE TABLE IF NOT EXISTS directory_requests (
          submission_id INTEGER PRIMARY KEY REFERENCES rfq_submissions(id),
          request_id TEXT NOT NULL UNIQUE, payload_hash TEXT NOT NULL,
          payload TEXT NOT NULL, flow TEXT NOT NULL, service TEXT NOT NULL,
          consent_version TEXT NOT NULL, consent_at TEXT NOT NULL,
          routing_state TEXT NOT NULL DEFAULT 'pending', routing_reason TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS directory_outbox (
          id TEXT PRIMARY KEY, submission_id INTEGER NOT NULL REFERENCES directory_requests(submission_id),
          kind TEXT NOT NULL, target_id TEXT, payload TEXT NOT NULL,
          state TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0,
          next_attempt REAL NOT NULL DEFAULT 0, lease_until REAL NOT NULL DEFAULT 0,
          lease_token TEXT, last_error TEXT, accepted_at TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(submission_id,kind,target_id)
        );
        CREATE INDEX IF NOT EXISTS directory_outbox_due ON directory_outbox(state,next_attempt,lease_until);
        CREATE INDEX IF NOT EXISTS directory_outbox_request ON directory_outbox(submission_id);
        CREATE TABLE IF NOT EXISTS directory_worker_state (id INTEGER PRIMARY KEY, heartbeat REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS directory_response_access (
          job_id TEXT PRIMARY KEY REFERENCES directory_outbox(id), expires_at INTEGER NOT NULL,
          revoked INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS directory_shop_responses (
          job_id TEXT PRIMARY KEY REFERENCES directory_outbox(id), state TEXT NOT NULL,
          note TEXT NOT NULL DEFAULT '', revision INTEGER NOT NULL, first_responded_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS directory_shop_response_audit (
          request_id TEXT PRIMARY KEY, job_id TEXT NOT NULL REFERENCES directory_outbox(id),
          state TEXT NOT NULL, note TEXT NOT NULL, revision INTEGER NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS directory_measurement_events (
          id TEXT PRIMARY KEY, request_ref TEXT NOT NULL, event TEXT NOT NULL,
          flow TEXT NOT NULL, service TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        ''')
        # Reconcile saved-event measurement after rollout without replaying delivery jobs.
        for row in conn.execute('SELECT submission_id FROM directory_requests').fetchall():
            measure(conn,row['submission_id'],'quote_saved',f"{row['submission_id']}:saved")


def secret():
    value = os.getenv('DIRECTORY_RFQ_SECRET') or (SECRET_PATH.read_text().strip() if SECRET_PATH.exists() else '')
    if len(value) < 32:
        raise HTTPException(503, 'Inquiry service unavailable')
    return value


def require_service(request):
    supplied = request.headers.get('authorization', '').removeprefix('Bearer ')
    if not hmac.compare_digest(hashlib.sha256(supplied.encode()).digest(), hashlib.sha256(secret().encode()).digest()):
        raise HTTPException(401, 'Unauthorized')


async def read_body(request, limit=16384):
    raw = bytearray()
    async for chunk in request.stream():
        raw.extend(chunk)
        if len(raw) > limit:
            raise HTTPException(413, 'Request too large')
    try:
        data = json.loads(raw)
    except (ValueError, UnicodeError):
        raise HTTPException(400, 'Invalid request')
    if not isinstance(data, dict):
        raise HTTPException(400, 'Invalid request')
    return data


def validate_submission(data):
    result = {}
    limits = {'full_name': (2,80), 'email': (5,255), 'phone': (10,30), 'vehicle_make': (2,40),
              'vehicle_model': (1,60), 'what_needed': (1,80), 'notes': (0,500),
              'install_timeline': (0,120), 'budget_range': (0,120)}
    for key, (minimum, maximum) in limits.items():
        value = data.get(key, '')
        if not isinstance(value, str) or not minimum <= len(value.strip()) <= maximum:
            raise HTTPException(400, 'Check your request details')
        if re.search(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', value) or (key != 'notes' and ('\n' in value or '\r' in value)):
            raise HTTPException(400, 'Check your request details')
        result[key] = value.strip()
    if not re.fullmatch(r'[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+', result['email']):
        raise HTTPException(400, 'Invalid email')
    result['email'] = result['email'].lower()
    digits = re.sub(r'\D', '', result['phone'])
    if not 10 <= len(digits) <= 15:
        raise HTTPException(400, 'Invalid phone')
    result['phone'] = '+' + ('1' + digits if len(digits) == 10 else digits)
    year = data.get('vehicle_year')
    if type(year) is not int or not 1990 <= year <= datetime.now(timezone.utc).year + 1:
        raise HTTPException(400, 'Invalid vehicle year')
    result['vehicle_year'] = year
    request_id = data.get('request_id')
    if not isinstance(request_id, str) or not UUID_RE.fullmatch(request_id):
        raise HTTPException(400, 'Invalid request reference')
    result['request_id'] = request_id.lower()
    if data.get('service') not in SERVICES or data.get('flow') not in ('selected', 'network'):
        raise HTTPException(400, 'Choose a valid service and recipient')
    result.update(service=data['service'], flow=data['flow'])
    if data.get('sharing_consent') is not True or data.get('consent_version') != 'directory-quote-2026-09-15':
        raise HTTPException(400, 'Confirm the recipient disclosure')
    result.update(sharing_consent=True, consent_version=data['consent_version'])
    preferred = data.get('preferred_installer_id')
    if data['flow'] == 'selected':
        if not isinstance(preferred, str) or not preferred.strip() or len(preferred) > 80:
            raise HTTPException(400, 'Select a shop')
        result['preferred_installer_id'] = preferred.strip()
    else:
        if preferred:
            raise HTTPException(400, 'Conflicting recipient selection')
        result['preferred_installer_id'] = None
    zip_code = data.get('zip_code')
    valid_zip = isinstance(zip_code, str) and re.fullmatch(r'\d{5}(?:-\d{4})?', zip_code)
    if data['flow'] == 'network' and not valid_zip:
        raise HTTPException(400, 'Enter a valid US ZIP code')
    result['zip_code'] = zip_code[:5] if valid_zip else None
    return result


def receipt_token(submission_id, request_id):
    payload = f'{submission_id}:{request_id}:{int(time.time()) + 7*86400}'
    signature = hmac.new(secret().encode(), payload.encode(), hashlib.sha256).hexdigest()
    return base64.urlsafe_b64encode((payload + ':' + signature).encode()).decode().rstrip('=')


def verify_receipt(token):
    try:
        if not isinstance(token, str) or len(token) > 512:
            raise ValueError()
        payload = base64.urlsafe_b64decode(token + '=' * (-len(token) % 4)).decode()
        sid, request_id, expires, signature = payload.split(':')
        expected = hmac.new(secret().encode(), f'{sid}:{request_id}:{expires}'.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected) or int(expires) < time.time() or not UUID_RE.fullmatch(request_id):
            raise ValueError()
        return int(sid), request_id
    except (ValueError, UnicodeError):
        raise HTTPException(401, 'Invalid or expired receipt')


def save_submission(data):
    encoded = json.dumps(data, sort_keys=True, separators=(',', ':'))
    digest = hashlib.sha256(encoded.encode()).hexdigest()
    with connect() as conn:
        conn.execute('BEGIN IMMEDIATE')
        old = conn.execute('SELECT submission_id,payload_hash FROM directory_requests WHERE request_id=?', (data['request_id'],)).fetchone()
        if old:
            if not hmac.compare_digest(old['payload_hash'], digest):
                raise HTTPException(409, 'Request reference already used with different details')
            sid, duplicate = old['submission_id'], True
        else:
            if conn.execute('SELECT 1 FROM rfq_submissions WHERE request_id=?', (data['request_id'],)).fetchone():
                raise HTTPException(409, 'Request reference already exists')
            cursor = conn.execute('''INSERT INTO rfq_submissions
              (full_name,email,phone,vehicle_year,vehicle_make,vehicle_model,kit_interest,install_timeline,
               zip_code,budget_range,preferred_installer_id,notes,source_page,request_id,status,is_b2b)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0)''',
              (data['full_name'],data['email'],data['phone'],data['vehicle_year'],data['vehicle_make'],data['vehicle_model'],
               json.dumps([data['what_needed']]),data['install_timeline'],data['zip_code'],data['budget_range'],
               data['preferred_installer_id'],data['notes'],'https://installers.vicrez.com/',data['request_id'],'directory_received'))
            sid, duplicate = cursor.lastrowid, False
            conn.execute('''INSERT INTO directory_requests(submission_id,request_id,payload_hash,payload,flow,service,consent_version,consent_at)
              VALUES(?,?,?,?,?,?,?,?)''', (sid,data['request_id'],digest,encoded,data['flow'],data['service'],data['consent_version'],datetime.now(timezone.utc).isoformat()))
            conn.execute('INSERT INTO directory_outbox(id,submission_id,kind,target_id,payload) VALUES(?,?,?,?,?)',
                         (str(uuid.uuid5(uuid.NAMESPACE_URL, f'vicrez-directory:{sid}:route')),sid,'route','',encoded))
            measure(conn,sid,'quote_saved',f'{sid}:saved')
    return {'ok': True, 'submission_id': sid, 'duplicate': duplicate, 'receipt_token': receipt_token(sid, data['request_id'])}


def measure(conn,submission_id,event,key):
    row=conn.execute('SELECT request_id,flow,service,created_at FROM directory_requests WHERE submission_id=?',(submission_id,)).fetchone()
    if row:
        reference=str(uuid.uuid5(uuid.NAMESPACE_URL,'vicrez-measurement:'+row['request_id']))
        event_id=str(uuid.uuid5(uuid.NAMESPACE_URL,'vicrez-measurement-event:'+key))
        timestamp=row['created_at'] if event=='quote_saved' else datetime.now(timezone.utc).isoformat()
        conn.execute('INSERT OR IGNORE INTO directory_measurement_events(id,request_ref,event,flow,service,created_at) VALUES(?,?,?,?,?,?)',
                     (event_id,reference,event,row['flow'],row['service'],timestamp))


@router.post('/webhook/rfq/directory')
async def submit_directory(request: Request):
    require_service(request)
    result = save_submission(validate_submission(await read_body(request)))
    return JSONResponse(result, headers={'Cache-Control':'private, no-store'})


def status_for(submission_id):
    with connect() as conn:
        row = conn.execute('SELECT routing_state,routing_reason FROM directory_requests WHERE submission_id=?', (submission_id,)).fetchone()
        if not row:
            raise HTTPException(404, 'Receipt not found')
        jobs = conn.execute("SELECT state FROM directory_outbox WHERE submission_id=? AND kind='installer'", (submission_id,)).fetchall()
    states = [j['state'] for j in jobs]
    if row['routing_state'] == 'needs_review':
        state, message = 'routing_needed', 'Your request is saved, but an eligible recipient has not been confirmed. Vicrez can review it using your reference. No appointment is confirmed.'
    elif any(s in ('failed','cancelled') for s in states) or row['routing_state'] == 'failed':
        state, message = 'needs_attention', 'Your request is saved, but a notification needs attention. Keep your reference; delivery to every intended recipient is not confirmed.'
    elif states and all(s == 'accepted' for s in states):
        state, message = 'provider_accepted', 'The email provider accepted the notification for the selected recipient(s). This does not confirm inbox delivery, a response, pricing or an appointment.'
    elif row['routing_state'] == 'matched':
        state, message = 'notification_pending', 'Your request is saved and recipient selection is complete. Notification delivery is pending.'
    else:
        state, message = 'routing_pending', 'Your request is saved. We are checking the selected recipient or matching nearby shops by service. Delivery is not yet confirmed.'
    return {'reference':f'VZ-{submission_id}', 'status':state, 'message':message}


@router.post('/webhook/rfq/directory/status')
async def directory_status(request: Request):
    require_service(request)
    sid, rid = verify_receipt((await read_body(request,1024)).get('token'))
    with connect() as conn:
        if not conn.execute('SELECT 1 FROM directory_requests WHERE submission_id=? AND request_id=?',(sid,rid)).fetchone():
            raise HTTPException(404,'Receipt not found')
    return JSONResponse(status_for(sid), headers={'Cache-Control':'private, no-store'})


async def fetch_candidates(*, installer_id=None, service=None):
    params = {'id':installer_id} if installer_id else {'service':service}
    async with httpx.AsyncClient(timeout=12) as client:
        response = await client.get(ROUTING_URL, params=params, headers={'Authorization':'Bearer '+FEED_TOKEN_PATH.read_text().strip()})
        response.raise_for_status()
        data = response.json()
        if not isinstance(data.get('installers'), list):
            raise ValueError('Invalid routing feed')
        return data['installers']


async def zip_location(zip_code):
    async with httpx.AsyncClient(timeout=8) as client:
        response = await client.get('https://api.zippopotam.us/us/' + zip_code)
        if response.status_code == 404:
            return None
        response.raise_for_status()
        place = response.json()['places'][0]
        return float(place['latitude']), float(place['longitude'])


def distance_miles(a,b,c,d):
    lat1,lon1,lat2,lon2 = map(math.radians,(a,b,c,d))
    h = math.sin((lat2-lat1)/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin((lon2-lon1)/2)**2
    return 3958.8*2*math.asin(math.sqrt(min(1,max(0,h))))


async def routing_targets(data):
    if data['flow'] == 'selected':
        # Coordinates and proximity never replace a specifically chosen shop.
        candidates = await fetch_candidates(installer_id=data['preferred_installer_id'])
        return [i for i in candidates if str(i['id']) == data['preferred_installer_id']][:1]
    if data['service'] == 'other':
        return []
    candidates = await fetch_candidates(service=data['service'])
    location = await zip_location(data['zip_code'])
    if location is None:
        return []
    scored = []
    for inst in candidates:
        if data['service'] not in inst.get('services',[]):
            continue
        try:
            lat,lng = float(inst['lat']),float(inst['lng'])
            if not (-90 <= lat <= 90 and -180 <= lng <= 180):
                continue
            distance = distance_miles(*location,lat,lng)
            if distance <= 100:
                scored.append({**inst,'distance_miles':round(distance,1)})
        except (KeyError,TypeError,ValueError):
            continue
    return sorted(scored,key=lambda i:(i['distance_miles'],str(i['id'])))[:3]


def lease_job():
    now = time.time()
    with connect() as conn:
        conn.execute('BEGIN IMMEDIATE')
        row = conn.execute('''SELECT * FROM directory_outbox
          WHERE (state='pending' AND next_attempt<=?) OR (state='sending' AND lease_until<=?)
          ORDER BY created_at,id LIMIT 1''',(now,now)).fetchone()
        if not row:
            return None
        token = str(uuid.uuid4())
        conn.execute("UPDATE directory_outbox SET state='sending',attempts=attempts+1,lease_until=?,lease_token=? WHERE id=?", (now+180,token,row['id']))
        return {**dict(row),'attempts':row['attempts']+1,'lease_token':token}


def finish_job(job,state,error=None):
    with connect() as conn:
        updated=conn.execute('''UPDATE directory_outbox SET state=?,last_error=?,lease_until=0,
          accepted_at=CASE WHEN ?='accepted' THEN CURRENT_TIMESTAMP ELSE accepted_at END
          WHERE id=? AND lease_token=? AND state='sending' ''', (state,error,state,job['id'],job['lease_token']))
        if updated.rowcount and job['kind']=='installer':
            measure(conn,job['submission_id'],'quote_notification_'+state,job['id']+':'+state)


def retry_job(job,error,permanent=False):
    failed = permanent or job['attempts'] >= MAX_ATTEMPTS
    delay = min(3600,30 * 2**min(job['attempts']-1,7))
    with connect() as conn:
        updated = conn.execute('''UPDATE directory_outbox SET state=?,last_error=?,next_attempt=?,lease_until=0
          WHERE id=? AND lease_token=? AND state='sending' ''', ('failed' if failed else 'pending',error,time.time()+delay,job['id'],job['lease_token']))
        if failed and updated.rowcount and job['kind']=='route':
            conn.execute("UPDATE directory_requests SET routing_state='failed',routing_reason=? WHERE submission_id=?",(error,job['submission_id']))
        if updated.rowcount:
            event='quote_'+('routing' if job['kind']=='route' else 'notification')+('_failed' if failed else '_retry')
            measure(conn,job['submission_id'],event,job['id']+':'+event+':'+str(job['attempts']))


async def run_route_job(job):
    data = json.loads(job['payload'])
    targets = await routing_targets(data)
    with connect() as conn:
        conn.execute('BEGIN IMMEDIATE')
        if not conn.execute("SELECT 1 FROM directory_outbox WHERE id=? AND lease_token=? AND state='sending'", (job['id'],job['lease_token'])).fetchone():
            return
        for target in targets:
            event_id = str(uuid.uuid5(uuid.NAMESPACE_URL,f"vicrez-directory:{job['submission_id']}:installer:{target['id']}"))
            payload = json.dumps({'submission':data,'installer':target})
            inserted = conn.execute('''INSERT OR IGNORE INTO directory_outbox(id,submission_id,kind,target_id,payload)
              VALUES(?,?,'installer',?,?)''', (event_id,job['submission_id'],str(target['id']),payload))
            if inserted.rowcount:
                # Only newly routed deliveries receive response links; old notices are not replayed.
                conn.execute('INSERT INTO directory_response_access(job_id,expires_at) VALUES(?,?)',
                             (event_id,int(time.time())+30*86400))
        reason = None if targets else ('selected_shop_unavailable' if data['flow']=='selected' else 'no_eligible_service_match')
        conn.execute('UPDATE directory_requests SET routing_state=?,routing_reason=? WHERE submission_id=?',('matched' if targets else 'needs_review',reason,job['submission_id']))
        conn.execute("UPDATE directory_outbox SET state='completed',lease_until=0,last_error=NULL WHERE id=? AND lease_token=?",(job['id'],job['lease_token']))
        measure(conn,job['submission_id'],'quote_matched' if targets else 'quote_routing_needed',job['id']+':routing-outcome')


def installer_event(job):
    payload = json.loads(job['payload'])
    data, inst = payload['submission'], payload['installer']
    # Both the current flat email-template contract and the legacy lead object
    # remain available. Customer details are sent only to the chosen recipient.
    properties = {
      'rfq_id':f"VZ-{job['submission_id']}", 'submitted_at':job['created_at'],
      'request_type':data['flow'], 'business_name':inst['business_name'],
      'installer_name':inst['business_name'], 'installer_id':str(inst['id']),
      'installer_business_name':inst['business_name'], 'installer_city':inst['city'], 'installer_state':inst['state'],
      'vehicle_year':data['vehicle_year'], 'vehicle_make':data['vehicle_make'], 'vehicle_model':data['vehicle_model'],
      'kit_interest':data['what_needed'], 'service':SERVICES[data['service']]['label'],
      'install_timeline':data['install_timeline'], 'budget_range':data['budget_range'], 'notes':data['notes'],
      'customer_zip':data['zip_code'] if data['flow']=='network' else 'Not supplied',
      'distance_miles':inst.get('distance_miles','n/a'), 'customer_name':data['full_name'],
      'customer_email':data['email'], 'customer_phone':data['phone'],
      'lead':{'first_name':data['full_name'].split()[0], 'vehicle_ymm':f"{data['vehicle_year']} {data['vehicle_make']} {data['vehicle_model']}", 'kit_interest':[data['what_needed']], 'install_timeline':data['install_timeline'],'budget_range':data['budget_range'],'notes':data['notes']},
    }
    link = shop_response_link(job)
    if link:
        properties['shop_response_url'] = link
    return {'data':{'type':'event','attributes':{
      'unique_id':job['id'], 'properties':properties,
      'metric':{'data':{'type':'metric','attributes':{'name':'Installer Quote Request Forwarded'}}},
      'profile':{'data':{'type':'profile','attributes':{'email':inst['email'],'organization':inst['business_name']}}},
    }}}


async def send_installer_event(event):
    from app.routes.rfq_webhook import KLAVIYO_API_KEY
    if not KLAVIYO_API_KEY:
        return 503
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post('https://a.klaviyo.com/api/events/',json=event,headers={
          'Authorization':'Klaviyo-API-Key '+KLAVIYO_API_KEY, 'revision':'2026-04-15',
          'Content-Type':'application/json', 'accept':'application/json'})
        return response.status_code


async def run_notification_job(job):
    payload = json.loads(job['payload'])
    data, original = payload['submission'], payload['installer']
    current = await fetch_candidates(installer_id=str(original['id']))
    eligible = next((i for i in current if str(i['id'])==str(original['id']) and i['email'].strip().lower()==original['email'].strip().lower()),None)
    if not eligible or (data['flow']=='network' and data['service'] not in eligible.get('services',[])):
        finish_job(job,'cancelled','recipient_eligibility_changed')
        return
    status = await send_installer_event(installer_event(job))
    if status in (200,201,202):
        finish_job(job,'accepted')
    else:
        retry_job(job,'provider_http_'+str(status),permanent=400<=status<500 and status not in (408,429))


async def run_one_job():
    job = lease_job()
    if not job:
        return False
    try:
        if job['kind']=='route':
            await run_route_job(job)
        else:
            await run_notification_job(job)
    except asyncio.CancelledError:
        raise
    except Exception as exc:
        # Never log customer payloads, provider bodies, URLs or credentials.
        retry_job(job,'temporary_'+type(exc).__name__)
        logger.warning('Directory delivery job needs retry: %s',type(exc).__name__)
    return True


async def directory_worker_loop():
    last_heartbeat = 0
    while True:
        try:
            if time.time()-last_heartbeat >= 30:
                with connect() as conn:
                    conn.execute('INSERT INTO directory_worker_state(id,heartbeat) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET heartbeat=excluded.heartbeat',(time.time(),))
                last_heartbeat = time.time()
            if not await run_one_job():
                await asyncio.sleep(5)
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.error('Directory worker paused after %s',type(exc).__name__)
            await asyncio.sleep(10)


@router.get('/internal/directory-rfq/requests')
async def admin_requests(request: Request):
    require_service(request)
    with connect() as conn:
        rows = conn.execute('''SELECT d.submission_id,d.created_at,d.flow,d.service,d.routing_state,d.routing_reason,
          r.full_name,r.email,r.phone,r.vehicle_year,r.vehicle_make,r.vehicle_model,r.notes,r.zip_code
          FROM directory_requests d JOIN rfq_submissions r ON r.id=d.submission_id
          ORDER BY d.submission_id DESC LIMIT 50''').fetchall()
        requests = []
        for row in rows:
            deliveries = conn.execute('''SELECT o.target_id,o.state,o.attempts,o.last_error,o.accepted_at,
              a.expires_at AS response_link_expires_at,r.state AS response_state,r.note AS response_note,
              r.first_responded_at,r.updated_at AS response_updated_at,
              CASE WHEN o.state='accepted' AND r.job_id IS NULL AND a.job_id IS NOT NULL
                AND julianday('now')-julianday(o.accepted_at)>2 THEN 1 ELSE 0 END AS unanswered_over_48h
              FROM directory_outbox o LEFT JOIN directory_response_access a ON a.job_id=o.id
              LEFT JOIN directory_shop_responses r ON r.job_id=o.id
              WHERE o.submission_id=? AND o.kind='installer' ORDER BY o.id''',(row['submission_id'],)).fetchall()
            requests.append({**dict(row),'deliveries':[dict(d) for d in deliveries]})
        counts = {r['routing_state']:r['n'] for r in conn.execute('SELECT routing_state,COUNT(*) AS n FROM directory_requests GROUP BY routing_state')}
        delivery_counts = {r['state']:r['n'] for r in conn.execute("SELECT state,COUNT(*) AS n FROM directory_outbox WHERE kind='installer' GROUP BY state")}
        heartbeat = conn.execute('SELECT heartbeat FROM directory_worker_state WHERE id=1').fetchone()
        response_counts = {r['state']:r['n'] for r in conn.execute('SELECT state,COUNT(*) n FROM directory_shop_responses GROUP BY state')}
        unanswered = conn.execute("SELECT COUNT(*) FROM directory_outbox o JOIN directory_response_access a ON a.job_id=o.id LEFT JOIN directory_shop_responses r ON r.job_id=o.id WHERE o.state='accepted' AND r.job_id IS NULL AND julianday('now')-julianday(o.accepted_at)>2").fetchone()[0]
    return JSONResponse({'requests':requests,'routing_counts':counts,'delivery_counts':delivery_counts,
      'shop_response_counts':response_counts,'unanswered_over_48h':unanswered,
      'worker_recent':bool(heartbeat and time.time()-heartbeat['heartbeat']<120),'version':'phase-a'},headers={'Cache-Control':'private, no-store'})


@router.get('/webhook/rfq/directory/health')
async def directory_health():
    # Public health reveals readiness, never private counts or request records.
    try:
        with connect() as conn:
            row = conn.execute('SELECT heartbeat FROM directory_worker_state WHERE id=1').fetchone()
        ok = bool(row and time.time()-row['heartbeat']<120 and secret())
        return JSONResponse({'ok':ok,'version':'phase-a'},status_code=200 if ok else 503,headers={'Cache-Control':'no-store'})
    except Exception:
        return JSONResponse({'ok':False,'version':'phase-a'},status_code=503,headers={'Cache-Control':'no-store'})


@router.get('/internal/directory-rfq/measurement')
async def directory_measurement(request: Request):
    require_service(request)
    with connect() as conn:
        saved=conn.execute('SELECT COUNT(*) FROM directory_requests').fetchone()[0]
        counts={row['event']:row['n'] for row in conn.execute('SELECT event,COUNT(*) n FROM directory_measurement_events GROUP BY event')}
        routing={row['routing_state']:row['n'] for row in conn.execute('SELECT routing_state,COUNT(*) n FROM directory_requests GROUP BY routing_state')}
        delivery={row['state']:row['n'] for row in conn.execute("SELECT state,COUNT(*) n FROM directory_outbox WHERE kind='installer' GROUP BY state")}
    return JSONResponse({'source':'durable-directory-records','saved_requests':saved,'recorded_save_events':counts.get('quote_saved',0),
      'reconciled':saved==counts.get('quote_saved',0),'events':counts,'routing':routing,'notifications':delivery},headers={'Cache-Control':'private, no-store'})


def shop_response_link(job):
    with connect() as conn:
        access = conn.execute('SELECT * FROM directory_response_access WHERE job_id=? AND revoked=0', (job['id'],)).fetchone()
    if not access:
        return None
    recipient = json.loads(job['payload'])['installer']['email'].strip().lower()
    message = f"shop-response:v1:{job['id']}:{access['expires_at']}"
    signature = hmac.new(secret().encode(),(message+':'+recipient).encode(),hashlib.sha256).hexdigest()
    token = base64.urlsafe_b64encode((message+':'+signature).encode()).decode().rstrip('=')
    return 'https://installers.vicrez.com/shop-response#'+token


async def response_job(token):
    try:
        if not isinstance(token,str) or len(token)>512:
            raise ValueError()
        scope,version,jid,expires,signature = base64.urlsafe_b64decode(token+'='*(-len(token)%4)).decode().split(':')
        if scope!='shop-response' or version!='v1' or not UUID_RE.fullmatch(jid) or int(expires)<time.time():
            raise ValueError()
        with connect() as conn:
            row = conn.execute("SELECT o.*,a.expires_at,a.revoked FROM directory_outbox o JOIN directory_response_access a ON a.job_id=o.id WHERE o.id=? AND o.kind='installer'",(jid,)).fetchone()
        if not row or row['revoked'] or row['expires_at']!=int(expires) or row['state']!='accepted':
            raise ValueError()
        job=dict(row);payload=json.loads(job['payload']);original=payload['installer']
        message=f"shop-response:v1:{jid}:{expires}:"+original['email'].strip().lower()
        expected=hmac.new(secret().encode(),message.encode(),hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature,expected):
            raise ValueError()
    except (ValueError,UnicodeError,KeyError,TypeError):
        raise HTTPException(401,'This private response link is invalid or expired. Contact support@vicrez.com with the inquiry reference.')
    current=await fetch_candidates(installer_id=str(original['id']))
    if not any(str(i['id'])==str(original['id']) and i['email'].strip().lower()==original['email'].strip().lower() for i in current):
        raise HTTPException(403,'This inquiry contact is no longer enabled. Contact support@vicrez.com.')
    return job


def save_shop_response(job,body):
    state,note,nonce,version=body.get('state'),body.get('note',''),body.get('request_id'),body.get('version')
    if state not in ('interested','needs_details','declined') or not isinstance(note,str) or len(note)>1000 or re.search(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]',note):
        raise HTTPException(400,'Choose a response and keep the note under 1,000 characters.')
    note=note.strip()
    if state=='needs_details' and len(note)<5:
        raise HTTPException(400,'Describe the additional details you need.')
    if not isinstance(nonce,str) or not UUID_RE.fullmatch(nonce) or type(version) is not int or version<0:
        raise HTTPException(400,'Invalid response reference. Reload this private link.')
    now=datetime.now(timezone.utc).isoformat()
    with connect() as conn:
        conn.execute('BEGIN IMMEDIATE')
        access=conn.execute('SELECT * FROM directory_response_access WHERE job_id=?',(job['id'],)).fetchone()
        if not access or access['revoked'] or access['expires_at']<time.time():
            raise HTTPException(401,'This response link has expired or been revoked.')
        old=conn.execute('SELECT * FROM directory_shop_response_audit WHERE request_id=?',(nonce,)).fetchone()
        if old:
            if old['job_id']!=job['id'] or old['state']!=state or old['note']!=note:
                raise HTTPException(409,'This save reference was already used for different details. Reload before editing.')
            return {'success':True,'duplicate':True,'revision':old['revision']}
        prior=conn.execute('SELECT * FROM directory_shop_responses WHERE job_id=?',(job['id'],)).fetchone()
        if (prior['revision'] if prior else 0)!=version:
            raise HTTPException(409,'A response was already updated. Reload before changing it.')
        conn.execute('INSERT INTO directory_shop_responses(job_id,state,note,revision,first_responded_at,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(job_id) DO UPDATE SET state=excluded.state,note=excluded.note,revision=excluded.revision,updated_at=excluded.updated_at',
                     (job['id'],state,note,version+1,now,now))
        conn.execute('INSERT INTO directory_shop_response_audit(request_id,job_id,state,note,revision,created_at) VALUES(?,?,?,?,?,?)',(nonce,job['id'],state,note,version+1,now))
        measure(conn,job['submission_id'],'shop_response_'+state,nonce)
    return {'success':True,'duplicate':False,'revision':version+1}


@router.post('/internal/directory-rfq/shop-response')
async def shop_response(request: Request):
    require_service(request)
    body=await read_body(request,4096)
    if body.get('action') not in ('view','save'):
        raise HTTPException(400,'Choose a valid action.')
    job=await response_job(body.get('token'))
    if body['action']=='save':
        result=save_shop_response(job,body)
    else:
        payload=json.loads(job['payload']);data=payload['submission']
        with connect() as conn:
            row=conn.execute('SELECT state,note,revision,updated_at FROM directory_shop_responses WHERE job_id=?',(job['id'],)).fetchone()
        result={'reference':f"VZ-{job['submission_id']}",'shop':payload['installer']['business_name'],
          'vehicle':f"{data['vehicle_year']} {data['vehicle_make']} {data['vehicle_model']}",
          'work':data['what_needed'],'service':SERVICES[data['service']]['label'],'notes':data['notes'],
          'customer_name':data['full_name'],'customer_email':data['email'],'customer_phone':data['phone'],
          'response':dict(row) if row else None,'version':row['revision'] if row else 0,'expires_at':job['expires_at']}
    return JSONResponse(result,headers={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'})
