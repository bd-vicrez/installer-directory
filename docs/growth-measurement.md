# Growth measurement

The October 5 update excludes the observed Lightpanda automation signature on the client and at collection, before parsing or storing analytics. Production visits referred from localhost/loopback testing are excluded for the browser tab, including subsequent navigation. Existing QA opt-out, DNT/GPC, private-page and preview exclusions remain in effect. No raw user agent or additional visitor identity is stored.

The historical 30-day report remains intact and explicitly labels tab-session totals as mixed-quality activity, not people. The filter is not a complete human/bot classifier. Do not apply a current HTTP request sample's bot percentage to GA4 or delete historical sessions on that basis.

## GA4 events

The existing delayed GA tag receives a bounded queue after configuration. No extra script, worker, AI call or schedule is added.

| Existing journey event | GA4 event | Trigger |
|---|---|---|
| search_results | installer_search_results | Search results rendered; only the bounded result-count bucket is sent |
| quote_open | installer_quote_open | Quote journey opened |
| quote_step | installer_quote_step | Project, Contact or Review reached |
| quote_saved | generate_lead | Client receives a valid server-confirmed inquiry receipt |
| application_start / complete | installer_application_start / installer_application_saved | First form input / valid saved receipt |
| claim_start / complete | installer_claim_start / installer_claim_saved | First form input / valid saved receipt |

Retries, reopening and repeated confirmation callbacks are deduplicated by journey/event/step in this browser tab. The bounded local deduplication cache retains the latest 200 keys, with an in-memory fallback when storage is disabled. This is best-effort browser analytics; blocked scripts, lost responses, storage limits or a new tab can affect counts. Server/database receipts remain authoritative. Application/claim saves are not approvals or owner verification.

Only the installer GA measurement destination is targeted. Parameters contain bounded page types, steps, result buckets and the fixed lead-source label. No field values, shop/customer contact details, request IDs, session IDs or status tokens are sent in these events. Event page locations omit query strings and fragments. Opt-out is checked again when flushing a delayed queue. Analytics failure never invalidates a successful submission.

Saved-event names must be configured as key events in the installer GA4 property before relying on its Key events column. Configuration does not backfill earlier events. Do not send a fake lead to production to validate counting; test with isolated fixtures and verify actual future submissions against saved outcomes.

## First-party source-to-outcome report

`/admin/performance` already joins bounded source/channel attribution from saved RFQ records to current follow-up states. One inquiry sent to multiple shops counts once, and several shop responses count once per inquiry. Quoted/booked are current staff-recorded states, not revenue and not cumulative stages. The report preserves opted-out/unknown records; an unavailable backend returns an error rather than zero outcomes.

Validation: `npm test` and `npm run build`. No schema migration is required. Rollback is a code revert; retain historical business and measurement records.
