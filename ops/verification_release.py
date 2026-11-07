"""Guarded release commands, run on the VPS after staging and isolated QA.

Stages are explicit: preflight -> schema -> web release -> worker -> verify.
Credentials never appear in output. A backup and unchanged baseline are required.
"""
import argparse,hashlib,json,os,shutil,subprocess
from pathlib import Path
import psycopg2,requests

ROOT=Path('/root/installer-operations/verification-20261107')
LIVE=Path('/root/installer-operations/agent')
BASE={'agent.py':'c0aee2e49ba0c3a27b4e3e1624af5ca4be87fecbac965de1fad86945dee9ebb6',
 'rules.py':'2a7a2208c1c47fafcd5fbd4398a53c60c7c00fd9f72f60b01a7570666a95a22e',
 'evidence.py':'1a592f28929a948d3822bf50f5dfc9f157ccaea67aaec2a886719123f6b43210'}
FILES=['agent.py','rules.py','evidence.py','claims.py','README.md']
UNITS=['installer-agent.service','installer-verification.service','installer-verification.timer']
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def db():return psycopg2.connect(json.loads(Path('/root/installer-operations/config.json').read_text())['DATABASE_URL'])
def run(*args):return subprocess.run(args,check=True,capture_output=True,text=True).stdout.strip()
def save(p,data):
 p.write_text(json.dumps(data,indent=2,default=str));p.chmod(0o600)
def snapshot():
 with db() as c,c.cursor() as q:
  q.execute('SELECT id,md5(to_jsonb(i)::text) FROM installers i');shops=dict(q.fetchall())
  q.execute("SELECT to_jsonb(c) FROM directory_automation_cases c WHERE task_key='inquiry:41'");case=q.fetchall()
  q.execute('SELECT to_jsonb(f) FROM directory_inquiry_followup f WHERE submission_id=41');followup=q.fetchall()
 return {'shops':shops,'vz41':hashlib.sha256(json.dumps([case,followup],sort_keys=True,default=str).encode()).hexdigest(),
  'quote_safety':sha(Path('/root/vicrez-ai-agent/data/quote-safety.json')),'agent_config':sha(LIVE/'config.json')}
def preflight():
 for name,digest in BASE.items():assert sha(LIVE/name)==digest,'Live worker changed: '+name
 assert (ROOT/'pre-autonomy.dump').stat().st_size>1000000
 toc=run('docker','run','--rm','-v',str(ROOT)+':/backup:ro','postgres:17-alpine','pg_restore','--list','/backup/pre-autonomy.dump')
 assert 'TABLE DATA public installers' in toc
 report=(ROOT/'qa-python-tests.txt').read_text();assert '\nOK\n' in report and 'FAILED (' not in report
 rollback=ROOT/'rollback';rollback.mkdir(mode=0o700,exist_ok=True)
 for name in FILES:
  if (LIVE/name).exists() and not (rollback/name).exists():shutil.copy2(LIVE/name,rollback/name)
 for name in UNITS:
  p=Path('/etc/systemd/system')/name
  if p.exists() and not (rollback/name).exists():shutil.copy2(p,rollback/name)
 if not (ROOT/'before.json').exists():save(ROOT/'before.json',snapshot())
 print(json.dumps({'preflight':'passed','backup_bytes':(ROOT/'pre-autonomy.dump').stat().st_size,'existing_shops':len(json.loads((ROOT/'before.json').read_text())['shops'])}))
def schema():
 assert (ROOT/'before.json').exists()
 with db() as c,c.cursor() as q:
  q.execute("SET lock_timeout='5s'; SET statement_timeout='30s'")
  q.execute((ROOT/'staging/migration.sql').read_text())
  q.execute("SELECT has_table_privilege('installer_agent_v1','directory_owner_grants','INSERT'),has_table_privilege('installer_agent_v1','directory_owner_grants','UPDATE'),has_table_privilege('installer_agent_v1','directory_staff_users','SELECT')")
  assert q.fetchone()==(False,False,False),'Worker privilege expansion exceeds scope'
 print(json.dumps({'schema':'applied','owner_grant_writes_for_worker':False}))
def worker():
 assert (ROOT/'before.json').exists()
 for name,digest in BASE.items():assert sha(LIVE/name)==digest,'Live worker changed: '+name
 cfg=json.loads((LIVE/'config.json').read_text());assert cfg.get('enabled') is True
 base='https://installers.vicrez.com'
 r=requests.get(base+'/claim/verify',timeout=30);assert r.status_code==200 and 'Verify shop ownership' in r.text
 r=requests.post(base+'/api/claims/verify',headers={'Origin':base},json={'action':'inspect','token':'invalid'},timeout=30)
 assert r.status_code==401,'New web proof route must be live before queuing links'
 state=subprocess.run(['systemctl','is-active','installer-agent.service'],capture_output=True,text=True).stdout.strip()
 assert state not in ('active','activating'),'Wait for daily worker to finish'
 run('systemctl','stop','installer-agent.timer')
 try:
  for name in FILES:
   target=LIVE/name;temp=target.with_suffix(target.suffix+'.release');temp.write_bytes((ROOT/'staging/agent'/name).read_bytes());temp.chmod(0o600);os.replace(temp,target)
  for name in UNITS:shutil.copyfile(ROOT/'staging/agent'/name,Path('/etc/systemd/system')/name)
  run('systemd-analyze','verify',*[str(Path('/etc/systemd/system')/name) for name in UNITS])
  run('systemctl','daemon-reload')
  run('systemctl','enable','--now','installer-verification.timer')
 except Exception:
  subprocess.run(['systemctl','disable','--now','installer-verification.timer'],capture_output=True)
  for name in FILES:
   if (ROOT/'rollback'/name).exists():shutil.copy2(ROOT/'rollback'/name,LIVE/name)
  shutil.copy2(ROOT/'rollback/installer-agent.service','/etc/systemd/system/installer-agent.service')
  run('systemctl','daemon-reload');raise
 finally:run('systemctl','start','installer-agent.timer')
 run('systemctl','start','--no-block','installer-verification.service')
 print(json.dumps({'worker':'installed','hourly_timer':run('systemctl','is-enabled','installer-verification.timer'),'daily_timer':run('systemctl','is-enabled','installer-agent.timer')}))
def verify():
 before=json.loads((ROOT/'before.json').read_text());after=snapshot()
 changed=[k for k,v in before['shops'].items() if after['shops'].get(k)!=v]
 assert not changed,'Existing listings changed during release; review before proceeding'
 for k in ('vz41','quote_safety','agent_config'):assert before[k]==after[k],k+' changed during release'
 save(ROOT/'after.json',after)
 report=json.loads((LIVE/'state/verification-latest.json').read_text())
 result={'existing_listings_unchanged':len(before['shops']),'new_listings':len(after['shops'])-len(before['shops']),
  'suppressions_and_vz41_unchanged':True,'hourly_timer':run('systemctl','is-active','installer-verification.timer'),
  'daily_timer':run('systemctl','is-active','installer-agent.timer'),'report':{k:report.get(k) for k in ('started_at','finished_at','applications','claims','errors')}}
 save(ROOT/'release-report.json',result);print(json.dumps(result,default=str))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('stage',choices=['preflight','schema','worker','verify']);args=p.parse_args();globals()[args.stage]()
