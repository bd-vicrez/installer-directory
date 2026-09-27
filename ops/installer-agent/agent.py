#!/usr/bin/env python3
"""Autonomous installer review and inquiry coordination. Defaults to dry-run."""
import argparse, hashlib, json, os, re, sys, uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from urllib.parse import urlsplit
import requests, psycopg2
from psycopg2.extras import RealDictCursor, Json
from rules import ACTOR, POLICY, fingerprint, phone, host, decide, group_inquiries, utc
from evidence import gather, EvidenceUnavailable

ROOT=Path(os.environ.get('INSTALLER_AGENT_HOME','/root/installer-operations/agent'))
def now():return datetime.now(timezone.utc)
def atomic(path,data):
 path.parent.mkdir(parents=True,exist_ok=True,mode=0o700)
 tmp=path.with_suffix('.tmp');tmp.write_text(json.dumps(data,indent=2,default=str));tmp.chmod(0o600);os.replace(tmp,path)
def connect(cfg):
 # Session advisory locks require a direct connection, not Neon transaction pooling.
 hostname=urlsplit(cfg['database_url']).hostname
 if hostname and hostname.endswith('.neon.tech'):hostname=hostname.replace('-pooler.','.')
 return psycopg2.connect(cfg['database_url'],host=hostname,sslmode='verify-full',sslrootcert='/etc/ssl/certs/ca-certificates.crt',connect_timeout=15,options='-c statement_timeout=30000 -c lock_timeout=10000')
def duplicate_rows(q,a):
 q.execute("""SELECT id,business_name,slug,phone,website,street_address,city,state,zip_code FROM installers WHERE status='active' AND
 ((right(regexp_replace(phone,'[^0-9]','','g'),10)=%s AND length(%s)=10) OR
 (lower(business_name)=lower(%s) AND state=%s) OR
 (lower(street_address)=lower(%s) AND lower(city)=lower(%s) AND state=%s)) LIMIT 30""",
 (phone(a['phone']),phone(a['phone']),a['business_name'],a['state'],a['street_address'],a['city'],a['state']))
 return [dict(x) for x in q.fetchall()]
def public_decision(d):
 if d['status']=='approved':return 'Your directory listing is approved for these verified service categories: '+', '.join(d['approved_capabilities'])+'. Listing approval does not grant account ownership or wholesale dealer access.'
 if d['reason']=='already_listed':return 'Your business already has a listing: https://installers.vicrez.com/installer/'+d['duplicate']['slug']+'. We have closed this duplicate application. Use the listing correction or claim option on that page if information needs updating.'
 if d['reason']=='possible_duplicate':return 'We found a possible existing listing. Please reply with this application reference and confirm whether this is a new location or a correction to an existing business listing.'
 missing=set(d.get('missing',[]));parts=[]
 if missing & {'public_business_address','google_address_match','geocoded_full_address','ai_evidence_review'}:parts.append('confirm a publicly listed business address; if you operate a mobile service, tell us which address may be shown publicly')
 if missing & {'business_name_on_website','business_phone_on_website','google_business_match','google_phone_match','google_website_match'}:parts.append('send an official business website or business-profile link showing the current name and phone')
 if missing & {'services_on_website','ai_evidence_review'}:parts.append('confirm the installation services you currently offer, with a service-page link')
 return ('Please reply with this application reference and '+('; '.join(parts) or 'provide current business details so we can finish verification')+'.')[:500]

