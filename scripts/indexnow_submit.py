#!/usr/bin/env python3
"""
IndexNow batch submitter for installers.vicrez.com

Submits every URL in the production sitemap to Bing/Yandex via IndexNow.
Google ignores IndexNow but Bing-indexed content feeds many AI search engines
(ChatGPT, Copilot, Perplexity) so this is high-leverage.

Spec: https://www.indexnow.org/documentation
Bing endpoint accepts up to 10,000 URLs per request.
"""

import re
import sys
import json
import time
import urllib.request
import urllib.error
from pathlib import Path

HOST = "installers.vicrez.com"
KEY = "402993cc6f845289de81e75094b80aa8"
KEY_LOCATION = f"https://{HOST}/{KEY}.txt"
SITEMAP_URL = f"https://{HOST}/sitemap.xml"
ENDPOINT = "https://api.indexnow.org/IndexNow"  # generic endpoint, forwards to all participating engines
BATCH_SIZE = 10000


def fetch_sitemap_urls() -> list[str]:
    """Pull all <loc> entries from the live sitemap."""
    req = urllib.request.Request(SITEMAP_URL, headers={"User-Agent": "Mozilla/5.0 IndexNowSubmitter/1.0"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        body = resp.read().decode("utf-8")
    urls = re.findall(r"<loc>([^<]+)</loc>", body)
    # Dedupe + filter to our host
    seen = set()
    out = []
    for u in urls:
        u = u.strip()
        if HOST not in u:
            continue
        if u in seen:
            continue
        seen.add(u)
        out.append(u)
    return out


def submit_batch(urls: list[str]) -> tuple[int, str]:
    payload = {
        "host": HOST,
        "key": KEY,
        "keyLocation": KEY_LOCATION,
        "urlList": urls,
    }
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        ENDPOINT,
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/json; charset=utf-8",
            "User-Agent": "Mozilla/5.0 IndexNowSubmitter/1.0",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            return resp.status, resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", errors="replace")


def main():
    print(f"[{time.strftime('%H:%M:%S')}] Fetching sitemap...")
    urls = fetch_sitemap_urls()
    total = len(urls)
    print(f"[{time.strftime('%H:%M:%S')}] {total:,} unique URLs found in sitemap")

    if not urls:
        print("No URLs - aborting")
        return 1

    # Verify key file is reachable first
    try:
        req = urllib.request.Request(KEY_LOCATION, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            content = resp.read().decode("utf-8").strip()
        if content != KEY:
            print(f"  WARNING: key file content mismatch! expected={KEY!r} got={content!r}")
        else:
            print(f"[{time.strftime('%H:%M:%S')}] Key file verified at {KEY_LOCATION}")
    except urllib.error.HTTPError as e:
        print(f"  WARNING: key file not reachable yet ({e.code}) - IndexNow may reject. Continuing anyway.")

    total_ok = 0
    total_fail = 0
    for i in range(0, total, BATCH_SIZE):
        batch = urls[i : i + BATCH_SIZE]
        print(f"[{time.strftime('%H:%M:%S')}] Batch {i // BATCH_SIZE + 1}: submitting {len(batch):,} URLs...")
        status, body = submit_batch(batch)
        # 200 OK, 202 Accepted = success. 422 = key/host validation issue.
        if status in (200, 202):
            print(f"  -> {status} OK ({len(batch):,} accepted)")
            total_ok += len(batch)
        else:
            print(f"  -> {status} FAIL: {body[:400]}")
            total_fail += len(batch)
        time.sleep(2)

    print()
    print(f"DONE: {total_ok:,} submitted, {total_fail:,} failed")
    return 0 if total_fail == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
