"""Read-only provider checks and durable delivery evidence. Never unsuppress or resend."""
import asyncio
import hashlib
import json
import time
from datetime import datetime, timezone

import httpx

API = 'https://a.klaviyo.com/api/'
FLOW = 'VctBBY'
MESSAGE = 'V7QmgA'
TRIGGER_METRIC = 'Y3c6ne'
METRICS = {'T3YY6J':'delivered','UdpNYA':'bounced','VZPGv5':'dropped','SqXVu7':'spam'}


def headers():
    from app.routes.rfq_webhook import KLAVIYO_API_KEY
    if not KLAVIYO_API_KEY:
        raise RuntimeError('provider_unavailable')
    return {'Authorization':'Klaviyo-API-Key '+KLAVIYO_API_KEY,'revision':'2026-10-15','accept':'application/json'}


def init_db(conn):
    conn.executescript('''
    CREATE TABLE IF NOT EXISTS directory_recipient_checks (
      email_hash TEXT PRIMARY KEY, state TEXT NOT NULL, profile_id TEXT, checked_at REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS directory_delivery_checks (
      job_id TEXT PRIMARY KEY REFERENCES directory_outbox(id), state TEXT NOT NULL DEFAULT 'unconfirmed',
      event_id TEXT, occurred_at TEXT, checked_at REAL NOT NULL DEFAULT 0, last_error TEXT
    );
    CREATE TABLE IF NOT EXISTS directory_delivery_monitor (
      id INTEGER PRIMARY KEY, checked_at REAL NOT NULL, ok INTEGER NOT NULL, error TEXT
    );
    ''')


def recipient_key(email):
    return hashlib.sha256(email.strip().lower().encode()).hexdigest()


async def recipient_states(emails, connect, force=False):
    """Batch exact addresses; unknown API results never grant permission."""
    emails=sorted({e.strip().lower() for e in emails})
    result={};needed=[];now=time.time()
    with connect() as conn:
        for email in emails:
            row=conn.execute('SELECT * FROM directory_recipient_checks WHERE email_hash=?',(recipient_key(email),)).fetchone()
            ttl=60 if row and row['state']=='allowed' else 300 if row and row['state']=='suppressed' else 15
            if row and not force and now-row['checked_at']<ttl:
                result[email]={'state':row['state'],'profile_id':row['profile_id']}
            else:needed.append(email)
    if not needed:return result
    async with httpx.AsyncClient(timeout=8) as client:
        for start in range(0,len(needed),40):
            batch=needed[start:start+40]
            states={email:{'state':'unknown','profile_id':None} for email in batch}
            try:
                r=await client.get(API+'profiles/',headers=headers(),params={
                    'filter':'any(email,'+json.dumps(batch,separators=(',',':'))+')','additional-fields[profile]':'subscriptions','page[size]':100})
                r.raise_for_status();data=r.json()
                if not isinstance(data.get('data'),list) or data.get('links',{}).get('next'):raise ValueError('Incomplete profile lookup')
                states={email:{'state':'allowed','profile_id':None} for email in batch}
                seen=set()
                for profile in data['data']:
                    attrs=profile.get('attributes',{});email=str(attrs.get('email','')).strip().lower()
                    if email not in states:raise ValueError('Unexpected profile')
                    marketing=attrs.get('subscriptions',{}).get('email',{}).get('marketing',{})
                    state=('suppressed' if marketing.get('can_receive_email_marketing') is False or marketing.get('suppression') or marketing.get('list_suppressions')
                           else 'allowed' if marketing.get('can_receive_email_marketing') is True else 'unknown')
                    states[email]={'state':'unknown' if email in seen else state,'profile_id':profile.get('id')}
                    seen.add(email)
            except (httpx.HTTPError,ValueError,TypeError,AttributeError,RuntimeError):
                states={email:{'state':'unknown','profile_id':None} for email in batch}
            with connect() as conn:
                for email,value in states.items():
                    conn.execute('INSERT INTO directory_recipient_checks(email_hash,state,profile_id,checked_at) VALUES(?,?,?,?) ON CONFLICT(email_hash) DO UPDATE SET state=excluded.state,profile_id=excluded.profile_id,checked_at=excluded.checked_at',
                                 (recipient_key(email),value['state'],value['profile_id'],time.time()))
            result.update(states)
    return result


