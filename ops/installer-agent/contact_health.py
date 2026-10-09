"""Read-only DNS/provider checks; only definite failures may disable routing.

No mail, SMTP probes, model calls, replacement contacts or automatic re-enabling.
"""
import hashlib
import json
import re
import time
import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

import requests
from psycopg2.extras import Json, RealDictCursor

ACTOR = 'Vicrez contact health checker'
RESOLVERS = ('https://dns.google/resolve', 'https://cloudflare-dns.com/dns-query')
CATEGORIES = ('bounces', 'blocks', 'invalid_emails', 'unsubscribes', 'spam_reports')
_local = threading.local()


def pooled_get(*args, **kwargs):
    if not hasattr(_local, 'session'):
        _local.session = requests.Session()
    return _local.session.get(*args, **kwargs)


def recipient_key(email):
    return hashlib.sha256((email or '').strip().lower().encode()).hexdigest()


def email_domain(email):
    if not isinstance(email, str) or len(email) > 255:
        return None
    parts = email.strip().split('@')
    if len(parts) != 2 or not parts[0] or re.search(r'[\s<>]', parts[0]):
        return None
    try:
        domain = parts[1].encode('idna').decode('ascii').lower()
    except UnicodeError:
        return None
    labels = domain.split('.')
    if len(labels) < 2 or any(not re.fullmatch(r'[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?', x) for x in labels):
        return None
    return domain


def dns_query(resolver, domain, kind, get=pooled_get):
    try:
        response = get(resolver, params={'name': domain, 'type': kind},
                       headers={'Accept': 'application/dns-json'}, timeout=6)
        response.raise_for_status()
        data = response.json()
        if not isinstance(data.get('Status'), int):
            return {'state': 'unknown'}
        return {'status': data['Status'], 'answers': [a.get('data', '') for a in data.get('Answer', []) if a.get('type') == {'MX': 15, 'A': 1, 'AAAA': 28}[kind]]}
    except (requests.RequestException, ValueError, TypeError):
        return {'state': 'unknown'}


def resolver_result(resolver, domain, query=dns_query):
    mx = query(resolver, domain, 'MX')
    if mx.get('status') == 3:
        return 'nxdomain'
    if mx.get('status') != 0:
        return 'unknown'
    answers = mx.get('answers', [])
    if answers:
        if all(re.fullmatch(r'0\s+\.', str(a).strip()) for a in answers):
            return 'null_mx'
        if any(re.fullmatch(r'\d+\s+[^\s.][^\s]*', str(a).strip()) for a in answers):
            return 'mail_route'
        return 'unknown'
    # RFC 5321 implicit MX: missing MX alone does not make email invalid.
    address = [query(resolver, domain, kind) for kind in ('A', 'AAAA')]
    if any(r.get('status') == 0 and r.get('answers') for r in address):
        return 'implicit_mail_route'
    if all(r.get('status') == 0 and not r.get('answers') for r in address):
        return 'no_mail_route'
    return 'unknown'


def check_domain(domain, deadline=None):
    if deadline is not None and time.monotonic() >= deadline:
        return {'state': 'review', 'reason': 'dns_budget_exhausted', 'resolvers': []}
    answers = [resolver_result(r, domain) for r in RESOLVERS]
    definite = answers[0] == answers[1] and answers[0] in ('nxdomain', 'null_mx', 'no_mail_route')
    usable = all(x in ('mail_route', 'implicit_mail_route') for x in answers)
    return {'state': 'failed' if definite else 'clear' if usable else 'review',
            'reason': answers[0] if definite else 'dns_route_present' if usable else 'dns_uncertain',
            'resolvers': answers}


def suppression_snapshot(api_key, recipients, get=pooled_get, deadline=None):
    """Page through provider lists once, retaining only directory matches."""
    matches = {e: [] for e in recipients}
    failures = []
    for category in CATEGORIES:
        complete = False
        for offset in range(0, 100000, 500):
            if deadline is not None and time.monotonic() >= deadline:
                break
            try:
                r = get('https://api.sendgrid.com/v3/suppression/' + category,
                        params={'limit': 500, 'offset': offset},
                        headers={'Authorization': 'Bearer ' + api_key}, timeout=15)
                r.raise_for_status()
                rows = r.json()
                if not isinstance(rows, list):
                    raise ValueError('Invalid suppression response')
                for row in rows:
                    email = str(row.get('email', '')).strip().lower()
                    if email in matches:
                        matches[email].append({'category': category, 'reason': str(row.get('reason', ''))[:400], 'created': row.get('created')})
                if len(rows) < 500:
                    complete = True
                    break
            except (requests.RequestException, ValueError, TypeError):
                break
        if not complete:
            failures.append(category)
    return matches, failures


def verdict(email, dns, suppressions, provider_complete=True):
    if email_domain(email) is None:
        return 'failed', 'invalid_email_syntax'
    for s in suppressions:
        if s['category'] in ('unsubscribes', 'spam_reports', 'invalid_emails'):
            return 'failed', 'provider_' + s['category']
        # Other 5xx codes may describe sender reputation/policy, not a bad inbox.
        if s['category'] == 'bounces' and re.search(r'\b5\.1\.[12]\b', s.get('reason', '')):
            return 'failed', 'provider_invalid_recipient'
    if dns['state'] == 'failed':
        return 'failed', dns['reason']
    if suppressions:
        return 'review', 'provider_delivery_issue'
    if not provider_complete:
        return 'review', 'provider_check_incomplete'
    return dns['state'], dns['reason']


