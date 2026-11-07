"""Prepare business-contact proof. This worker cannot grant owner access."""
import hashlib,json,re,uuid
from datetime import datetime,timezone,timedelta
from urllib.parse import unquote
from psycopg2.extras import RealDictCursor,Json
from rules import ACTOR,host,evidence_checks,ai_valid
from evidence import gather

def stamp():return datetime.now(timezone.utc)
def fingerprint(c):
 return hashlib.sha256(json.dumps({'payload':c['payload_hash'],'shop':c['shop_snapshot']},sort_keys=True,default=str).encode()).hexdigest()
def contact_basis(c,ev):
 email=c['email'].strip().lower();domain=email.rsplit('@',1)[-1];site=host(c['shop_snapshot'].get('website',''))
 # No guessed contact, arbitrary domain suffix matching, or agency delegation.
 if not re.fullmatch(r"[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}",email):return None
 if re.search(r'\b(?:former|ex.employee|researcher|security|test|marketer|marketing|agency|seo|third.party)\b',c.get('relationship',''),re.I):return None
 public=set();mailto=set()
 for p in ev.get('pages',[]):
  if host(p['url'])!=site:continue
  public.update(x.lower() for x in re.findall(r"[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}",p['text']))
  mailto.update(unquote(x[7:].split('?')[0]).lower() for x in p.get('links',[]) if x.lower().startswith('mailto:'))
 identified=(ev.get('ai') or {}).get('business_contact_emails',[])
 if isinstance(identified,list) and email in public and email in mailto and email in identified:return 'published_business_email'
 if site and domain==site:return 'business_website_domain'
 return None

def decide(c,ev):
 if c['shop_snapshot']['status']!='active':return {'state':'staff_attention','reason':'listing_unavailable'}
 if c.get('ownership_conflict'):return {'state':'staff_attention','reason':'ownership_conflict'}
 basis=contact_basis(c,ev)
 if not basis:return {'state':'staff_attention','reason':'business_contact_not_corroborated'}
 app={**c['shop_snapshot'],'install_capabilities':[],'consent_at':c['consent_at'],'consent_version':c['consent_version']}
 checks={k:v for k,v in evidence_checks(app,ev).items() if k!='services_on_website'}
 checks['ai_evidence_review']=ai_valid(ev.get('ai'),ev.get('pages',[]),[])
 missing=[k for k,v in checks.items() if not v]
 return {'state':'staff_attention' if missing else 'awaiting_business_confirmation','reason':'business_evidence_incomplete' if missing else basis,'missing':missing,'checks':checks}

SELECT="""SELECT c.*,directory_shop_identity(i) AS shop_snapshot,
 EXISTS(SELECT 1 FROM directory_owner_grants g WHERE g.installer_id=c.installer_id AND (NOT g.active OR lower(g.email)<>lower(c.email)))
 OR EXISTS(SELECT 1 FROM directory_claims other WHERE other.installer_id=c.installer_id AND other.id<>c.id
   AND other.status IN ('pending','needs_information','verified') AND lower(other.email)<>lower(c.email)) AS ownership_conflict
 FROM directory_claims c JOIN installers i ON i.id=c.installer_id"""

