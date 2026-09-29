# Mobile speed and journey measurement

The staff report is at `/admin/performance`, under **Speed and journey measurements**. It defaults to mobile and separates tablet and desktop. It uses the existing PostgreSQL event store; collection and reporting do not call an AI model or introduce a recurring agent.

## Deployment

Apply `migrations/20260929_mobile_measurement.sql` before deploying this release. The additive migration retains historical rows with null device metadata; those rows are excluded from the new report. It is safe to rerun. Rolling code back does not require dropping columns or deleting collected data.

The homepage streams its search shell before the public directory overview finishes. Overview queries cache for 300 seconds. Saved search URLs include six fresh server-rendered results and hydrate without repeating the query; changes to search controls still use the public API. The existing Load More button retrieves another 24 shops without changing the total count, filters or ordering. Search results, shop-contact eligibility and inquiry submission read current records. Search status space is reserved and quote code loads on demand, retaining a draft after closing.

## What the report means

- LCP, CLS and INP come from the standard `web-vitals` library. Buffered observers start after load. Values refer to the initial document's page category, not individual SPA navigations. INP may be absent without a qualifying interaction. Repeated reports for a metric update one sample in sequence order; they do not multiply visits or overwrite newer values with delayed older events.
- Interactive search journeys start before the request. Results are recorded in the React effect after results commit, with elapsed milliseconds from the start. This is a rendering approximation, not a hardware paint timestamp. Saved search URLs record their initial result/error when hydrated, without inventing an interactive duration; page LCP measures their loading. Superseded requests and errors have distinct events. A successful search session is counted as contacted if a phone, directions, website or quote-open event follows within 30 minutes.
- Quote journeys use the request UUID across opens, steps, retries and the server-confirmed save. Project, Contact and Review are recorded without field contents. Native and custom validation record only the stage. A server receipt is the only source of `quote_saved`; the public collector rejects it.
- Missing progress is displayed only after 30 minutes without another event. The report uses the furthest recorded stage and distinguishes recent unfinished journeys. A later return can change these counts. Missing telemetry does not prove abandonment or that speed caused it.
- Business lookup, choosing a new application, application input, claim input and submission outcomes have separate events. Lookup is no longer misclassified as an application start. Application/claim completion means the browser received a successful save response.

All figures are observed browser journeys, not verified unique people. Known bots are excluded, but unidentified automation can still appear. Low-volume percentile and funnel samples are shown explicitly; the site's own measurements are not a Google CrUX assessment. There is no historical backfill for missing device or stage information.

## Privacy and QA

Client collection is restricted to `installers.vicrez.com`. DNT, GPC, browser automation, recognized audit user agents and private account/admin/status pages are excluded. Server collectors also reject DNT/GPC and recognized audit user agents. The collector accepts bounded enums, identifiers and numeric timings; it does not save field values, raw search text, query strings, raw user agents, email addresses or token URLs.

For manual QA, open any public page with `?analytics=off` (or append `&analytics=off`). This excludes the tab from first-party events, attribution and initial GA tag loading for subsequent navigation. Use a fresh tab for an ordinary tracked visit. Enable the exclusion before testing; it cannot remove events or a GA script already loaded earlier in that document. Preview and localhost builds are excluded automatically.

Validation: `npm test`, `npm run build`, and `DIRECTORY_TEST_DATABASE_URL=... node tests/mobile-measurement.integration.cjs`. The integration suite shadows the event tables with temporary tables inside a transaction and rolls back all fixtures. It checks migration repeatability, out-of-order metric delivery, percentile calculation, search outcomes, contact progression and quote-stage drop-offs without adding production traffic.