def epoch(value):
    parsed=datetime.fromisoformat(str(value).replace('Z','+00:00'))
    return (parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)).timestamp()


def evidence_for(job, triggers, events):
    """Never attribute another request's send to this request.

    Klaviyo reports the unrendered subject, not the VZ reference. Multiple trigger
    events to one recipient are ambiguous; retain that uncertainty for staff.
    """
    own=[e for e in triggers if e.get('attributes',{}).get('event_properties',{}).get('$event_id')==job['id']]
    if len(own)!=1:return {'state':'unconfirmed','last_error':'trigger_evidence_unavailable'}
    if len(triggers)!=1:return {'state':'ambiguous','last_error':'multiple_requests_to_recipient'}
    payload=json.loads(job['payload']);email=payload['installer']['email'].strip().lower()
    started=epoch(own[0]['attributes']['datetime']);matches=[]
    for event in events:
        a=event.get('attributes',{});p=a.get('event_properties',{})
        metric=event.get('relationships',{}).get('metric',{}).get('data',{}).get('id')
        if (metric not in METRICS or p.get('$flow')!=FLOW or p.get('$message')!=MESSAGE
            or str(p.get('Recipient Email Address','')).strip().lower()!=email
            or epoch(a['datetime'])<started or not str(p.get('$event_id','')).startswith(MESSAGE+':')):continue
        matches.append(event)
    if not matches:return {'state':'unconfirmed','last_error':None}
    if len({e['attributes']['event_properties']['$event_id'] for e in matches})!=1:
        return {'state':'ambiguous','last_error':'multiple_provider_sends'}
    # Negative delivery evidence dominates a prior delivery event.
    failures=[e for e in matches if METRICS[e['relationships']['metric']['data']['id']]!='delivered']
    chosen=max(failures or matches,key=lambda e:epoch(e['attributes']['datetime']))
    return {'state':METRICS[chosen['relationships']['metric']['data']['id']],
            'event_id':chosen['id'],'occurred_at':chosen['attributes']['datetime'],'last_error':None}


