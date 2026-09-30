# Search and interaction performance

The quote button starts its lazy module download concurrently with a fresh shop
availability request. It opens only after both succeed. Availability is never
cached, and the submission endpoint still validates current shop permission.
Repeated clicks share the in-flight guard; failed loads remain retryable.

Public search now obtains counts and the requested page with one SQL statement.
It materializes the small matching/sorting projection, then joins full public
records only for that page. Counts remain available for zero results and offsets
beyond the last page. The public response projection is unchanged.

`GET /api/installers` emits `Server-Timing` durations in milliseconds:

- `geocode`: location resolution, including the existing Next fetch cache.
- `connection`: acquiring a pooled database connection, including a new connection
  when none is available.
- `database`: the query and transfer back to the application.
- `search`: total search-function duration, including the preceding stages.

These stages overlap the total; do not add `search` to the other durations.
They exclude client DNS/TLS, network transit, and platform work before the handler.
No query text, contact data, or credentials are exposed in this header. Responses
remain `no-store` so inquiry permission and owner changes are fresh.

## Validation

Run `npm test` and a production build. The opt-in PostgreSQL integration check is:

```
node tests/search-performance.integration.cjs
```

It requires `DATABASE_URL`, creates a transaction-local temporary table using the
existing installer schema, tests search against fixtures, and rolls back. It does
not update permanent installer rows or send messages.

The September 29, 2026 audit compared old/new public output in one read-only
database snapshot across nine search cases. Three alternating paired trials per
case showed lower median time in every case, with one database round trip instead
of two. Client-to-database measurements are not production API response times.

Browser checks used a 390-by-844 desktop viewport and an isolated local production
build. A local-only diagnostic page applied a 40 ms task every 140 ms for 30 seconds
and recorded Event Timing while selecting comparisons, opening dialogs, typing,
and filtering. It exposed a comparison checkbox updater reading the live DOM value
too late; capture `currentTarget.checked` before scheduling the state update.
This synthetic test is not a real-phone or field-p75 INP result. The diagnostic
proxy and measurement controls are not shipped to production.

The app region (`iad1`) and pooled database region (`us-east-1`) are aligned.
Existing geocode cache behavior was verified. Keep using real visitor metrics in
`/admin/performance` before making claims about field Core Web Vitals. No traffic
warmers, AI jobs, or additional recurring work are required by these changes.
