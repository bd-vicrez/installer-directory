# Verification recovery and shop setup

This release adds a Vercel cron independent of the VPS, controlled ownership recovery, an owner quote-setup checklist, and review/delivery metrics. It does not change existing listing content, indexing decisions, routing permissions, email suppressions, staff holds, or the daily inquiry agent.

## Behavior

- Vercel checks the hourly verification heartbeat every ten minutes at :07/:17/:27/:37/:47/:57. A missing two-hour check-in or a failed run opens one incident. A later healthy check queues one recovery notice. Durable, locked incident state prevents duplicates. Only watchdog notices are dispatched by this cron; it never sends customer/quote messages. Uncertain sends remain held for reconciliation. Existing staff recipients and B2B support are used. No model calls are made.
- Ownership status shows the reference, missing evidence, next action, and proof deadline. New information can requeue eligible automated holds. Expired links can request fresh research, at most once per day and three times per seven days. Old proofs are cancelled and retained for audit. Staff takeover, conflicting/revoked owners, and agency/former-employee claims remain held. The agent rechecks original verification gates and only uses supporting URLs on the independently matched official domain with existing SSRF protections and page limits. It never treats applicant notes as proof.
- Approved owners confirm current services/availability, consent to participation, and request one clearly labeled inbox test to their approved email. Explicit receipt confirmation is separate from provider acceptance/delivery. Tests expire after 48 hours, are capped, and cannot enable routing. Staff activation or a changed recipient requires a currently eligible test confirmed within 30 days. Paused/declined pilot decisions, changed identity/services, revoked/versioned access, owner pauses and closed businesses invalidate setup. Existing routing can still be disabled or otherwise preserved. Suppressions are never cleared or bypassed.
- The admin panel shows unused daily research allowance (UTC), unreviewed/held requests, oldest unreviewed submission, pending confirmations, expired proofs, confirmed ownership, and 30-day verification-mail states. Missing monitor check-ins and failed alert delivery are visible in Operations.

## Deployment order

1. Verify the latest master and reviewed source hashes. Snapshot listing, pilot and owner-access records, VZ-41, suppression configuration, and worker configuration. Take and inspect a fresh database backup.
2. Apply `20261108_verification_recovery.sql` with bounded SQL lock/statement timeouts. It adds tables/indexes and preserves proof history; the worker still cannot write owner grants or read staff credentials.
3. Configure production-only `CRON_SECRET` and `DIRECTORY_VERIFICATION_WATCHDOG_ENABLED=1` in the existing Vercel project. Preserve all existing environment entries. Vercel Pro and enabled cron scheduling were verified before rollout.
4. Deploy the tested web commit through the existing checked GitHub/Vercel pipeline. Confirm READY and unauthenticated-route rejection.
5. With neither agent service running, briefly stop the two existing timers, replace only reviewed `claims.py`, `rules.py` and `evidence.py` atomically, and restore the timers. Keep all other worker code/configuration and schedules unchanged. No manual production review is necessary.
6. Verify the live admin metrics and monitor check-in, existing listing/pilot/access hashes, VZ-41 and suppression/config hashes. Observe a scheduled monitor invocation and the next hourly worker report. Preserve provider acceptance vs actual delivery distinctions.

## Verification

Unit, backend and agent suites cover evidence/SSRF, role restrictions, routing, suppressions and origin checks. Real-schema tests in an isolated database cover concurrent recovery, staff takeover, revoked/conflicting ownership, old-token replay, audit rollback, paused pilot records, quote-test concurrency/expiry/changed identity, and outage/recovery deduplication. All test mail uses a recording transport; no customer or shop is used for QA. Browser QA covers admin metrics, applicant information requeue and explicit inbox confirmation.

## Rollback and limitations

Remove the new Vercel cron by restoring the prior web release, or set the watchdog flag to 0 and redeploy. Restore the three saved worker files under the timer lock procedure. Leave additive tables and audit history intact; do not restore the entire database over new customer work. Before reverting the web templates, cancel unconsumed quote-setup challenges and hold pending `owner-setup` notifications. Hold pending replacement ownership proofs if reverting the recovery worker; do not delete their audit history or bulk-revoke grants. Keep email suppressions untouched.

This monitor survives a VPS outage because Vercel and the Neon database are external to that VPS. It still depends on Vercel, Neon and SendGrid; a simultaneous outage of those services requires platform monitoring. A 202 response proves provider acceptance, not inbox delivery. The research allowance remains unchanged; reaching it may defer reviews until the next UTC day. Existing held claims are not mass-unpaused: applicants must supply evidence or explicitly request an eligible renewal. Quote participation remains a staff decision after the checklist passes.
