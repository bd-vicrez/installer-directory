# Vicrez installer agent

The VPS worker reviews submitted installer applications and coordinates saved
installation inquiries. It extends the existing notification worker rather than
running a second mail-delivery loop. Wholesale dealer approval and scraped
installer acquisition remain separate workflows.

## Production

- Code: `/root/installer-operations/agent` on the Vicrez VPS.
- Schedule: `installer-agent.timer`, every ten minutes with a small jitter.
- Reviewer: `Vicrez Installer Agent (AI)`; initial support escalation owner: the
  existing Zendesk account `Luis V.`. Change the owner fields in private config
  when responsibility is reassigned.
- Private config: `config.json`, root-only. Includes a dedicated Postgres role,
  existing Google Places and Claude credentials, RFQ service credential, Zendesk
  integration credentials and the existing operations-worker secret.
- Uses the existing `claude-haiku-4-5-20251001` model. Maximum 5 application
  attempts per run, 20 per UTC day, four public pages per application, and 6
  customer messages per run. Unchanged information requests are rechecked daily.
- No local PC or OpenClaw session is required for scheduled runs.
- Admin visibility: `/admin/actions`, `/admin/applications`, `/admin/inquiries`,
  and `/admin/operations`. The worker records ownership, next steps, support
  ticket IDs and audit events. Named directory sign-ins are not fabricated.

## Decision policy

Approval requires listing consent, matching public business name/phone/website,
Google operational status, a full geocoded address corroborated on both public
business sources, advertised services matching the application, no duplicate,
and a Claude evidence review with quotes that are checked against fetched pages.
Any failed gate holds the application for information. An exact already-listed
business is closed as a duplicate and the applicant receives its existing link.
The model cannot execute tools or override missing deterministic evidence.
When a named service is selected alongside an empty "Other" checkbox, only the
verified named category is published. A described additional service still
requires evidence; no unspecified service is invented.

Public pages are untrusted. The fetcher pins a public DNS address, checks TLS,
rejects private/shared hosts, and allows only same-host redirects and a bounded
number of pages. No customer details, credentials, internal notes or private
emails are included in the AI request.

Approvals do not activate inquiry routing, publish email, grant owner access,
claim certification, publish unreviewed descriptions, or override SEO indexing
review. Application decisions, listing insertion, evidence and audit records
commit atomically; existing database triggers queue applicant notifications.
Input fingerprints and row locks prevent stale decisions. A short listing-table
lock protects the final duplicate check from concurrent inserts. Direct Neon
connections preserve the cross-process session lock.

An operator can capture public website evidence when a site blocks the VPS.
Place up to four pages in `imports/<application-id>.json` with `source` equal to
`operator_public_website_capture`, `checked_at`, the exact `input_fingerprint`,
and `pages` containing URL, text and content SHA-256. Imports expire after 24
hours; Google checks and AI review still run. The initial Charlotte application
used this operator-assisted path. The timer never fetches from a local PC.

## Inquiry follow-through

Same customer, vehicle and service submissions within seven days are grouped
for email, while every inquiry retains its own audit trail. The worker queues
one existing eligible shop reminder after 48 hours. Legacy inquiries without
response links receive customer follow-up and staff escalation, not fabricated
response links. After 72 hours, the case names its support escalation owner.

Customer emails use Zendesk and open a ticket assigned to the configured staff
owner. Messages identify the automated assistant and ask for the actual outcome;
they do not assert a quote or booking. Existing `ai-agent` tags prevent the
general Zendesk bot from also replying. Customer/staff replies, reassignment,
closed/withdrawn requests, final outcomes or a manual directory work note stop
automatic customer handling and leave the named owner responsible. This is
autonomous routine processing, not automatic resolution of unverifiable cases.

The outbox reserves each event before sending. An uncertain provider response or
process crash is held for reconciliation, never blindly resent. Zendesk's
notification audit proves requester notification creation, not inbox delivery.
Applicant messages and shop reminders use existing SendGrid reconciliation.

## Operations

```sh
cd /root/installer-operations/agent
python3 agent.py                 # dry-run; no case, listing or message changes
python3 agent.py --live          # requires enabled=true in private config
systemctl status installer-agent.timer
journalctl -u installer-agent.service --since today
```

`state/latest.json` is the last live report. `directory_automation_reviews`
contains timestamped evidence; `directory_automation_cases` records ownership
and next steps; `directory_automation_messages` holds durable provider state.
Daily attempt reservations include failed research so outages cannot evade the
budget. Failures and stale check-ins appear in the existing operations health
and daily staff digest. Credentials and recipient data are omitted from journals.

Apply `migrations/20260927_installer_agent.sql` before deploying the admin UI.
The dedicated DB role has access only to the required directory workflow tables
and installer number/audit sequences, and no staff credential or owner-grant
permissions. A database backup is required before installation.

Pause with `systemctl disable --now installer-agent.timer`, then stop the
service if it is running. Set `enabled=false`. Existing accepted messages and
decisions remain auditable; pausing does not undo sent email. Do not delete audit
records or bulk-revert reviewed applications. Review a listing individually if a
decision needs correction. The existing notification worker continues running.

## Validation

`python3 -m unittest test_rules -v` tests evidence, injection, SSRF, duplicates and
grouping. `test_database.py` requires the disposable, loopback-only database
created by the deployment QA harness; it cannot run against production. It
tests concurrent approval, rollback on failed audit, stale data, human takeover,
notification idempotency, withdrawal and uncertain sends. The website suite
also checks that automation ownership never impersonates a staff login.

API references: [Google Places Text Search](https://developers.google.com/maps/documentation/places/web-service/text-search),
[Claude tool schemas](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools).
