# Vicrez installer agent

The VPS worker reviews submitted installer applications and coordinates saved
installation inquiries. It extends the existing notification worker rather than
running a second mail-delivery loop. Wholesale dealer approval and scraped
installer acquisition remain separate workflows.

## Production

- Code: `/root/installer-operations/agent` on the Vicrez VPS.
- Schedule: `installer-verification.timer` reviews applications and ownership claims hourly at :15. `installer-agent.timer` retains inquiry/contact-health work once daily at 9:00 AM America/New_York
  (Eastern time, including daylight saving changes). A missed run catches up
  after VPS downtime. Verification health allows two hours between check-ins; the daily run allows 30 hours. Both timers share a database advisory lock.
- Reviewer: `Vicrez Installer Agent (AI)`; initial support escalation owner: the
  existing Zendesk account `Luis V.`. Change the owner fields in private config
  when responsibility is reassigned.
- Private config: `config.json`, root-only. Includes a dedicated Postgres role,
  existing Google Places and Claude credentials, RFQ service credential, Zendesk
  integration credentials and the existing operations-worker secret.
- Uses the existing `claude-haiku-4-5-20251001` model. Maximum 3 application and 2 ownership
  attempts per run, 20 combined per UTC day, four public pages per case, and 6
  customer messages per run. Unchanged information requests are rechecked daily.
- The model selects numbered source passages; the server supplies their exact quotations. Invalid citations get at most one retry, with the evidence gates unchanged. Thus 20 research attempts permit at most 40 AI calls per day. Provider errors preserve the current application status and retry hourly. Never-reviewed submissions precede retries; retries are ordered by oldest actual review. Paint/bodywork and performance categories have explicit evidence rules.
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

### Daily contact health

The existing 9 a.m. run also checks active, unpaused inquiry recipients, with
no model calls, SMTP probes or test emails. It batches domain lookups through
Google and Cloudflare DNS and pages through SendGrid suppression lists, keeping
only matches to directory recipients. Configure `contact_health_sendgrid_key`
in the root-only agent config using the existing provider credential.

Both DNS resolvers must agree on a nonexistent domain, null MX or absence of
MX/address fallback before DNS can disable routing. An MX record is not required
when address records support implicit MX. Invalid syntax, provider invalid-email
records, explicit 5.1.1/5.1.2 recipient bounces, unsubscribes and spam reports also
disable routing. Timeouts, DNS disagreement, sender-policy blocks and incomplete
provider checks remain review items. DNS has a 160-second work budget; provider
pagination has a 220-second overall budget. Both report unfinished work.

Disabling routing rechecks the exact recipient and modification timestamp under
a row lock and commits the audit in the same transaction. Listings stay present.
No address is guessed, suppression removed, or routing automatically re-enabled.
`state/contact-health.json` preserves per-shop evidence. Paused records remain
under review on subsequent runs. The Operations page lists affected shops and
the existing daily staff digest surfaces the check; no second timer is added.

Unmatched inquiries are immediately escalated for service/project review rather
than being described as awaiting a shop response. Existing human takeover and
message-idempotency rules still apply.

Run `python3 -m unittest test_contact_health test_inquiry_routing -v` for DNS,
provider pagination, uncertain-result, changed-recipient and routing regressions.

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
and installer number/audit sequences, and no staff credential permissions or owner-grant write permissions. It can read grants to detect conflicting or previously revoked access. A database backup is required before installation.

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

## Autonomous ownership verification (2026-11-07)

`claims.py` reviews pending ownership requests. Public business identity alone never grants access. The worker requires matching operational Google business, phone, website, public address, geocode and AI evidence. It sends a one-time 48-hour proof link only to the submitted email when it is on the verified website's exact domain, or when it is explicitly displayed, linked with mailto and independently classified as the shop's contact. Marketing agencies, former employees, test requests, conflicting claims/grants, revoked access and missing evidence go to staff; the agent never guesses a contact. An existing unresolved proof is never automatically resent. Held claims are paused for staff review, rather than repeatedly emailing the applicant.

The browser must explicitly confirm authority. A GET or email-scanner visit never approves ownership. The server rechecks the exact claim, recipient, listing identity, expiry, staff assignment, pause and conflicting ownership under locks before consuming the proof and creating an audited owner grant in the same transaction. Requested corrections/photos remain unpublished. Quote routing and suppression rules remain unchanged. A replay fails. Revoked access is never reactivated by this flow.

Proof links use a distinct HMAC purpose and URL fragment; the page clears the fragment and excludes analytics, indexing and referrer sharing. Notifications use the existing SendGrid worker with tracking disabled, provider suppressions intact and B2B support as the help/reply address. Evidence is retained internally; the model receives public business sources, not the claimant's private email.

### Release and rollback

Apply `migrations/20261107_autonomous_verification.sql` after a verified database backup. It adds the proof table, snapshot/eligibility functions and limited worker permissions. Deploy the web routes/templates before installing the new worker and enabling `installer-verification.timer`. The worker must not queue proof links while the old web release is active. Preserve the daily timer, private config, imports and state. Check worker code hashes against the reviewed baseline before replacement. Production and disposable QA databases must never share credentials.

Rollback: stop/disable `installer-verification.timer`, stop its service, restore the saved worker files and original daily service unit, then daemon-reload. Revert the web release if needed. Cancel unconsumed proof records and hold pending `ownership_verification` notifications before reverting templates. Leave additive schema, evidence and audit records intact. Do not bulk-delete grants or reverse sent notifications: review and revoke any incorrect grant individually using the existing admin workflow.

Validate the hourly service's `state/verification-latest.json`, the `installer-verification` operation row and both admin review queues. Normal held cases are not outages; research errors and a missing two-hour check-in are actionable. Confirmation links require the real shop to act; provider acceptance is not proof of mailbox delivery or ownership. `--verification-only` does not execute inquiry routing, reminders, customer messaging or contact-health changes.

Tests: run the Python policy/agent suites, `test_database` with `INSTALLER_QA_CONFIG` pointing only to a disposable loopback `installer_agent_qa` database, the website test/build suite, and `node --test tests/claim-verification.integration.cjs` with that isolated QA config. The integration test exercises the actual production-schema constraints, concurrent confirmation, replay, expiry, human takeover, changed identity, conflicting/revoked ownership and atomic rollback after audit failure.