def inspect(rows, api_key):
    start = time.monotonic()
    emails = {(r.get('routing_email') or '').strip().lower() for r in rows}
    domains = sorted({email_domain(e) for e in emails} - {None})
    with ThreadPoolExecutor(max_workers=16) as pool:
        dns = dict(zip(domains, pool.map(lambda d: check_domain(d, start + 160), domains)))
    suppressions, failures = suppression_snapshot(api_key, emails, deadline=start + 220) if api_key else ({}, list(CATEGORIES))
    results = []
    for row in rows:
        email = (row.get('routing_email') or '').strip().lower()
        domain = email_domain(email)
        evidence = dns.get(domain, {'state': 'failed', 'reason': 'invalid_email_syntax', 'resolvers': []})
        provider = suppressions.get(email, [])
        state, reason = verdict(email, evidence, provider, not failures)
        results.append({'installer_id': row['id'], 'business_name': row['business_name'],
                        'recipient_hash': recipient_key(email), 'state': state, 'reason': reason,
                        'dns': evidence, 'provider': provider,
                        'routing_enabled_at_check': row['quote_routing_enabled']})
    return {'checked_at': datetime.now(timezone.utc).isoformat(), 'elapsed_seconds': round(time.monotonic() - start, 1),
            'checked': len(rows), 'domains': len(domains), 'provider_errors': failures, 'results': results}


def apply_failure(db, result, original, owner):
    """Recheck the exact contact under lock; commit pause and audit together."""
    if result['state'] != 'failed' or not original['quote_routing_enabled']:
        return False
    with db:
        with db.cursor(cursor_factory=RealDictCursor) as q:
            q.execute('SELECT id,status,routing_email,quote_routing_enabled,owner_inquiry_paused,updated_at FROM installers WHERE id=%s FOR UPDATE', (result['installer_id'],))
            fresh = q.fetchone()
            if not fresh or fresh['status'] != 'active' or not fresh['quote_routing_enabled'] or fresh['owner_inquiry_paused'] or recipient_key(fresh['routing_email']) != result['recipient_hash'] or fresh['updated_at'] != original['updated_at']:
                return False
            q.execute('UPDATE installers SET quote_routing_enabled=false,updated_at=NOW() WHERE id=%s', (result['installer_id'],))
            note = 'Online inquiry routing disabled after confirmed contact failure: ' + result['reason'] + '. Owner: ' + owner + '. Verify a working, permitted recipient before manually re-enabling. Listing retained; no email sent.'
            q.execute("INSERT INTO directory_review_audit(kind,record_id,actor,action,note,before_data,after_data) VALUES('contact-health',%s,%s,'routing-paused',%s,%s,%s)",
                      (result['installer_id'], ACTOR, note, Json({'quote_routing_enabled': True}), Json(result)))
    return True


def run(agent, atomic, root):
    state_file = root / 'state/contact-health.json'
    prior = json.loads(state_file.read_text()) if state_file.exists() else {}
    managed = [r['installer_id'] for r in prior.get('results', []) if r.get('paused_by_checker')]
    rows = agent.query("SELECT id,business_name,status,routing_email,quote_routing_enabled,owner_inquiry_paused,updated_at FROM installers WHERE status='active' AND ((quote_routing_enabled=true AND owner_inquiry_paused IS NOT TRUE AND COALESCE(google_status,'') NOT IN ('CLOSED_PERMANENTLY','CLOSED_TEMPORARILY')) OR id=ANY(%s::text[])) ORDER BY id", (managed,))
    report = inspect(rows, agent.cfg.get('contact_health_sendgrid_key'))
    by_id = {r['id']: r for r in rows}
    for result in report['results']:
        result['paused_by_checker'] = result['installer_id'] in managed and not result['routing_enabled_at_check']
        if agent.live and result['state'] == 'failed':
            result['paused_now'] = apply_failure(agent.db, result, by_id[result['installer_id']], agent.cfg['owner_name'])
            result['paused_by_checker'] |= result['paused_now']
    issues = [r for r in report['results'] if r['state'] != 'clear' or r['paused_by_checker']]
    summary = {'checked': report['checked'], 'domains': report['domains'], 'clear': sum(r['state'] == 'clear' for r in report['results']),
               'failed': sum(r['state'] == 'failed' for r in report['results']), 'review': sum(r['state'] == 'review' for r in report['results']),
               'paused_now': sum(r.get('paused_now', False) for r in report['results']), 'paused_awaiting_review': sum(r['paused_by_checker'] for r in report['results']),
               'provider_errors': report['provider_errors'], 'owner': agent.cfg['owner_name'], 'elapsed_seconds': report['elapsed_seconds'],
               'issues': [{k:r[k] for k in ('installer_id','business_name','state','reason','paused_by_checker')} for r in issues]}
    if agent.live:
        atomic(state_file, report)
        agent.query("INSERT INTO directory_operation_runs(name,ok,details) VALUES('contact-health',%s,%s) ON CONFLICT(name) DO UPDATE SET checked_at=NOW(),ok=EXCLUDED.ok,details=EXCLUDED.details", (not issues and not report['provider_errors'], Json(summary)))
    else:
        atomic(root / 'state/contact-health-dry-run.json', report)
    return summary
