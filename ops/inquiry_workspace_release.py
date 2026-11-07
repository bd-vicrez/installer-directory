"""Run on the existing host after staging the two tested workspace modules.

Usage: python3 -B inquiry_workspace_release.py deploy|verify|rollback
This release never restarts the quote backend, changes its configuration,
opens a host port, or writes to either application database.
"""
import hashlib
import json
import sqlite3
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path('/root/installer-operations/ui-ux-20261107')
SOURCE = ROOT / 'service'
NGINX = Path('/root/vicrez-ai-agent/nginx.conf')
NGINX_CONTAINER = 'vicrez-ai-agent-nginx-1'
BACKEND = 'vicrez-ai-agent-vicrez-ai-agent-1'
CONTAINER = 'vicrez-inquiry-workspace'
IMAGE = 'sha256:134a8be803b846ae4559873e8101e4f06161200c6e774d84d5969c73dda61fc4'
BASE_NGINX = 'ccc792ff29558a2a1d193e71ff945bff6cca2378218e807237a4ba733dfde4dc'
DATA = Path('/root/vicrez-ai-agent/data')
EXPECTED = {
    'directory_rfq.py': '1b0881ff10a292c55e0373afe54c2f6184d561ab1a095aafe4839beb5e12f8a0',
    'quote_delivery.py': 'fe7d9c00b05fdc19c6be8e43a11097438d5792c1c739003eeaf25274d072cd84',
    'quote_safety.py': 'c9d628121ff950a585b0df35528618cda5a4d4366639d3f6a0d5233f318082ab',
}
BLOCK = '''    # BEGIN inquiry-workspace-20261107
    location = /internal/directory-rfq/workspace {
        resolver 127.0.0.11 valid=30s ipv6=off;
        set $inquiry_workspace_upstream http://vicrez-inquiry-workspace:8080;
        proxy_pass $inquiry_workspace_upstream;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 3s;
        proxy_read_timeout 20s;
        proxy_cache off;
        proxy_buffering off;
    }
    # END inquiry-workspace-20261107

'''


def run(*args):
    result = subprocess.run(args, capture_output=True, text=True, timeout=45)
    if result.returncode:
        raise RuntimeError('Command failed: ' + ' '.join(args[:4]) + '\n' + result.stderr[-1000:])
    return result.stdout.strip()


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def save(name, value):
    path = ROOT / name
    path.write_text(json.dumps(value, indent=2))
    path.chmod(0o600)


def baseline():
    for name, digest in EXPECTED.items():
        assert sha(Path('/root/vicrez-ai-agent/app/routes') / name) == digest, 'Concurrent backend edit: ' + name
    instance = json.loads(run('docker', 'inspect', BACKEND))[0]
    assert instance['Image'] == IMAGE, 'Backend runtime changed'
    with sqlite3.connect((DATA / 'rfq_submissions.db').as_uri() + '?mode=ro', uri=True) as db:
        db.execute('PRAGMA query_only=ON')
        tables = {}
        for table in ['rfq_submissions', 'directory_requests', 'quote_intake_reviews', 'directory_outbox']:
            rows = db.execute('SELECT * FROM ' + table + ' ORDER BY 1').fetchall()
            tables[table] = {'count': len(rows), 'sha256': hashlib.sha256(json.dumps(rows, default=str).encode()).hexdigest()}
        age = time.time() - db.execute('SELECT heartbeat FROM directory_worker_state WHERE id=1').fetchone()[0]
        assert age < 120, 'Quote worker check-in overdue'
    return {'quote_config_sha': sha(DATA / 'quote-safety.json'), 'backend_started_at': instance['State']['StartedAt'], 'tables': tables, 'worker_age_seconds': round(age)}


def check_api():
    secret = (DATA / 'directory-rfq-secret').read_text().strip()
    url = 'https://ai.vicrez.com/internal/directory-rfq/workspace'
    try:
        urllib.request.urlopen(url, timeout=15)
        raise AssertionError('Unauthenticated workspace request succeeded')
    except urllib.error.HTTPError as error:
        assert error.code == 401
    req = urllib.request.Request(url + '?scope=all&limit=20', headers={'Authorization': 'Bearer ' + secret})
    with urllib.request.urlopen(req, timeout=20) as response:
        assert 'no-store' in response.headers.get('Cache-Control', '')
        data = json.load(response)
    assert data['version'] == 'workspace-v1' and len(data['items']) <= 20
    assert data['worker_recent']
    # Existing clients and automation retain the old API shape.
    req = urllib.request.Request('https://ai.vicrez.com/internal/directory-rfq/requests?id=41', headers={'Authorization': 'Bearer ' + secret})
    with urllib.request.urlopen(req, timeout=20) as response:
        old = json.load(response)
    assert old['version'] == 'phase-a' and old['requests'][0]['submission_id'] == 41
    return {'scope_counts': data['counts'], 'old_api_compatible': True, 'authentication_enforced': True}


