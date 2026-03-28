-- Rollback: Remove Google Places enrichment columns
-- Run this if you need to undo the enrichment migration

ALTER TABLE installers DROP COLUMN IF EXISTS google_place_id;
ALTER TABLE installers DROP COLUMN IF EXISTS google_rating;
ALTER TABLE installers DROP COLUMN IF EXISTS google_review_count;
ALTER TABLE installers DROP COLUMN IF EXISTS google_hours;
ALTER TABLE installers DROP COLUMN IF EXISTS google_phone;
ALTER TABLE installers DROP COLUMN IF EXISTS google_website;
ALTER TABLE installers DROP COLUMN IF EXISTS google_photos_url;
ALTER TABLE installers DROP COLUMN IF EXISTS google_status;
ALTER TABLE installers DROP COLUMN IF EXISTS google_types;
ALTER TABLE installers DROP COLUMN IF EXISTS enriched_at;

DROP INDEX IF EXISTS idx_installers_enriched_at;
DROP INDEX IF EXISTS idx_installers_google_status;

-- Reset any shops marked as closed back to active
UPDATE installers SET status = 'active' WHERE status = 'closed';
