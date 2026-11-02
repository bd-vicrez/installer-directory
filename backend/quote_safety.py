"""Fail-closed quote intake policy; no provider sends or credentials in logs."""
import hashlib
import json
import os
import re
import time
from pathlib import Path

import httpx
from fastapi import HTTPException

CONFIG_PATH = Path(os.getenv('QUOTE_SAFETY_CONFIG', '/app/data/quote-safety.json'))
TURNSTILE_ACTION = 'installer_quote'
SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'


def real_turnstile_key(value):
    # Cloudflare's documented dummy keys must never enable production intake.
    return (isinstance(value, str) and 20 <= len(value) <= 100
            and re.fullmatch(r'[A-Za-z0-9_-]+', value) is not None
            and re.match(r'^[123]x0+', value) is None)

def config():
    try:
        value = json.loads(CONFIG_PATH.read_text())
        return value if isinstance(value, dict) else {}
    except (OSError, ValueError):
        return {}

def captcha_ready(cfg=None):
    cfg = config() if cfg is None else cfg
    return (cfg.get('provider') == 'turnstile'
            and real_turnstile_key(cfg.get('sitekey'))
            and real_turnstile_key(cfg.get('secret')))

def public_config():
    cfg = config()
    ready = captcha_ready(cfg)
    return {'provider': 'turnstile', 'sitekey': cfg['sitekey'] if ready else None,
            'mode': 'verified' if ready and cfg.get('dispatch_enabled') is True else 'manual_review'}

def init_db(conn):
    conn.executescript('''
    CREATE TABLE IF NOT EXISTS quote_intake_reviews (
      submission_id INTEGER PRIMARY KEY REFERENCES rfq_submissions(id),
      source TEXT NOT NULL, state TEXT NOT NULL, reason TEXT NOT NULL,
      payload_hash TEXT, token_hash TEXT UNIQUE, version INTEGER NOT NULL DEFAULT 0,
      reviewed_by TEXT, reviewed_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS quote_intake_audit (
      action_id TEXT PRIMARY KEY, submission_id INTEGER NOT NULL, action TEXT NOT NULL,
      actor TEXT NOT NULL, note TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS quote_intake_limits (
      key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at REAL NOT NULL
    );
    ''')

def reject_invalid_identity(data):
    email = data.get('email', '').strip().lower()
    domain = email.rsplit('@', 1)[-1]
    if (domain in {'example.com', 'example.net', 'example.org', 'localhost'}
        or domain.endswith(('.test', '.invalid', '.example', '.localhost'))):
        raise HTTPException(400, 'Enter an email address where we can reach you.')
    for field in ('full_name', 'vehicle_make', 'vehicle_model'):
        if re.search(r'(\$\{|<%|\{\{|<script\b)', str(data.get(field, '')), re.I):
            raise HTTPException(400, 'Check your contact and vehicle details.')

def rate_limit(conn, data, salt):
    # Never use an arbitrary client-supplied forwarded IP as the sole limit.
    now = time.time()
    for field, maximum, window in [('email', 6, 86400), ('phone', 10, 86400), ('global', 300, 3600)]:
        identity = data[field].strip().lower() if field != 'global' else 'all-quote-intake'
        key = hashlib.sha256((salt + ':' + field + ':' + identity).encode()).hexdigest()
        conn.execute('''INSERT INTO quote_intake_limits(key,count,expires_at) VALUES(?,1,?)
          ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires_at<=? THEN 1 ELSE count+1 END,
          expires_at=CASE WHEN expires_at<=? THEN excluded.expires_at ELSE expires_at END''', (key, now+window, now, now))
        if conn.execute('SELECT count FROM quote_intake_limits WHERE key=?', (key,)).fetchone()[0] > maximum:
            raise HTTPException(429, 'Too many requests. Contact b2bsupport@vicrezcom.zendesk.com for help.')
    conn.execute('DELETE FROM quote_intake_limits WHERE expires_at<?', (now-86400,))

async def verification(token):
    cfg = config()
    if not captcha_ready(cfg):
        return {'state': 'held', 'reason': 'verification_setup_pending'}
    if not isinstance(token, str) or not token or len(token) > 2048:
        raise HTTPException(400, 'Complete the verification before submitting.')
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(SITEVERIFY_URL, data={
                'secret': cfg['secret'], 'response': token})
        result = response.json() if response.status_code == 200 else {}
    except (httpx.HTTPError, ValueError):
        return {'state': 'held', 'reason': 'verification_provider_unavailable'}
    if response.status_code >= 500 or response.status_code == 429:
        return {'state': 'held', 'reason': 'verification_provider_unavailable'}
    if not isinstance(result, dict):
        return {'state': 'held', 'reason': 'verification_provider_unavailable'}
    if isinstance(result.get('error-codes'), list) and 'internal-error' in result['error-codes']:
        return {'state': 'held', 'reason': 'verification_provider_unavailable'}
    if (result.get('success') is not True
            or result.get('hostname') != 'installers.vicrez.com'
            or result.get('action') != TURNSTILE_ACTION):
        raise HTTPException(400, 'Verification expired or failed. Please try again.')
    return {'state': 'verified' if cfg.get('dispatch_enabled') is True else 'held',
            'reason': 'captcha_verified' if cfg.get('dispatch_enabled') is True else 'dispatch_held',
            'token_hash': hashlib.sha256(token.encode()).hexdigest()}

def may_dispatch(conn, sid):
    row = conn.execute('SELECT state FROM quote_intake_reviews WHERE submission_id=?', (sid,)).fetchone()
    return bool(row and row[0] in ('verified', 'released') and config().get('dispatch_enabled') is True)

def review(conn, sid):
    row = conn.execute('SELECT state,reason,source,version,reviewed_by,reviewed_at FROM quote_intake_reviews WHERE submission_id=?', (sid,)).fetchone()
    return dict(row) if row else {'state':'held', 'reason':'pre_verification_review', 'source':'historical', 'version':0}