def replace_nginx(previous, revised):
    assert NGINX.read_bytes() == previous, 'Concurrent nginx edit'
    # Keep the bind-mounted inode; atomic replacement would leave nginx seeing
    # the previous file. Validate before graceful reload; restore on any failure.
    NGINX.write_bytes(revised)
    try:
        mounted = subprocess.check_output(['docker', 'exec', NGINX_CONTAINER, 'cat', '/etc/nginx/conf.d/default.conf'], timeout=15)
        assert mounted == revised, 'Nginx bind mount does not match the reviewed file'
        run('docker', 'exec', NGINX_CONTAINER, 'nginx', '-t')
        run('docker', 'exec', NGINX_CONTAINER, 'nginx', '-s', 'reload')
    except Exception:
        NGINX.write_bytes(previous)
        run('docker', 'exec', NGINX_CONTAINER, 'nginx', '-t')
        run('docker', 'exec', NGINX_CONTAINER, 'nginx', '-s', 'reload')
        raise


def wait_for_api():
    # nginx -s reload returns after signalling the master, before replacement
    # workers necessarily accept requests. Treat readiness as an observed state.
    for attempt in range(15):
        try:
            return check_api()
        except (AssertionError, urllib.error.HTTPError, urllib.error.URLError):
            if attempt == 14:
                raise
            time.sleep(1)


def main():
    mode = sys.argv[1]
    if mode == 'deploy':
        assert sha(NGINX) == BASE_NGINX, 'Nginx changed; re-review before deployment'
        assert not (ROOT / 'before.json').exists(), 'Release already started; inspect its status'
        for name in ['inquiry_workspace.py', 'inquiry_workspace_service.py']:
            compile((SOURCE / name).read_text(), name, 'exec')
        before = baseline()
        save('before.json', before)
        original = NGINX.read_bytes()
        (ROOT / 'nginx.before.conf').write_bytes(original)
        anchor = b'    location /static'
        assert original.count(anchor) == 1, 'Ambiguous nginx insertion point'
        revised = original.replace(anchor, BLOCK.encode() + anchor, 1)
        # Mount the database DIRECTORY read-only so SQLite sees its rollback
        # journal and future atomic database replacements, not a stale inode.
        run('docker', 'run', '-d', '--name', CONTAINER, '--restart', 'unless-stopped',
            '--network', 'vicrez-ai-agent_default', '--read-only', '--cap-drop', 'ALL',
            '--security-opt', 'no-new-privileges', '--memory', '128m', '--cpus', '0.5',
            '--pids-limit', '64', '--tmpfs', '/tmp:rw,noexec,nosuid,size=8m',
            '--mount', f'type=bind,source={SOURCE},target=/workspace,readonly',
            '--mount', f'type=bind,source={DATA},target=/data,readonly',
            '--mount', f'type=bind,source={DATA / "directory-rfq-secret"},target=/run/secrets/directory-rfq-secret,readonly',
            '--workdir', '/workspace', '--entrypoint', 'python', IMAGE,
            '-B', '-m', 'uvicorn', 'inquiry_workspace_service:app', '--host', '0.0.0.0', '--port', '8080', '--workers', '1', '--no-access-log')
        try:
            probe = "import urllib.request,urllib.error;\ntry: urllib.request.urlopen('http://127.0.0.1:8080/internal/directory-rfq/workspace',timeout=3)\nexcept urllib.error.HTTPError as e: assert e.code==401"
            for attempt in range(15):
                try:
                    run('docker', 'exec', CONTAINER, 'python', '-B', '-c', probe)
                    break
                except RuntimeError:
                    if attempt == 14: raise
                    time.sleep(1)
            replace_nginx(original, revised)
            proof = wait_for_api()
            after = baseline()
            assert before['quote_config_sha'] == after['quote_config_sha']
            assert before['backend_started_at'] == after['backend_started_at']
            save('after.json', {**after, **proof, 'nginx_sha': sha(NGINX)})
            print(json.dumps({**proof, 'quote_backend_restarted': False, 'existing_records_unchanged': before['tables'] == after['tables']}))
        except Exception:
            if NGINX.read_bytes() == revised:
                replace_nginx(revised, original)
            run('docker', 'stop', CONTAINER)
            raise
    elif mode == 'verify':
        print(json.dumps({**baseline(), **check_api()}))
    elif mode == 'rollback':
        current = NGINX.read_bytes()
        assert current.count(BLOCK.encode()) == 1, 'Route changed; inspect before rollback'
        # Remove only our exact block, preserving unrelated configuration edits.
        replace_nginx(current, current.replace(BLOCK.encode(), b'', 1))
        run('docker', 'stop', CONTAINER)
        print(json.dumps({'workspace_route_removed': True, 'sidecar_stopped': True}))
    else:
        raise SystemExit('Choose deploy, verify or rollback')


if __name__ == '__main__':
    main()
