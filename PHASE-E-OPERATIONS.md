# Installer operations release — September 15, 2026

This release adds an application/claim notification outbox, measured discovery actions, manual inquiry outcomes and individual staff accounts with an authenticator. It applies only to the installer directory.

## Current rollout

The website and database changes are deployed together after automated tests, a production build and a full isolated restore drill. Email sending initially stays paused (`DIRECTORY_NOTIFICATIONS_ENABLED=0`) while the designated delivery-test/staff inbox is confirmed. Existing request-status links continue to work. No historical application notices are replayed.

Use `/admin/operations` for new browser events, request counts, notification acceptance/delivery evidence and operational check-ins. Use `/admin/inquiries` to record contacted, quoted, booked or declined only when supported by actual contact. Saving an outcome sends no message and makes no appointment. Follow-up dates are explicitly UTC.

## Notifications and daily operations

Database triggers enqueue new application/claim receipts and reviewed outcomes in the same transaction as the request. Private review notes, account credentials and customer inquiry details are not copied into these notices. Public reviewer messages must be written for the applicant to read. SendGrid uses the verified support sender/reply-to, with click rewriting and open tracking disabled for private status links.

The dedicated bearer-authenticated `/api/internal/operations` worker claims up to three due notices per run. A crash or ambiguous provider response is held as uncertain and must be reconciled before an operator decides to retry. Explicit rate limits can retry up to five attempts. More than three receipts to an inbox in an hour are held for review. The worker polls the existing SendGrid Email Activity API; the existing account event webhook is preserved. Acceptance is not delivery; delivery is receiving-server acceptance, not reading or a shop reply. `delivered_at` records when the worker confirmed delivery evidence.

To enable the rollout, confirm the staff/test recipient, configure `DIRECTORY_STAFF_ALERT_EMAILS` with the approved company address(es), set `DIRECTORY_NOTIFICATIONS_ENABLED=1`, redeploy, and use a single clearly marked test notice. Do not create a fake customer application or claim. Check provider acceptance and delivery separately. Review queued records before enabling; do not blanket-resend uncertain records. Staff alerts contain aggregate issues and an authenticated admin link, not applicant contact information.

The VPS worker uses its own credential, verified TLS and privacy-safe logs. The existing daily installer alert is replaced by a wrapper invoking this integration. The daily health check queues actionable issues; the normal two-minute worker handles mail separately. An empty staff recipient setting sends no alert.

## Individual staff accounts

An authorized administrator opens `/admin/security`. Each person chooses their own username/password, adds the manual setup key to an authenticator, and confirms a current code. Ten one-use recovery codes appear once and should be saved privately. Passwords use salted scrypt; TOTP secrets are encrypted under a key derived from `ADMIN_SECRET`. Consumed authenticator counters cannot be replayed. Recovery codes are hashed and consumed atomically.

Enrollment switches the current session to the new named account. The page allows a named administrator to disable another account and revoke its sessions. All accounts currently have full directory-administration access; this is not a role/permission system. Staff identities come from signed, database-checked sessions for audit records.

After all staff are enrolled, a named administrator can explicitly disable shared sign-in. Do not do this before saving recovery codes. No real staff account is created by this deployment, and the shared login remains available until the owner completes enrollment. If every named account is locked out, use the controlled database recovery procedure under owner authorization; never add a public bypass route. Preserve `ADMIN_SECRET` in the established secret store when restoring, because it is needed to decrypt authenticators.

## Measurement

The new discovery table records bounded event names, an anonymous browser-session identifier, page kind, canonical service, result-count bucket and optional listing/destination/source enum. It excludes raw search text, ZIP, phone, email and coordinates. Admin/status pages and Do Not Track visitors are excluded. Events are best-effort and can be blocked by a visitor's browser.

Supported actions include search/empty results, filters, profile views, contact/crossover clicks, comparison, and application/claim starts/completions. Browser completions are not authoritative saved requests; the dashboard separately reports database application/claim totals. Contact clicks do not prove completed calls, appointments or revenue. Earlier analytics panels are labeled legacy. This release cannot establish a conversion lift before real usage accrues.

## Backups and restore

`/root/installer-operations/operations_worker.py --backup` makes a consistent PostgreSQL custom-format dump of public tables plus an online SQLite inquiry backup. Archives and configuration are owner-readable only. The manifest records hashes, file sizes and SQLite integrity. Daily cron creates backups; the Sunday run also restores the PostgreSQL archive into an isolated, network-disabled disposable container and checks restored table counts. Only the owned restore container is removed.

Backups are in timestamped directories under `/root/installer-operations/backups/`. An off-host copy of this release's verified archive is retained in the private local workspace. Automated off-host replication and age-based retention are not configured by this release. Review storage growth and establish the organization's retention policy. The VPS and its on-host backups share a failure domain.

For recovery, pause workers, preserve the current database for comparison, verify the manifest hashes, restore to an isolated new database, and validate data before any production cutover. Do not overwrite live intake with an older backup. Code rollback should preserve the additive tables, outbox, signed receipts and new staff credentials. Prefer a corrective deployment.

## Data review

Ten previously held locations have corroborating official-site addresses and precise geocoding. The review also corrects one ZIP and two incomplete street spellings. Mismatched Google enrichment for two chain branches is cleared. Those two branches and one possible relocation have inquiry routing paused pending contact verification. Their listings remain active. One location and two older applications remain pending; a public business listing does not establish applicant authority or inquiry consent.

The private release workspace contains evidence, before-data and the 20-shop candidate worksheet. Candidates are not confirmed pilot participants. Obtain actual owner/contact/service/parts-policy confirmation before recording participation or response-time promises. No shop outreach or fabricated quotes/bookings accompany this release.

## Remaining external checks

The unauthenticated PageSpeed API returned 429, so there is no new Lighthouse or field Core Web Vitals score. Search Console ownership/query access and Google Cloud key restrictions remain unverified with the available account grants. The earlier Vercel custom-firewall configuration request returned 404; no claim is made that platform protection is absent. Application rate limits and verified database TLS remain active.

B2B stocking thresholds and discount/MAP policies are outside this release and remain unchanged.
