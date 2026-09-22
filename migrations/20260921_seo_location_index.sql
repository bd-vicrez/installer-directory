-- Run outside a transaction. CONCURRENTLY keeps normal reads and writes available.
-- No business data or contact permissions change.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_installers_live_location
ON public.installers (LOWER(state), LOWER(city))
WHERE status NOT IN ('removed', 'non_us_excluded');
