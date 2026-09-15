# Directory inquiry service

`directory_rfq.py` is deployed beside the existing FastAPI RFQ router. It uses the existing RFQ SQLite database and creates additive request/outbox tables. Historical inquiries are not replayed. The shared service definitions are copied beside the deployed Python module.

The existing application must initialize its RFQ table before `init_directory_db()`, include this router, and start/cancel `directory_worker_loop()` in its lifespan. Redact authorization/cookie headers in request logging. The existing installer-feed consumer must honor `routing_email`, `quote_routing_enabled`, closed-business status and exact selected-shop routing.

Apply `migrations/20260915_phase_a.sql` before the website release. Provision the same dedicated `DIRECTORY_RFQ_SECRET` in the website's production environment and the RFQ service environment (or `/app/data/directory-rfq-secret`, mode 0600). Preserve the existing private feed token. Never commit either value.

The worker uses stable event IDs with the existing **Installer Quote Request Forwarded** Klaviyo metric. Provider acceptance does not prove inbox delivery. New directory inquiries do not enter the older customer marketing nurture or SMS path. Older RFQ clients remain on their existing routes. The email template supports both old and new event shapes.

Validate with `python -m unittest discover -s backend -p test_directory_rfq.py -v`; all external delivery/routing calls in these tests are mocked. Browser form tests must use an isolated simulator; do not submit fictitious inquiries to production.

Deploy backend support before activating the website. Check `/webhook/rfq/directory/health`, then the protected inquiry view for worker freshness. Verify existing RFQ health and private feeds remain compatible. Back up source and use SQLite's backup API before deployment. Roll back code with guarded file hashes or the previous website deployment; retain all newly accepted inquiries and additive tables. Do not restore an old database over new requests.