def commit(agent,c,ev,d):
 key='claim:'+c['id'];fp=fingerprint(c)
 with agent.db:
  with agent.db.cursor(cursor_factory=RealDictCursor) as q:
   q.execute('SELECT pg_advisory_xact_lock(19313,hashtext(%s))',(key,))
   q.execute(SELECT+' WHERE c.id=%s FOR UPDATE OF c,i',(c['id'],));fresh=q.fetchone()
   q.execute('SELECT * FROM directory_action_assignments WHERE task_key=%s FOR UPDATE',(key,));assignment=q.fetchone()
   q.execute('SELECT * FROM directory_automation_cases WHERE task_key=%s FOR UPDATE',(key,));case=q.fetchone()
   if not fresh or fresh['status'] not in ('pending','needs_information') or fingerprint(fresh)!=fp or (fresh['reviewer'] and fresh['reviewer']!=ACTOR) or (assignment and assignment['actor']!=ACTOR) or (case and case['paused']):return 'changed_or_human_owned'
   if fresh['ownership_conflict']:d={'state':'staff_attention','reason':'ownership_conflict'}
   # Existing proof is never silently resent. Expiry and changed inputs need staff review.
   q.execute('SELECT id,expires_at,consumed_at FROM directory_claim_verifications WHERE claim_id=%s',(c['id'],));prior=q.fetchone()
   if prior:
    if case and case['state']=='awaiting_business_confirmation' and prior['expires_at']>stamp() and fingerprint(fresh)==case['fingerprint']:return 'awaiting_existing_proof'
    d={'state':'staff_attention','reason':'proof_expired_or_request_changed'}
   if d['state']=='awaiting_business_confirmation':
    q.execute("SELECT 1 FROM directory_claim_verifications v JOIN directory_claims other ON other.id=v.claim_id WHERE other.installer_id=%s AND v.created_at>NOW()-INTERVAL '7 days'",(c['installer_id'],))
    if q.fetchone():d={'state':'staff_attention','reason':'recent_verification_request'}
   if d['state']=='awaiting_business_confirmation':
    vid=str(uuid.uuid4());due=stamp()+timedelta(hours=48)
    q.execute('INSERT INTO directory_claim_verifications(id,claim_id,recipient,claim_payload_hash,shop_snapshot,evidence,expires_at) VALUES(%s,%s,%s,%s,%s,%s,%s)',(vid,c['id'],c['email'].lower(),c['payload_hash'],Json(c['shop_snapshot']),Json({'decision':d,'research':ev}),due))
    q.execute("INSERT INTO directory_notifications(event_key,kind,record_id,recipient,reference,outcome,public_message) VALUES(%s,'claim',%s,%s,%s,'ownership_verification',%s) ON CONFLICT(event_key) DO NOTHING",('claim-proof:'+vid,vid,c['email'].lower(),'CLM-'+c['id'][:8].upper(),'Shop: '+c['shop_snapshot']['business_name']))
    message='We corroborated your business contact. Open the private verification email and confirm your authority within 48 hours. Owner access is not granted until you complete that step.'
    step='Await single-use business contact confirmation. No owner access or requested public edits have been approved.'
   else:
    due=stamp()+timedelta(days=7)
    message='We could not independently verify your authority to manage this listing. Reply with your claim reference to b2bsupport@vicrezcom.zendesk.com so we can verify through an established business contact. Owner access and public edits remain unapproved.'
    step='Staff verification required: '+d['reason']+'. Do not grant access based on public identity alone.'
    q.execute('UPDATE directory_claim_verifications SET cancelled_at=NOW() WHERE claim_id=%s AND consumed_at IS NULL AND cancelled_at IS NULL',(c['id'],))
   note=('Automated ownership review: '+d['reason']+'. Missing: '+', '.join(d.get('missing',[])))[:1500]
   changed=fresh['status']!='needs_information' or fresh['public_message']!=message
   q.execute("UPDATE directory_claims SET status='needs_information',reviewer=%s,review_note=%s,public_message=%s,reviewed_at=CASE WHEN %s THEN NOW() ELSE reviewed_at END WHERE id=%s",(ACTOR,note,message,changed,c['id']))
   if d['state']=='awaiting_business_confirmation' and changed:
    # The proof email contains this same update. Keep the trigger's audit row,
    # but do not send a redundant second email for the same review transaction.
    q.execute("UPDATE directory_notifications SET state='expired',last_error='Review update included in ownership verification email',updated_at=NOW() WHERE event_key='claim:'||%s||':review:'||(SELECT reviewed_at::text FROM directory_claims WHERE id=%s) AND state='pending'",(c['id'],c['id']))
   agent.save_case(q,'claim',c['id'],d['state'],step,due,fp,{'decision':d,'research':ev},paused=d['state']=='staff_attention')
   agent.assign(q,'claim',c['id'],step,due)
   q.execute("INSERT INTO directory_review_audit(kind,record_id,actor,action,note,after_data) VALUES('claim',%s,%s,'automated_verification_review',%s,%s)",(c['id'],ACTOR,note,Json(d)))
   return d['state']

