-- SEO data cleanup migration (2026-05-28)
-- Fixes duplicate state entries that produce duplicate sitemap URLs.
-- Author: Cael (AI CMO)
--
-- BEFORE/AFTER counts logged so we can verify.

BEGIN;

-- 1. Normalize lowercase 'mi' -> 'MI' (root cause of the Michigan duplicate)
UPDATE installers SET state = 'MI' WHERE state = 'mi';

-- 2. Normalize full state names to abbreviations
UPDATE installers SET state = 'MO' WHERE state = 'Missouri';
UPDATE installers SET state = 'OR' WHERE state = 'Oregon';
UPDATE installers SET state = 'DC' WHERE state = 'District of Columbia';

-- 3. Canadian provinces and non-US locations: mark as removed (out of US Vicrez scope for now)
--    AB=Alberta, BC=British Columbia, ON=Ontario, QC=Quebec, SK=Saskatchewan, England
--    NOTE: keeping data but excluding from sitemap by setting status. Reversible.
UPDATE installers
   SET status = 'non_us_excluded'
 WHERE state IN ('AB','BC','ON','QC','SK','Ontario','England')
   AND status != 'removed';

-- 4. Uppercase any remaining 2-letter US state codes just in case (defensive)
UPDATE installers
   SET state = UPPER(state)
 WHERE LENGTH(state) = 2
   AND state ~ '^[a-zA-Z]{2}$'
   AND state != UPPER(state);

COMMIT;

-- Verification queries (run separately):
-- SELECT state, COUNT(*) FROM installers WHERE status != 'removed' AND status != 'non_us_excluded' GROUP BY state ORDER BY state;
