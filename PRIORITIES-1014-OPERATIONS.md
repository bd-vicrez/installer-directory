# Inquiry progress and shop evidence — September 21, 2026

This release covers approved items 10–14 for installers.vicrez.com.

## Staff follow-up

The inquiry page offers one reminder per original shop notification after 48 elapsed hours without a saved response. Staff must explicitly queue it. A unique event key prevents duplicates. Eligibility, the currently authorized recipient, customer closure and final staff outcomes are checked again before sending. Existing notification delivery/uncertainty handling applies. No reminder campaign is started by deployment.

After 72 elapsed hours without a response, the inquiry becomes urgent in the staff action queue. A customer request for another shop also becomes urgent. Staff handles any new routing manually after reviewing the request; the customer action does not contact additional shops. Recording a later staff follow-up acknowledges the alternative-shop request in the queue.

## Customer progress and private project material

New quote receipts link to `/inquiry-progress#<signed receipt>`. The existing receipt expires after seven days. Shops use their existing response link, subject to its expiry and current contact authorization. Staff accesses project material through authenticated inquiry administration.

Project fields include a secure Vicrez product URL, SKU, parts already owned, wheel/tire dimensions, fitment notes and installation requirements. URL query parameters and fragments are removed. Customer photos require permission, are re-encoded as bounded WebP images with metadata stripped, and are served only through authenticated POST requests. Maximum three current photos and six uploads per inquiry; source uploads are limited to 3 MiB. Customer photos are never published in profiles or structured data.

The customer page shows saved shop response states, explicitly customer-visible shop messages and the staff outcome/public message. Existing private staff/shop notes, recipient inboxes and audit details are excluded. Private pages disable analytics/indexing/referrers and private API responses disable caching.

Customers can close or withdraw their inquiry. This prevents further site edits and shop responses, cancels pending backend jobs and prevents reminder delivery when checked. Already sent or provider-in-flight messages cannot be recalled. Closing here does not cancel appointments agreed directly with a shop. Photos remain in the private SQLite record and protected backups; removing a photo revokes shared access but is not a claim of permanent erasure. No automatic retention purge is introduced.

## Owner reconfirmation

Authenticated owners review a snapshot of their listing and explicitly confirm it. Confirmation records the timestamp, content hash and audit. It is current for 90 days, provided the saved details still match. Public profiles display the real confirmation date, or say none is recorded. No historical confirmations are invented.

Active owner-managed listings needing reconfirmation appear in the existing staff action queue. Initial confirmation is due seven days after the access grant. Later confirmations expire after 90 days or changes to the reviewed listing details. No owner reminder emails are sent by this feature.

## Completed-project content

An authenticated owner can propose up to three real completed projects: vehicle, supported service, completed month, description, optional parts and a photo selected from that shop's uploads. Owner permission and explicit staff project/photo review are both required. Public application/claim forms cannot bypass this workflow. Only reviewed content appears on the public profile, contributes to its description and supplies actual published images to structured data. This does not manufacture projects, reviews, ratings or SEO traffic improvements.

## Deployment and recovery

Apply `migrations/20260921_customer_progress.sql`, then deploy the backward-compatible RFQ service and web application. Backend initialization creates private customer-action, project-brief, photo and audit tables and adds an explicit customer message to shop response records. Preserve and back up both PostgreSQL and SQLite before deployment.

The local release evidence directory contains source hashes, backup location, migration receipt, commit/deployment IDs and checks. To roll back application code, use the recorded previous web commit and backed-up backend source. Keep additive tables/columns and collected records; do not drop them during a code rollback. Any pending inquiry-reminder notifications must be held before rolling back to a worker that does not understand that notification kind. Resume only after a compatible worker is restored.

Validation: 88 Node tests, 35 backend tests, 21 isolated PostgreSQL checks, production build and phone-size customer/shop/owner UI checks. Production checks use read-only requests or invalid inputs; no fabricated production inquiries, confirmations, photos, projects or test emails are needed.