def run(agent):
 rows=agent.query(SELECT+""" LEFT JOIN directory_automation_cases a ON a.task_key='claim:'||c.id
  LEFT JOIN directory_action_assignments x ON x.task_key='claim:'||c.id
  WHERE c.status IN ('pending','needs_information') AND (c.reviewer='' OR c.reviewer=%s)
   AND (x.actor IS NULL OR x.actor=%s) AND NOT COALESCE(a.paused,false)
  ORDER BY (a.task_key IS NULL) DESC,a.updated_at NULLS FIRST,c.submitted_at LIMIT 500""",(ACTOR,ACTOR))
 used=agent.query("SELECT count(*) n FROM directory_automation_attempts WHERE created_at>=date_trunc('day',NOW())")[0]['n'];attempted=0
 for c in rows:
  prior=agent.case('claim:'+c['id']);fp=fingerprint(c)
  if prior and prior['fingerprint']==fp and prior['next_check_at']>stamp():continue
  if attempted>=max(1,agent.cfg['max_applications_per_run']//2) or used>=agent.cfg['max_ai_reviews_per_day']:break
  used+=1;attempted+=1
  if agent.live:agent.query('INSERT INTO directory_automation_attempts(application_id) VALUES(%s)',('claim:'+c['id'],))
  try:
   app={**c['shop_snapshot'],'id':'claim-'+c['id'],'email':'','install_capabilities':[],'details':{},'consent_at':c['consent_at'],'consent_version':c['consent_version']}
   # Conflicts, missing sites and explicitly external/test relationships never need model calls.
   ev={'pages':[]} if c['ownership_conflict'] or (prior and prior['state']=='awaiting_business_confirmation') or not all(app.get(k) for k in ('website','phone','street_address','city','state','zip_code')) or re.search(r'\b(?:former|researcher|test|marketing|marketer|agency)\b',c['relationship'],re.I) else gather(app,agent.cfg)
   d=decide(c,ev);result=commit(agent,c,ev,d) if agent.live else d['state']
   agent.report['claims'].append({'reference':'CLM-'+c['id'][:8].upper(),'business':c['shop_snapshot']['business_name'],'decision':d,'result':result})
  except Exception as e:
   agent.db.rollback();agent.report['errors'].append({'claim':'CLM-'+c['id'][:8].upper(),'error':type(e).__name__})
   # Reserve the failed attempt and put it behind older work; no applicant message
   # is sent when a research provider failed. Recheck human ownership under lock.
   if agent.live:
    with agent.db:
     with agent.db.cursor(cursor_factory=RealDictCursor) as q:
      key='claim:'+c['id'];q.execute('SELECT pg_advisory_xact_lock(19313,hashtext(%s))',(key,))
      q.execute(SELECT+' WHERE c.id=%s FOR UPDATE OF c,i',(c['id'],));fresh=q.fetchone()
      q.execute('SELECT actor FROM directory_action_assignments WHERE task_key=%s',(key,));assignment=q.fetchone()
      q.execute('SELECT paused FROM directory_automation_cases WHERE task_key=%s FOR UPDATE',(key,));case=q.fetchone()
      if fresh and fresh['status'] in ('pending','needs_information') and fingerprint(fresh)==fp and (not fresh['reviewer'] or fresh['reviewer']==ACTOR) and (not assignment or assignment['actor']==ACTOR) and (not case or not case['paused']):
       agent.save_case(q,'claim',c['id'],'retry','Evidence source unavailable; retry after one hour. No owner access granted.',stamp()+timedelta(hours=1),fp,{'error':type(e).__name__})
