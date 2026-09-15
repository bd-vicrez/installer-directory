# Installer directory: Phases B, C and D

The September 15, 2026 release adds controlled onboarding, consistent discovery and two pilot features: comparison and reviewed shop-provided details.

## Review applications

Use `/admin/applications`. Requests are oldest first; each displays age, submitted fields, consent, possible existing listings and its review history. Keep requests pending or mark `needs_information` until business identity, applicant authority, duplicates and the exact address have been reviewed. Record the reviewer name and evidence in the internal note. Public messages are visible through the requester's private status link; they do not send an email.

Correct a pending address when supported by the applicant's information, save it, then look it up again. Saving an address clears old geocoding evidence. Confirm the returned full address before approval. Approximate or mismatching locations remain blocked. Approval and listing creation commit together, with an audit entry. Repeated approvals reuse the listing ID.

Inquiry participation requires both the applicant's explicit opt-in and the reviewer's confirmation of the contact. Public email visibility stays under the separate contact-permission workflow. Optional shop details publish only when their publication checkbox is confirmed.

Existing approved applications are not automatically relinked to legacy listings, and the existing backlog is not automatically approved. Application references use a database sequence; database row IDs remain UUIDs. New listings use a separate sequence for the required legacy ID and a collision-resistant slug.

## Ownership and corrections

Use the claim link on the shop's profile or `/claim`. Requests are bound to an existing listing ID. `/admin/claims` records the claimant's relationship, requested changes and submitted service details.

Verify control through an independently sourced business channel: a business-domain email challenge handled by the reviewer, a callback to an independently established business phone, or business-document review. Knowing public contact details is insufficient. No public form grants editing access. A verified/resolved decision requires the channel, evidence, reviewer and confirmation.

Contact/address corrections use the existing authenticated installer editor and contact-permission tools. Optional owner details and declared service categories publish from a resolved claim only when the reviewer explicitly confirms publication. The audit retains prior listing details. Use Review history for prior decisions. No full self-service owner account or automated verification email is introduced.

## Location pilot and freshness

`/admin/data-review` contains the bounded 30-record pilot: 19 clear Google Places/address matches corrected and 11 held for review. No merges, removals or contact-permission changes were applied. A full source record is retained in the private release workspace and database audit. Corrections use the existing Place ID, corroborating business name and full street/state/ZIP. Ambiguous matches remain held.

Data-driven public pages and the sitemap read current data on each request. Admin mutations also request invalidation. Contact-refresh failures are logged; dynamic rendering prevents a failed invalidation from re-serving a stale public contact. Changing an address in the installer editor clears obsolete coordinates and creates a review item.

## Discovery and measurement

`shared/quote-services.json` defines primary service IDs and aliases. `service-taxonomy.ts` reuses those definitions for SQL search, category hubs, profile labels and legacy URL mappings. The additional browse categories are narrower recorded specialties. Specialist work is not inferred from the business name or general Google business category.

Search supports `sort=nearest`, `inquiry=1`, canonical services and older display-name URLs. Nearest means straight-line distance. The default puts Vicrez-recorded shops before distance. Geographic and category pages render at most 24 shops per page; national category queries use complete filtered counts with database pagination. Structured data describes the visible slice. Sitemap lastmod dates are omitted unless supported by a meaningful content-update source.

Shop comparison opens for two or three selected search results. It emits an anonymous `comparison_open` event using the existing anonymous session reference. The admin analytics event breakdown can show usage. Shop details remain absent until reviewed; no portfolios, equipment, credentials, availability or appointments are fabricated. Establish usage and inquiry baselines before claiming an improvement in conversions.

## Compatibility and deployment

Apply `migrations/20260915_phases_bcd.sql` before deploying the corresponding website code. It is additive and re-runnable. Keep the protected legacy installer feed and Phase A RFQ backend running. No backend, Klaviyo flow, dealer thresholds or discounts change in this release.

New application/claim notifications use the durable queue and private status receipt. The previous application SendGrid notification path is replaced by the reviewer queue; automatic review emails are not enabled without settled recipients and wording. The legacy removal endpoint remains validated and escaped for compatibility; current UI removal requests use the durable ownership/correction queue.

Rollback should preserve the new intake/status routes, tables and any new submissions. Prefer a corrective deployment or selective UI revert. Do not restore an old database over new applications, claims or inquiries. For a pilot-coordinate rollback, use the audit's before-data only after checking that the current location still equals the pilot correction. Do not blindly redeploy old sequential application-ID logic alongside the new sequence after live intake begins.

Infrastructure limits: application, claim, removal, comparison and admin-login rate controls are implemented at the application layer. Vercel firewall configuration read returned 404, so no account-level firewall assertion or change was made. Google Cloud key restrictions were not verified; the local Google Cloud CLI/ADC was unavailable. CSP begins in report-only mode with base/object/framing directives; it is not a full nonce-based CSP or an active reporting service.

Approved dealer rules remain Volume at $5,000 and Elite at $10,000, based on qualifying stocking orders delivered to the dealer's business; MAP comes from Vicrez.com before discounts.