class Agent:
 def __init__(self,cfg,live=False):
  self.cfg=cfg;self.live=live;self.db=connect(cfg)
  self.report={'started_at':now().isoformat(),'mode':'live' if live else 'dry_run','policy':POLICY,'owner':ACTOR,'escalation_owner':cfg['owner_name'],'applications':[],'inquiries':[],'messages':[],'errors':[]}
 def query(self,sql,args=()):
  with self.db:
   with self.db.cursor(cursor_factory=RealDictCursor) as q:q.execute(sql,args);return [dict(r) for r in q.fetchall()] if q.description else []
 def rfq(self,path,body=None,allow_conflict=False):
  r=requests.request('POST' if body is not None else 'GET','https://ai.vicrez.com/internal/directory-rfq/'+path,headers={'Authorization':'Bearer '+self.cfg['rfq_secret']},json=body,timeout=30)
  if allow_conflict and r.status_code in (403,404,409,410):return None
  if not r.ok:raise RuntimeError('inquiry_service_http_'+str(r.status_code))
  return r.json()
 def zd(self,method,path,**kw):
  r=requests.request(method,'https://'+self.cfg['zendesk_subdomain']+'.zendesk.com/api/v2/'+path,auth=(self.cfg['zendesk_email']+'/token',self.cfg['zendesk_token']),timeout=40,**kw)
  return r
 def case(self,key):
  rows=self.query('SELECT * FROM directory_automation_cases WHERE task_key=%s',(key,));return rows[0] if rows else None
 def human_owned(self,key):
  a=self.query('SELECT actor,assigned_to FROM directory_action_assignments WHERE task_key=%s',(key,))
  return bool(a and a[0]['actor']!=ACTOR)
 def save_case(self,q,kind,rid,state,step,due,fp='',ev=None,ticket=None,paused=False):
  key=kind+':'+str(rid)
  q.execute("""INSERT INTO directory_automation_cases(task_key,kind,record_id,owner_name,escalation_owner,state,next_step,next_check_at,fingerprint,evidence,zendesk_ticket_id,paused)
   VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT(task_key) DO UPDATE SET state=EXCLUDED.state,next_step=EXCLUDED.next_step,next_check_at=EXCLUDED.next_check_at,fingerprint=EXCLUDED.fingerprint,evidence=EXCLUDED.evidence,zendesk_ticket_id=COALESCE(EXCLUDED.zendesk_ticket_id,directory_automation_cases.zendesk_ticket_id),paused=EXCLUDED.paused,escalation_owner=EXCLUDED.escalation_owner,updated_at=NOW()""",
   (key,kind,str(rid),ACTOR,self.cfg['owner_name'],state,step,due,fp,Json(ev or {}),ticket,paused))
 def assign(self,q,kind,rid,step,due,workflow='waiting'):
  key=kind+':'+str(rid);note=(f'Automated owner: {ACTOR}. Staff escalation owner: {self.cfg["owner_name"]} ({self.cfg["owner_email"]}). Next step: '+step)[:1500]
  q.execute('SELECT pg_advisory_xact_lock(19313,hashtext(%s))',(key,))
  q.execute('SELECT * FROM directory_action_assignments WHERE task_key=%s FOR UPDATE',(key,));prior=q.fetchone()
  if prior and prior['actor']!=ACTOR:return False
  if prior and prior['note']==note:return True
  q.execute("""INSERT INTO directory_action_assignments(task_key,kind,record_id,due_at,workflow,note,actor) VALUES(%s,%s,%s,%s,%s,%s,%s)
   ON CONFLICT(task_key) DO UPDATE SET due_at=EXCLUDED.due_at,workflow=EXCLUDED.workflow,note=EXCLUDED.note,actor=EXCLUDED.actor,version=directory_action_assignments.version+1,updated_at=NOW()""",(key,kind,str(rid),due,workflow,note,ACTOR))
  q.execute("INSERT INTO directory_review_audit(kind,record_id,actor,action,note,after_data) VALUES('action-task',%s,%s,'automation-assignment',%s,%s)",(key,ACTOR,note,Json({'owner':ACTOR,'escalation_owner':self.cfg['owner_name'],'next_step':step,'due_at':str(due)})))
  return True
 def applications(self):
  apps=self.query("SELECT * FROM applications WHERE status IN ('pending','needs_information') ORDER BY submitted_at LIMIT 500")
  used=self.query("SELECT count(*) AS n FROM directory_automation_attempts WHERE created_at>=date_trunc('day',NOW())")[0]['n'];reviewed=0
  for a in apps:
   key='application:'+a['id'];prior=self.case(key);fp=fingerprint(a)
   if self.human_owned(key) or (a['reviewer'] and a['reviewer']!=ACTOR) or (prior and prior['paused']):continue
   if prior and prior['fingerprint']==fp and prior['next_check_at']>now():continue
   if reviewed>=self.cfg['max_applications_per_run'] or used>=self.cfg['max_ai_reviews_per_day']:break
   reviewed+=1;used+=1
   if self.live:self.query('INSERT INTO directory_automation_attempts(application_id) VALUES(%s)',(a['id'],))
   with self.db:
    with self.db.cursor(cursor_factory=RealDictCursor) as q:dupes=duplicate_rows(q,a)
   try:
    ev={'checked_at':now().isoformat(),'duplicates':dupes} if dupes else gather(a,self.cfg)
    decision=decide(a,ev,dupes)
    item={'reference':a['application_id'],'business':a['business_name'],'decision':decision,'public_message':public_decision(decision)}
    if self.live:item['result']=self.commit_application(a,fp,ev,decision)
    self.report['applications'].append(item)
   except Exception as e:
    self.db.rollback();err='research_unavailable' if isinstance(e,(EvidenceUnavailable,requests.RequestException)) else type(e).__name__
    self.report['errors'].append({'application':a['application_id'],'error':err})
    if self.live:
     with self.db:
      with self.db.cursor(cursor_factory=RealDictCursor) as q:
       step='Business verification could not finish because an evidence source was unavailable. Retry in one hour; existing application status is preserved.'
       self.save_case(q,'application',a['id'],'retry',step,now()+timedelta(hours=1),fp,{'error':err})
       self.assign(q,'application',a['id'],step,now()+timedelta(hours=1))
 def commit_application(self,a,fp,ev,d):
  with self.db:
   with self.db.cursor(cursor_factory=RealDictCursor) as q:
    q.execute('SELECT * FROM applications WHERE id=%s FOR UPDATE',(a['id'],));fresh=q.fetchone()
    if not fresh or fresh['status']!=a['status'] or fingerprint(fresh)!=fp or (fresh['reviewer'] and fresh['reviewer']!=ACTOR):return 'changed_during_review'
    # Block concurrent listing inserts while rechecking identity and inserting.
    q.execute('LOCK TABLE installers IN SHARE ROW EXCLUSIVE MODE')
    d=decide(fresh,ev,duplicate_rows(q,fresh));message=public_decision(d)
    q.execute('SELECT * FROM directory_action_assignments WHERE task_key=%s FOR UPDATE',('application:'+a['id'],));assignment=q.fetchone()
    if assignment and assignment['actor']!=ACTOR:return 'human_took_ownership'
    q.execute('INSERT INTO directory_automation_reviews(application_id,input_fingerprint,decision,evidence) VALUES(%s,%s,%s,%s) RETURNING id',(a['id'],fp,Json(d),Json(ev)));review_id=str(q.fetchone()['id'])
    note=(f'{ACTOR}; policy {POLICY}; decision {d["reason"]}. Evidence review {review_id}. '+('Missing: '+', '.join(d.get('missing',[]))+'. ' if d.get('missing') else '')+'Sources: '+'; '.join(p['url'] for p in ev.get('pages',[]))+('. '+ev.get('place',{}).get('googleMapsUri','') if ev.get('place') else ''))[:1500]
    installer_id=fresh.get('installer_id');slug=None
    if d['status']=='approved':
     loc=ev['location'];installer_id=str(uuid.uuid4());slug=re.sub('[^a-z0-9]+','-','-'.join([a['business_name'],a['city'],a['state']]).lower()).strip('-')+'-'+installer_id[:8]
     # Public identity does not prove the applicant controls a business inbox.
     # Inquiry activation remains in the existing verified-contact/owner workflow.
     routing=False
     q.execute("""INSERT INTO installers(id,legacy_id,business_name,slug,street_address,city,state,zip_code,phone,email,website,install_capabilities,source,status,date_added,updated_at,lat,lng,location_evidence,routing_email,quote_routing_enabled,quote_routing_basis,service_source)
      VALUES(%s,nextval('directory_installer_number')::text,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'[Installer Application]','active',NOW()::text,NOW(),%s,%s,%s,%s,%s,%s,%s)""",
      (installer_id,a['business_name'],slug,a['street_address'],a['city'],a['state'],a['zip_code'],a['phone'],a['email'],a['website'],d['approved_capabilities'],loc['lat'],loc['lng'],Json(loc),a['email'] if routing else None,routing,None,'Application; AI review of public business identity and advertised services'))
    changed=fresh['status']!=d['status'] or fresh['public_message']!=message
    q.execute("""UPDATE applications SET status=%s,reviewer=%s,review_note=%s,public_message=%s,reviewed_at=CASE WHEN %s THEN NOW() ELSE reviewed_at END,installer_id=%s,location_evidence=COALESCE(%s,location_evidence),location_confirmed_at=CASE WHEN %s='approved' THEN NOW() ELSE location_confirmed_at END WHERE id=%s""",
     (d['status'],ACTOR,note,message,changed,installer_id,Json(ev['location']) if ev.get('location') else None,d['status'],a['id']))
    q.execute("INSERT INTO directory_review_audit(kind,record_id,actor,action,note,before_data,after_data) VALUES('application',%s,%s,%s,%s,%s,%s)",(a['id'],ACTOR,d['status'],note,Json({'status':fresh['status'],'installer_id':fresh['installer_id']}),Json({'status':d['status'],'installer_id':installer_id,'slug':slug,'evidence_review_id':review_id,'public_message':message})))
    step='Review complete; applicant notification queued through the existing operations worker.' if d['status']!='needs_information' else 'Await the applicant response at support@vicrez.com; recheck public evidence in 24 hours. '+message
    self.save_case(q,'application',a['id'],d['status'],step,now()+timedelta(hours=24),fp,{'review_id':review_id,'decision':d})
    if d['status']=='needs_information':self.assign(q,'application',a['id'],step,now()+timedelta(hours=24))
    return {'status':d['status'],'installer_id':installer_id,'slug':slug,'notification_changed':changed}
 def current_requests(self):
  data=self.rfq('requests');rows=data['requests'];index={r['submission_id']:r for r in rows}
  actions=self.rfq('action-items')
  if actions.get('limited'):raise RuntimeError('inquiry_inventory_limit')
  # The public admin API returns the newest 50; retrieve older active work explicitly.
  for item in actions.get('items',[]):
   sid=item['submission_id']
   if sid not in index:
    selected=self.rfq('requests?id='+str(sid))['requests']
    if len(selected)!=1:raise RuntimeError('inquiry_inventory_incomplete')
    index[sid]=selected[0]
  return list(index.values()),data.get('worker_recent') is True
 def reminder(self,row,delivery):
  if not delivery.get('unanswered_over_48h'):return False
  checked=self.rfq('reminder-check',{'job_id':delivery['job_id']},allow_conflict=True)
  if checked is None:return False
  if not self.live:return True
  with self.db:
   with self.db.cursor(cursor_factory=RealDictCursor) as q:
    q.execute('SELECT pg_advisory_xact_lock(19312,hashtext(%s))',(str(row['submission_id']),))
    q.execute('SELECT state,actor FROM directory_inquiry_followup WHERE submission_id=%s FOR SHARE',(row['submission_id'],));f=q.fetchone()
    if f and (f['state'] in ['booked','declined'] or f['actor']!=ACTOR):return False
    q.execute("""INSERT INTO directory_notifications(event_key,kind,record_id,recipient,reference,outcome) VALUES(%s,'inquiry-reminder',%s,%s,%s,'inquiry_reminder') ON CONFLICT(event_key) DO NOTHING RETURNING id""",('inquiry-reminder:'+delivery['job_id'],delivery['job_id'],checked['recipient'],checked['reference']))
    inserted=q.fetchone()
    if inserted:q.execute("INSERT INTO directory_review_audit(kind,record_id,actor,action,note) VALUES('inquiry',%s,%s,'reminder_queued','Automatic single reminder after 48 hours; delivery worker will recheck recipient, response and request state')",(str(row['submission_id']),ACTOR))
    return bool(inserted)
 def ticket_human_reply(self,tid):
  r=self.zd('GET','tickets/'+str(tid)+'.json')
  if not r.ok:raise RuntimeError('ticket_status_unavailable')
  t=r.json()['ticket']
  if t['status'] in ['solved','closed'] or t['assignee_id']!=self.cfg['owner_zendesk_id']:return True
  r=self.zd('GET','tickets/'+str(tid)+'/comments.json')
  if not r.ok:raise RuntimeError('ticket_comments_unavailable')
  data=r.json()
  if data.get('next_page'):return True
  return any('Vicrez Installer Assistant (automated)' not in c.get('plain_body',c.get('body','')) for c in data.get('comments',[]))
 def inquiries(self):
  rows,worker_ok=self.current_requests();followups={int(r['submission_id']):r for r in self.query('SELECT * FROM directory_inquiry_followup')}
  for group in group_inquiries(rows):
   active=[]
   for r in group['rows']:
    sid=r['submission_id'];key='inquiry:'+str(sid);f=followups.get(sid);c=self.case(key)
    if r.get('customer_action',{}).get('state') in ['closed','withdrawn'] or (f and f['state'] in ['booked','declined']):continue
    if self.human_owned(key) or (f and f['actor']!=ACTOR) or (c and c['paused']):continue
    active.append(r)
   if not active:continue
   first=active[0];sid=group['rows'][0]['submission_id'];ids=[r['submission_id'] for r in active];key='inquiry:'+str(sid);prior=self.case(key)
   ticket=prior.get('zendesk_ticket_id') if prior else None
   human=bool(ticket and self.ticket_human_reply(ticket))
   responses=[d for r in active for d in r['deliveries'] if d.get('response_state')]
   alternative=any(r.get('customer_action',{}).get('state')=='alternative_requested' for r in active)
   age=(now()-min(utc(r['created_at']) for r in active)).total_seconds()/3600
   reminders=0
   if worker_ok and not human and not alternative:
    for r in active:
     for delivery in r['deliveries']:reminders+=int(self.reminder(r,delivery))
   missing_links=any(not d.get('response_link_expires_at') for r in active for d in r['deliveries'])
   step=('A customer or staff member replied, closed, or reassigned the support ticket; '+self.cfg['owner_name']+' must handle the reply.' if human else
    'Review the shop response and coordinate the next customer step; no appointment has been confirmed.' if responses else
    'Customer requested another shop. '+self.cfg['owner_name']+' must review the request and consent before any additional sharing.' if alternative else
    'Confirm the outcome directly with the customer; older shop notifications do not have response links.' if missing_links else
    'Await shop response; the agent checks once daily and sends one eligible reminder after 48 hours.')
   if age>=72 and not human:step+=' Escalated to '+self.cfg['owner_name']+' because more than 72 hours have elapsed.'
   state='staff_attention' if human or responses or alternative or age>=72 else 'monitoring'
   stage='shop_response' if responses else 'alternative' if alternative else 'waiting_72h' if age>=72 else 'initial'
   message_key='installer-inquiry-v1:'+str(sid)+':'+stage
   existing=self.query('SELECT state,ticket_id FROM directory_automation_messages WHERE event_key=%s',(message_key,))
   if not existing and not human and worker_ok:
    refs=', '.join('VZ-'+str(i) for i in ids)
    body=self.customer_message(refs,stage,missing_links)
    if self.live:
     self.query("INSERT INTO directory_automation_messages(event_key,kind,record_ids,recipient,subject,body,ticket_id) VALUES(%s,'inquiry',%s,%s,%s,%s,%s) ON CONFLICT(event_key) DO NOTHING",(message_key,Json(ids),first['email'].strip().lower(),'Your Vicrez installation inquiry - '+refs,body,ticket))
   result={'references':['VZ-'+str(i) for i in ids],'state':state,'next_step':step,'reminders_queued':reminders,'customer_update':existing[0]['state'] if existing else 'queued' if worker_ok and not human else 'held'}
   self.report['inquiries'].append(result)
   if self.live:
    with self.db:
     with self.db.cursor(cursor_factory=RealDictCursor) as q:
      for r in active:
       i=r['submission_id'];due=now()+timedelta(hours=24) if state=='staff_attention' else max(now()+timedelta(hours=24),utc(r['created_at'])+timedelta(hours=48))
       self.save_case(q,'inquiry',i,state,step,now()+timedelta(hours=24),ev={'group':ids,'worker_recent':worker_ok,'reminders_queued':reminders},ticket=ticket,paused=human)
       self.assign(q,'inquiry',i,step,due)
       q.execute('SELECT pg_advisory_xact_lock(19312,hashtext(%s))',(str(i),))
       q.execute('SELECT * FROM directory_inquiry_followup WHERE submission_id=%s FOR UPDATE',(i,));old=q.fetchone()
       if old and old['actor']!=ACTOR:continue
       if not old:
        q.execute("INSERT INTO directory_inquiry_followup(submission_id,state,note,actor,next_followup_at,public_message) VALUES(%s,'new',%s,%s,%s,%s)",(i,step,ACTOR,due,'Your inquiry is being monitored for a shop response. No appointment is confirmed.'))
        q.execute("INSERT INTO directory_review_audit(kind,record_id,actor,action,note) VALUES('inquiry',%s,%s,'automated_review',%s)",(str(i),ACTOR,step))
       elif old['note']!=step:
        q.execute("UPDATE directory_inquiry_followup SET note=%s,next_followup_at=%s,updated_at=NOW() WHERE submission_id=%s AND actor=%s",(step,due,i,ACTOR))
        q.execute("INSERT INTO directory_review_audit(kind,record_id,actor,action,note) VALUES('inquiry',%s,%s,'automated_followup',%s)",(str(i),ACTOR,step))
 def customer_message(self,refs,stage,legacy):
  text={'initial':'We have your installation inquiry and are checking for a response from the shop or shops selected for your request.',
   'waiting_72h':'We are following up on your installation inquiry. We have not recorded a shop response in our system yet. The shop may have contacted you directly.',
   'shop_response':'A shop has responded to your installation inquiry. Our support team is reviewing the response and the next step. This does not confirm a quote or appointment.',
   'alternative':'We received your request for help finding another shop. Our support team will review the available options and your consent before sharing your request further.'}[stage]
  return ('Hello,\n\n'+text+'\n\nReference'+('s' if ',' in refs else '')+': '+refs+'\n\nPlease reply to this email if you have already heard from a shop, need help, or no longer need an installer. If you have a quote or appointment, please let us know so we can update your request.\n\nPricing, parts compatibility and appointment availability must be confirmed directly with the installer.\n\nVicrez Installer Assistant (automated)\nVicrez Installer Network\nhttps://installers.vicrez.com/')
 def dispatch(self):
  if not self.live:return
  # A crash after provider acceptance is ambiguous. Never automatically resend it.
  self.query("UPDATE directory_automation_messages SET state='uncertain',last_error='Process stopped during provider request; reconcile ticket before retrying' WHERE state='sending'")
  messages=self.query("SELECT * FROM directory_automation_messages WHERE state='pending' ORDER BY created_at LIMIT %s",(self.cfg['max_messages_per_run'],))
  for m in messages:
   ids=m['record_ids'];eligible=True
   for sid in ids:
    r=self.rfq('requests?id='+str(sid))['requests']
    f=self.query('SELECT state,actor FROM directory_inquiry_followup WHERE submission_id=%s',(sid,))
    c=self.case('inquiry:'+str(sid))
    if len(r)!=1 or r[0]['email'].strip().lower()!=m['recipient'] or r[0].get('customer_action',{}).get('state') in ['closed','withdrawn'] or self.human_owned('inquiry:'+str(sid)) or (f and (f[0]['state'] in ['booked','declined'] or f[0]['actor']!=ACTOR)) or (c and c['paused']):eligible=False
    if len(r)==1 and m['event_key'].endswith(':waiting_72h') and any(d.get('response_state') for d in r[0].get('deliveries',[])):eligible=False
    if len(r)==1 and m['event_key'].endswith(':alternative') and r[0].get('customer_action',{}).get('state')!='alternative_requested':eligible=False
   if not eligible:
    self.query("UPDATE directory_automation_messages SET state='cancelled',last_error='Request closed or ownership changed before sending' WHERE event_key=%s",(m['event_key'],));continue
   try:self.send_message(m)
   except Exception as e:
    self.db.rollback();self.query("UPDATE directory_automation_messages SET state=CASE WHEN state='sending' THEN 'uncertain' ELSE 'held' END,last_error=%s WHERE event_key=%s",(type(e).__name__,m['event_key']))
    self.report['errors'].append({'message':m['event_key'],'error':type(e).__name__})
 def send_message(self,m):
  if not re.fullmatch(r'[^\s@<>]+@[^\s@<>]+\.[A-Za-z]{2,}',m['recipient']):raise ValueError('invalid_recipient')
  tid=m['ticket_id']
  if not tid:
   r=self.zd('GET','search.json',params={'query':'type:ticket external_id:'+m['event_key'],'per_page':100})
   if not r.ok or r.json().get('next_page'):raise RuntimeError('ticket_search_incomplete')
   hits=r.json().get('results',[])
   if hits:
    self.query("UPDATE directory_automation_messages SET state='held',last_error='An existing ticket with this event key requires reconciliation' WHERE event_key=%s",(m['event_key'],));return
   r=self.zd('GET','users/search.json',params={'query':m['recipient']})
   if not r.ok or r.json().get('next_page'):raise RuntimeError('requester_search_unavailable')
   users=[u for u in r.json()['users'] if (u.get('email') or '').lower()==m['recipient']]
   if len(users)>1 or any(u.get('suspended') or not u.get('active',True) for u in users):raise RuntimeError('requester_requires_review')
   ticket={'external_id':m['event_key'],'subject':m['subject'],'comment':{'body':m['body'],'public':True},
    'brand_id':self.cfg['brand_id'],'group_id':self.cfg['group_id'],'assignee_id':self.cfg['owner_zendesk_id'],
    # Existing Zendesk webhook excludes ai-agent, preventing two automated writers.
    'tags':['installer_agent_v1','ai-agent']+['installer_inquiry_'+str(x) for x in m['record_ids']], 'priority':'normal','status':'open'}
   if users:ticket['requester_id']=users[0]['id']
   else:ticket['requester']={'name':'Installer inquiry customer','email':m['recipient']}
   method='POST';path='tickets.json'
  else:
   if self.ticket_human_reply(tid):
    self.query("UPDATE directory_automation_messages SET state='cancelled',last_error='Support ticket has human activity or changed ownership' WHERE event_key=%s",(m['event_key'],));return
   r=self.zd('GET','tickets/'+str(tid)+'.json')
   if not r.ok:raise RuntimeError('ticket_check_unavailable')
   t=r.json()['ticket']
   if t.get('email_cc_ids') or t.get('collaborator_ids') or t.get('follower_ids'):raise RuntimeError('ticket_additional_recipients')
   u=self.zd('GET','users/'+str(t['requester_id'])+'.json')
   if not u.ok or u.json()['user']['email'].lower()!=m['recipient']:raise RuntimeError('ticket_recipient_changed')
   ticket={'comment':{'body':m['body'],'public':True},'safe_update':True,'updated_stamp':t['updated_at']}
   method='PUT';path='tickets/'+str(tid)+'.json'
  self.query("UPDATE directory_automation_messages SET state='sending',attempted_at=NOW() WHERE event_key=%s AND state='pending'",(m['event_key'],))
  r=self.zd(method,path,json={'ticket':ticket})
  if r.status_code not in [200,201]:raise RuntimeError('ticket_send_unconfirmed')
  data=r.json();t=data['ticket'];events=data.get('audit',{}).get('events',[])
  notices=[e for e in events if e.get('type')=='Notification']
  clean=bool(len(notices)==1 and notices[0].get('recipients')==[t['requester_id']] and not t.get('email_cc_ids') and not t.get('collaborator_ids') and t.get('assignee_id')==self.cfg['owner_zendesk_id'])
  state='sent' if clean else 'uncertain'
  with self.db:
   with self.db.cursor(cursor_factory=RealDictCursor) as q:
    q.execute('UPDATE directory_automation_messages SET state=%s,ticket_id=%s,sent_at=CASE WHEN %s THEN NOW() ELSE NULL END,last_error=%s WHERE event_key=%s',(state,t['id'],clean,'' if clean else 'Ticket created; requester notification needs reconciliation',m['event_key']))
    for sid in m['record_ids']:
     q.execute('UPDATE directory_automation_cases SET zendesk_ticket_id=%s,updated_at=NOW() WHERE task_key=%s',(t['id'],'inquiry:'+str(sid)))
     q.execute("INSERT INTO directory_review_audit(kind,record_id,actor,action,note,after_data) VALUES('inquiry',%s,%s,%s,%s,%s)",(str(sid),ACTOR,'customer_followup_'+state,'Support ticket '+str(t['id'])+' assigned to '+self.cfg['owner_name']+'. '+('Requester email notification created; delivery is not proven.' if clean else 'Notification needs reconciliation; no automatic resend.'),Json({'ticket_id':t['id'],'event_key':m['event_key'],'notification_confirmed':clean})))
     if clean:q.execute("UPDATE directory_inquiry_followup SET state=CASE WHEN state='new' THEN 'contacted' ELSE state END,updated_at=NOW() WHERE submission_id=%s AND actor=%s AND state NOT IN ('booked','declined')",(sid,ACTOR))
  atomic(ROOT/'state'/('ticket-'+str(t['id'])+'-'+hashlib.sha256(m['event_key'].encode()).hexdigest()[:10]+'.json'),data)
  self.report['messages'].append({'event':m['event_key'],'ticket_id':t['id'],'state':state})
 def health(self):
  if not self.live:return
  stuck=self.query("SELECT count(*) n FROM directory_automation_messages WHERE state IN ('uncertain','held')")[0]['n']
  ok=not self.report['errors'] and not stuck
  details={'applications_reviewed':len(self.report['applications']),'inquiry_groups_reviewed':len(self.report['inquiries']),'messages_sent':len([m for m in self.report['messages'] if m['state']=='sent']),'held_messages':stuck,'errors':len(self.report['errors']),'policy':POLICY}
  self.query("INSERT INTO directory_operation_runs(name,ok,details) VALUES('installer-agent',%s,%s) ON CONFLICT(name) DO UPDATE SET checked_at=NOW(),ok=EXCLUDED.ok,details=EXCLUDED.details",(ok,Json(details)))
  if not ok:
   day=now().date().isoformat();self.query("INSERT INTO directory_notifications(event_key,kind,record_id,recipient,reference,outcome,public_message) VALUES(%s,'staff',%s,%s,%s,'staff_alert',%s) ON CONFLICT(event_key) DO NOTHING",('installer-agent:'+day,day,self.cfg['owner_email'],'AGENT-'+day,'The installer agent needs attention. Review the installer operations page and VPS agent report. '+json.dumps(details)))
 def run(self):
  # A PostgreSQL session lock protects against other hosts as well as overlapping timers.
  if not self.query('SELECT pg_try_advisory_lock(19327,1) AS locked')[0]['locked']:return {'skipped':'another_agent_is_running'}
  try:
   self.applications();self.inquiries();self.dispatch();self.health()
  finally:self.query('SELECT pg_advisory_unlock(19327,1)')
  self.report['finished_at']=now().isoformat();atomic(ROOT/'state'/('latest.json' if self.live else 'dry-run.json'),self.report)
  return self.report

def main():
 p=argparse.ArgumentParser();p.add_argument('--live',action='store_true');args=p.parse_args()
 cfg=json.loads((ROOT/'config.json').read_text())
 if args.live and cfg.get('enabled') is not True:raise SystemExit('Live actions are disabled in config.json')
 a=Agent(cfg,args.live)
 try:
  result=a.run();print(json.dumps({k:result.get(k) for k in ['mode','started_at','finished_at','skipped']}|{'applications':len(result.get('applications',[])),'inquiry_groups':len(result.get('inquiries',[])),'messages':result.get('messages',[]),'errors':result.get('errors',[])}))
  if result.get('errors'):raise SystemExit(1)
 except Exception as e:
  a.db.rollback();a.report['errors'].append({'error':type(e).__name__});a.health();atomic(ROOT/'state'/'failed.json',a.report)
  print(json.dumps({'ok':False,'error':type(e).__name__}));raise SystemExit(1)
 finally:a.db.close()
if __name__=='__main__':main()
