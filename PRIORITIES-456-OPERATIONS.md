# Owner profiles, access and acquisition reporting

## Staff workflow

1. Open `/admin/owners`. Grant access only from a reviewed, approved application or independently verified ownership claim. Record the authority review note and confirm authorization. The email is taken from that review; it is not supplied by the owner-access form. No invitation is sent when staff grants access.
2. Direct the reviewed owner to `/owner`. The owner requests a private sign-in link. The existing notification outbox sends it to the reviewed inbox. Each link lasts 30 minutes, is single-use, and starts a 12-hour session. Opening the page alone does not consume the link. For several shops, each shop has a separate link/session; following another link explicitly switches after Continue.
3. Review owner proposals at `/admin/claims`. The owner-portal verification channel is accepted only when the claim references a currently active grant for that listing and inbox. Record the evidence and check identity/publication confirmations. Resolve and publish only after reviewing the exact submitted text, photos and captions. Address, business identity and contact correction requests remain manual reviews through the existing staff tools.
4. Revoke access when authority ends, particularly during an ownership transfer. Revocation or renewal increments the grant version, invalidating prior sessions and unused sign-in links. Revocation does not itself change the shop's inquiry participation or previously published details.

## Shop details and photos

Optional vehicle specialties, tire/wheel/equipment limits, body/paint capabilities, wrap/PPF materials, parts policy, service notes and hours appear only after publication review. Claims and applications collect the richer fields. Verified owners upload project photos through their portal; unverified claimants cannot upload directly.

Each uploaded photo requires the owner's permission confirmation and a caption. JPEG, PNG and still WebP files are accepted up to 4 MiB and 25 megapixels. Sharp decodes, auto-orients, strips metadata and re-encodes to WebP, bounded to 1400 pixels and 1.5 MB. Originals are not retained. Storage is PostgreSQL bytea, included in the existing database backup. Limits: 24 library photos per listing and six per proposed/published gallery. Owners can remove unused photos; published photos or photos in pending reviews must first be removed through a reviewed proposal. A private photo is available only to staff or a current owner of its listing. Public availability requires an active listing, a publication timestamp and the exact photo ID in published details. Media responses use no-store so permission changes are not hidden by a CDN cache.

The portal permits one open owner proposal per listing, with idempotent retries. No proposal auto-publishes. Photo rights and capabilities remain shop declarations; staff review does not certify workmanship.

## Inquiry pause

`installers.owner_inquiry_paused` is separate from staff-controlled `quote_routing_enabled`. Owner pause blocks selected-shop submissions, public availability, private recipient selection and unsent notification eligibility. In-flight provider calls cannot be recalled. Resume clears only the owner pause and cannot enable an unapproved/disabled recipient. Existing response links use the authenticated routing feed's `purpose=response` mode, which ignores only the owner pause while retaining active status, business closure, valid email and staff participation checks. A changed recipient still invalidates its old response link. Availability changes commit with an audit and refresh affected pages.

## Traffic and outcomes

Open `/admin/performance` for a rolling 30-day report; inquiry rows also show source/channel. A first-public-entry source is retained in browser sessionStorage alongside the existing anonymous tab/session identifier. Allowed source/channel labels are saved with new inquiries in SQLite within the same transaction as the inquiry/outbox. Attribution never changes retry identity and is never forwarded in notification payloads. Historical inquiries remain unknown; there is no source backfill or historical email replay.

Counts: anonymous session starts, saved requests, requests with at least one shop response, currently quoted, currently booked. Multiple recipients/retries do not multiply request counts. Quoted/booked come from the existing staff follow-up state, not inferred emails, payments or revenue. All cohorts use the same explicit UTC 30-day boundary. At most 10,000 newest saved inquiries are shown and truncation is labeled. Sessions can differ from inquiries due to consent, blockers, requests across period boundaries or failed telemetry; no conversion-rate claim is made.

Do Not Track and disabled QA measurement omit the anonymous session and label saved inquiries opted-out. The first-party report stores no raw referrer URLs, search terms or freeform UTM campaign names. Owner pages are excluded from GA/discovery/UTM decoration and use noindex/no-referrer. The sign-in token is in the URL fragment and is removed immediately from the address bar.

## Deployment and recovery

Apply `migrations/20260920_owner_attribution.sql` before the web release. Deploy the compatible RFQ backend before web source capture. Do not create grants, photos, inquiries or bookings merely to seed the feature. Existing cron notification, reconciliation and backup schedules are reused.

Prefer corrective code releases while retaining additive tables and new records. A backend rollback loses source capture for subsequent requests but must not delete saved inquiry/attribution records. Rolling the website back to code without the owner-pause check must not occur while any owner pause exists; preserve the pause eligibility guard or explicitly coordinate staff routing restrictions first. Photo storage is covered by database snapshots; restore files only through a reviewed recovery plan, never overwrite newer production data blindly.

Validation: Node unit/security tests; Python temporary-SQLite tests; isolated-schema integration checks for grants, authentication, revocation, media privacy/publication, audit rollback and routing. Local browser fixtures intercept all API calls. No real owner authentication email or pilot invitation is sent for QA; live inbox delivery for this new sign-in template remains untested until authorized real use.