async def reconcile(connect):
    now=time.time();checked=0;ok=True
    with connect() as conn:
        jobs=[dict(r) for r in conn.execute("""SELECT o.* FROM directory_outbox o
          JOIN quote_intake_reviews q ON q.submission_id=o.submission_id
          LEFT JOIN directory_delivery_checks d ON d.job_id=o.id
          LEFT JOIN directory_customer_actions c ON c.submission_id=o.submission_id
          WHERE o.kind='installer' AND o.state='accepted' AND q.state IN ('verified','released')
          AND COALESCE(c.state,'open') NOT IN ('closed','withdrawn')
          AND o.accepted_at>datetime('now','-7 days') AND COALESCE(d.checked_at,0)<?
          ORDER BY COALESCE(d.checked_at,0),o.accepted_at LIMIT 3""",(now-90,))]
    # Bounded work fits the operations worker's existing two-minute cadence.
    async with httpx.AsyncClient(timeout=3) as client:
        async def check(job):
            nonlocal checked,ok
            email=json.loads(job['payload'])['installer']['email'].strip().lower()
            value={'state':'unconfirmed','last_error':'provider_evidence_unavailable'}
            try:
                profiles=await recipient_states([email],connect)
                profile=profiles[email]['profile_id']
                if not profile:raise ValueError('Profile not yet available')
                since=datetime.fromtimestamp(epoch(job['created_at'])-86400,timezone.utc).isoformat()
                base='equals(profile_id,'+json.dumps(profile)+'),greater-or-equal(datetime,'+since+')'
                # A properties filter requires one metric in Klaviyo. Fetch the
                # complete bounded profile window and select metrics locally.
                r=await client.get(API+'events/',headers=headers(),params={'filter':base,'sort':'-datetime','page[size]':1000})
                r.raise_for_status();data=r.json()
                if not isinstance(data.get('data'),list) or data.get('links',{}).get('next'):raise ValueError('Incomplete delivery evidence')
                events=data['data']
                if any(e.get('relationships',{}).get('profile',{}).get('data',{}).get('id')!=profile for e in events):raise ValueError('Unexpected profile evidence')
                triggers=[e for e in events if e.get('relationships',{}).get('metric',{}).get('data',{}).get('id')==TRIGGER_METRIC]
                value=evidence_for(job,triggers,events)
                if value['last_error']=='trigger_evidence_unavailable':ok=False
            except (httpx.HTTPError,ValueError,KeyError,TypeError,AttributeError,RuntimeError):ok=False
            with connect() as conn:
                previous=conn.execute('SELECT * FROM directory_delivery_checks WHERE job_id=?',(job['id'],)).fetchone()
                if value['last_error']=='provider_evidence_unavailable' and previous:
                    value={**dict(previous),'last_error':'provider_evidence_unavailable'}
                conn.execute('''INSERT INTO directory_delivery_checks(job_id,state,event_id,occurred_at,checked_at,last_error)
                  VALUES(?,?,?,?,?,?) ON CONFLICT(job_id) DO UPDATE SET state=excluded.state,event_id=excluded.event_id,
                  occurred_at=excluded.occurred_at,checked_at=excluded.checked_at,last_error=excluded.last_error''',
                  (job['id'],value['state'],value.get('event_id'),value.get('occurred_at'),time.time(),value.get('last_error')))
            checked+=1
        await asyncio.gather(*(check(job) for job in jobs))
    with connect() as conn:
        conn.execute('INSERT INTO directory_delivery_monitor(id,checked_at,ok,error) VALUES(1,?,?,?) ON CONFLICT(id) DO UPDATE SET checked_at=excluded.checked_at,ok=excluded.ok,error=excluded.error',
                     (time.time(),int(ok),None if ok else 'provider_evidence_unavailable'))
    return {'checked':checked,'provider_evidence_ok':ok}


def alerts(connect):
    with connect() as conn:
        rows=conn.execute("""SELECT o.id job_id,o.submission_id,o.state,o.last_error,o.created_at,o.accepted_at,
          d.state provider_state,d.last_error evidence_error,o.kind,r.routing_state
          FROM directory_outbox o JOIN quote_intake_reviews q ON q.submission_id=o.submission_id
          JOIN directory_requests r ON r.submission_id=o.submission_id
          LEFT JOIN directory_delivery_checks d ON d.job_id=o.id
          LEFT JOIN directory_customer_actions c ON c.submission_id=o.submission_id
          WHERE q.state IN ('verified','released')
          AND COALESCE(c.state,'open') NOT IN ('closed','withdrawn')
          AND ((o.kind='installer' AND (o.state IN ('failed','cancelled') OR d.state IN ('bounced','dropped','spam')
            OR (o.state='accepted' AND COALESCE(d.state,'unconfirmed')!='delivered' AND o.accepted_at<datetime('now','-10 minutes'))))
            OR (o.kind='route' AND r.routing_state IN ('failed','needs_review') AND o.state IN ('completed','failed')))
          ORDER BY o.created_at DESC LIMIT 501""").fetchall()
    result=[]
    for row in rows[:500]:
        reason=('routing_unavailable' if row['kind']=='route' else 'recipient_suppressed' if row['last_error']=='recipient_suppressed_no_automatic_override'
                else 'notification_failed' if row['state'] in ('failed','cancelled')
                else row['provider_state'] if row['provider_state'] in ('bounced','dropped','spam') else 'delivery_unconfirmed')
        result.append({'submission_id':row['submission_id'],'job_id':row['job_id'],'reference':'VZ-'+str(row['submission_id']),'reason':reason})
    return {'alerts':result,'limited':len(rows)>500}
