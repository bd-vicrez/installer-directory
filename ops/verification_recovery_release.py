"""Explicit, guarded release stages. No credentials are printed; no worker is manually run."""
import argparse,hashlib,json,os,pathlib,shutil,subprocess
import psycopg2
ROOT=pathlib.Path('/root/installer-operations/recovery-20261108')
LIVE=pathlib.Path('/root/installer-operations/agent')
FILES=['claims.py','rules.py','evidence.py']
TIMERS=['installer-agent.timer','installer-verification.timer']
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def normal(p):return hashlib.sha256(p.read_bytes().replace(b'\r\n',b'\n')).hexdigest()
def run(*a):return subprocess.run(a,check=True,capture_output=True,text=True).stdout.strip()
def db():return psycopg2.connect(json.loads(pathlib.Path('/root/installer-operations/config.json').read_text())['DATABASE_URL'])
def save(name,d):
 p=ROOT/name;p.write_text(json.dumps(d,indent=2,default=str));p.chmod(0o600)
def snapshot():
 with db() as c,c.cursor() as q:
  data={}
  for table,key in [('installers','id'),('directory_shop_pilot','installer_id'),('directory_owner_grants','id')]:
   q.execute(f'SELECT {key}::text,md5(to_jsonb(t)::text) FROM {table} t');data[table]=dict(q.fetchall())
  q.execute("SELECT to_jsonb(t) FROM directory_automation_cases t WHERE task_key='inquiry:41'");a=q.fetchall()
  q.execute('SELECT to_jsonb(t) FROM directory_inquiry_followup t WHERE submission_id=41');b=q.fetchall()
  data['vz41']=hashlib.sha256(json.dumps([a,b],sort_keys=True,default=str).encode()).hexdigest()
 data.update(suppressions=sha(pathlib.Path('/root/vicrez-ai-agent/data/quote-safety.json')),agent_config=sha(LIVE/'config.json'))
 return data
def preflight():
 expected=json.loads((ROOT/'expected-worker.json').read_text())
 for f in FILES:assert normal(LIVE/f)==expected[f],'Concurrent live worker change: '+f
 assert 'Ran 59 tests' in (ROOT/'qa-python-tests.txt').read_text() and '\nOK\n' in (ROOT/'qa-python-tests.txt').read_text()
 assert all(run('systemctl','is-enabled',t)=='enabled' for t in TIMERS)
 backup=ROOT/'rollback';backup.mkdir(mode=0o700,exist_ok=True)
 for f in FILES:
  if not (backup/f).exists():shutil.copy2(LIVE/f,backup/f)
 if not (ROOT/'before.json').exists():save('before.json',snapshot())
 if not (ROOT/'backup.json').exists():
  result=json.loads(run('python3','-B','/root/installer-operations/operations_worker.py','--backup'))
  assert result['postgres_archive_listing']=='passed' and result['sqlite_integrity']=='ok'
  save('backup.json',result)
 print(json.dumps({'preflight':'passed','listing_count':len(json.loads((ROOT/'before.json').read_text())['installers']),'backup_verified':True}))
def schema():
 assert (ROOT/'backup.json').exists() and (ROOT/'before.json').exists()
 with db() as c,c.cursor() as q:
  q.execute("SET lock_timeout='5s'; SET statement_timeout='30s'");q.execute((ROOT/'migration.sql').read_text())
  q.execute("SELECT has_table_privilege('installer_agent_v1','directory_owner_grants','INSERT'),has_table_privilege('installer_agent_v1','directory_owner_grants','UPDATE'),has_table_privilege('installer_agent_v1','directory_staff_users','SELECT')")
  assert q.fetchone()==(False,False,False)
 print(json.dumps({'schema':'applied','restricted_worker_permissions':'preserved'}))
def worker():
 assert (ROOT/'before.json').exists()
 expected=json.loads((ROOT/'expected-worker.json').read_text())
 for f in FILES:assert normal(LIVE/f)==expected[f],'Concurrent worker change: '+f
 with db() as c,c.cursor() as q:
  q.execute('SELECT pg_try_advisory_lock(19327,1)');assert q.fetchone()[0],'Existing agent run is active; wait for it to finish'
  for name in ['installer-agent.service','installer-verification.service']:
   s=subprocess.run(['systemctl','is-active',name],capture_output=True,text=True).stdout.strip();assert s not in ('active','activating'),'Worker active; wait'
  try:
   for t in TIMERS:run('systemctl','stop',t)
   for f in FILES:
    raw=(ROOT/'agent'/f).read_bytes();compile(raw,str(f),'exec');p=LIVE/f;temp=p.with_suffix('.recovery.tmp');temp.write_bytes(raw);temp.chmod(0o600);os.replace(temp,p)
  except Exception:
   for f in FILES:shutil.copy2(ROOT/'rollback'/f,LIVE/f)
   raise
  finally:
   for t in TIMERS:run('systemctl','start',t)
   q.execute('SELECT pg_advisory_unlock(19327,1)')
 print(json.dumps({'worker':'updated','timers':{t:run('systemctl','is-active',t) for t in TIMERS},'manual_review_run':False}))
def verify():
 before=json.loads((ROOT/'before.json').read_text());after=snapshot()
 for table in ['installers','directory_shop_pilot','directory_owner_grants']:
  changed=[k for k,v in before[table].items() if after[table].get(k)!=v];assert not changed,'Existing records changed: '+table
 for key in ['suppressions','agent_config','vz41']:assert before[key]==after[key],key+' changed'
 for f in FILES:assert normal(LIVE/f)==normal(ROOT/'agent'/f),'Worker deployment mismatch'
 result={'existing_listings_unchanged':len(before['installers']),'existing_pilot_records_unchanged':len(before['directory_shop_pilot']),
  'existing_owner_grants_unchanged':len(before['directory_owner_grants']),'suppressions_vz41_configuration_unchanged':True,
  'new_listings':len(after['installers'])-len(before['installers']),'timers':{t:run('systemctl','is-active',t) for t in TIMERS}}
 save('after.json',after);save('release-report.json',result);print(json.dumps(result))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('stage',choices=['preflight','schema','worker','verify']);globals()[p.parse_args().stage]()
