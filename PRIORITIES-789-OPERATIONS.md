# Staff queue, security and pilot outreach

## Staff action queue

Use `/admin/actions` for open applications, claims/owner edits, inquiry follow-ups, pilot candidates, notification exceptions and failed/stale operational checks. Urgent delivery issues sort first, then overdue work. Filters cover type, overdue, unassigned and the current named staff member.

The queue derives work from saved records. Assignment, work status, custom UTC due date and notes are stored separately with an audit trail and optimistic concurrency. There is no completion checkbox: complete the actual review/outcome in its linked screen. Waiting requires a follow-up date. Applications and claims have a 24-hour initial review target; initial inquiries 48 hours, new shop replies 24 hours and pilot invitations seven days. These are elapsed-hour staff targets, not promises made to shops or customers. Custom dates override the queue target; they do not change the inquiry's existing follow-up record. Disabled staff remain visible for reassignment. Unavailable sources and truncation are displayed explicitly. Application/claim lookup supports exact record IDs; inquiry lookup reaches beyond the latest 50 records.

Existing daily staff alerts include overdue and unassigned queue counts and link to this screen. The operations page retains delivery evidence. Task saves never approve a shop, record a booking or send a message.

## Staff security handoff

Each real staff member must enroll their own username, password and authenticator at `/admin/security`. Save recovery codes privately, sign out, sign in with one recovery code, sign out and sign in with a new authenticator code. A code used for enrollment cannot be replayed immediately. The server records successful authenticator and recovery logins separately. Shared-login retirement requires a named session and both checks for every active account, with unused recovery codes remaining. Enrollment/disable/cutover changes serialize on the settings row. Do not retire the shared account before people have completed these steps. Do not send secrets through chat or email.

## Pilot invitations and activation

The authorized first campaign is `installer-pilot-2026-09`: the ten existing prepared dealer-form contacts, one invitation each from/reply-to `support@vicrez.com`, no automatic follow-up emails. Private drafts and the recipient review stay outside Git. `directory_pilot_outreach` uniquely records campaign/shop and links to the durable notification outbox. Before a worker sends, it checks listing state, current recipient, pilot decision, subject and exact body hash. Changed or withdrawn records are held. Provider acceptance is not delivery; delivery is not participation. Uncertain sends are never blindly replayed. Do not bypass provider suppression.

After a real affirmative reply: record authority, participation, services/vehicles/equipment, parts policy, hours/response expectation and private inquiry permission; verify current recipient; obtain agreement for a clearly labeled test. Review the owner's claim before granting access at `/admin/owners`. The shop should sign in and submit real project photos with permission; publish only after staff review. Run only the agreed labeled inquiry test and record the shop acknowledgment. The pilot gate remains the authority for confirmed participation. An invitation alone does not activate a shop.

## Release and recovery

Apply `20260920_action_queue.sql` before this web release. Deploy the backward-compatible RFQ action-items/exact-id reader before the web queue. Neither performs a database migration or creates customer inquiries. Verify build, tests, authenticated queue, anonymous rejection, custom-domain deployment alias and worker checks. Keep the pre-release PostgreSQL/SQLite backup and backend source copy. If rollback is required, restore the previous web deployment/backend source; additive tables can remain. Do not reverse delivered email or replay campaign rows. Keep shared-login state as explicitly chosen by real staff.
