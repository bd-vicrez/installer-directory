# SEO recovery — September 21, 2026

## Scope and interpretation

This release consolidates location aliases, reduces location-query data transfer, and starts a 22-page editorial cohort: 14 shop profiles, five service/location pages and three original planning guides. It does not claim 22 completed-installation case studies, new owner confirmations, or improved Google rankings. Project photos, actual vehicle/part combinations and shop-confirmed policies remain content-acquisition work.

## Profile admission review

`src/lib/profile-indexing.ts` is the shared policy for profile robots metadata and sitemap inclusion. Source labels and public badges are separate concepts.

1. Removed and non-US-excluded listings are never admitted.
2. Explicit reviews in `profile-reviews.json` record business identity, evidence, review date, a specific visible brief and the decision. Identity, services and specialty must still match the reviewed record; otherwise both the brief and indexing admission fail closed pending another review.
3. `legacy-indexable.json` preserves the 363 profiles eligible before this release. Unreviewed entries retain the old source guard while waiting for individual review. This is a migration queue, not a claim that all 363 have passed a content-quality assessment. Do not regenerate this file for routine new listings.
4. A new source label, manual record, approval, Google rating or historic click does not itself qualify a new profile. New profiles need an explicit evidence/content review.

### Review each candidate

- Match the actual business and location. Resolve contradictory identity/contact evidence before publishing claims.
- Verify the service and vehicle-specific statements against a business submission, approved application or the shop's own published material. Attribute the source and distinguish submitted records from current owner confirmation.
- Identify useful information beyond basic contact details: a specific scope, supported specialty, documented project, substantive policy or relevant comparison guidance. Do not treat a word-count threshold as proof of quality.
- For case studies, obtain the actual vehicle, work scope, parts, date and photographs with publication permission. Label renders and work in progress. Do not invent parts, certification, customer quotes, prices or photos.
- Preserve contact visibility and inquiry-consent controls. An SEO decision does not authorize sending inquiries or granting owner access.
- Record the decision, evidence date and missing information. Re-run policy tests and the live HTML/sitemap checks. Include only eligible canonical URLs in the sitemap.

Kustom Kreations was reviewed individually: its first-party website and location support a useful custom-fabrication brief. Its historic click was a prioritization signal, not the admission reason. SpeedPro's approved application and matching branch page support its attributed brief; inquiry consent remains false.

## Location URLs and database reads

Middleware returns 308 redirects for recognized aliases, including category variants. States use full names; cities use two-letter state abbreviations. Query parameters are preserved and redundant/invalid page values normalize. Out-of-range page numbers return not found, not a duplicate of the last page. An unknown city can normalize its spelling and still return 404; normalization does not create a listing.

`location-query.ts` uses SQL counts, shared service-taxonomy matching, deterministic ordering and LIMIT/OFFSET. Only 24 public card records are returned. Nearby-city queries are restricted to the relevant state. React cache shares metadata/render reads within a request; there is no shared cache of contact permissions.

Run `migrations/20260921_seo_location_index.sql` outside a transaction. Check `pg_index.indisvalid` after creation. The index is additive and concurrent; rollback of the application does not require dropping it.

The sitemap no longer swallows database errors and emits a misleading partial 200 response. Profile admission and sitemap admission use the same policy. The five service/location additions require a live supporting reviewed record with the matching service. Other legacy city/guide content remains a separate review backlog.

## Measurement checkpoint

Compare the latest complete 28 days after release with the preceding 28 complete days, respecting Search Console lag. Report clicks, impressions and non-branded query clicks separately; query tables omit some data. Include actual URL Inspection status for a representative cohort and controls. Do not equate a successful live test, sitemap submission, lab SEO score or noindex removal with actual indexing.

Track inquiries attributed to organic search separately from direct/unknown traffic. Compare the 22 cohort pages with unchanged pages where data permits, but do not claim a causal effect from tiny samples. The Sept 21 baseline is in the workspace report outputs, including May 28–Sept 19: three clicks and 592 impressions, and Sept 17 aggregate indexing: zero indexed / 13,463 excluded. These report dates and populations differ.

The 30-day review must state the available evidence, missing data and next decision, with no ranking promise. Further owner outreach remains subject to the existing explicit-send authorization rules.
