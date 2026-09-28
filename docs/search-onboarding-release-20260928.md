# Search, onboarding and mobile inquiry release

Apply `migrations/20260928_onboarding_updates.sql` before deploying the web release. The migration is additive and repeatable. It stores applicant updates with unique request IDs; existing status tokens remain valid. Pending applications and claims can supply information, but cannot change approval, identity, inquiry consent or owner access. Staff and the existing daily application reviewer remain responsible for decisions.

Search now uses service matching, ten-mile distance bands and inquiry eligibility. Exact city/ZIP matches without usable coordinates are included after radius results with no asserted distance. Placeholder ZIPs and incomplete shop destinations are withheld from public location displays. Reviewed parts policies and owner reconfirmation dates are available in comparison. These checks do not certify every legacy address or business as current.

The September 28 one-off repair was limited to 100 Google Geocoding requests. It accepted 81 address-level matches after checking country, state, ZIP, street number and route; 19 uncertain results were held. Missing coordinates decreased from 4,872 to 4,791. Existing full addresses were retained. The script saves a private plan/affected-field backup before applying updates and checks that the address, prior coordinates and prior evidence have not changed. Each applied row is recorded in `directory_review_audit` with action `geocode_repair`. No recurring lookup job is installed.

The 47 legacy `00000` values remain in the source records for review, but are suppressed publicly. Their coordinates are not used for public distance, driving links, embedded maps or structured geo data. Remaining missing-coordinate records can appear in exact city searches; device-coordinate radius searches require usable coordinates.

## Validation

- 104 unit tests and a production Next.js build.
- 20 PostgreSQL integration checks in a disposable schema, including duplicate retries, revision conflicts, concurrent updates, application/claim isolation, protected fields, city fallback, inquiry preference and public-field filtering.
- Mobile search, business lookup, simplified claim form and project/contact/review inquiry steps at 390 × 844. Test inquiries are not submitted to real shops.

The VPS application reviewer stays on its existing once-daily schedule. Owner participation, inquiry permission, authority and access still require their documented confirmation; this release does not mark the five invited shops activated.

## Rollback

Revert this web commit and redeploy if needed. The additive update ledger can remain in place; retain recorded applicant submissions and audit history. Restore a geocode only from its saved before-data after checking for newer edits. A fresh full directory backup was verified before the migration and data repair. Do not restore the whole database over newer business activity for a frontend rollback.
