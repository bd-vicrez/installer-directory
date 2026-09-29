import { getPool } from "./db";

export async function experienceReport() {
  const db = getPool();
  const until = new Date(),
    since = new Date(until.getTime() - 30 * 86400000);
  const params = [since, until];
  const [vitals, search, quotes, forms, coverage, contacts] = await Promise.all(
    [
      db.query(
        `SELECT device_category,page,metric,count(*)::int AS samples,
      percentile_cont(0.75) WITHIN GROUP(ORDER BY metric_value) AS p75
      FROM directory_discovery_events WHERE created_at >= $1 AND created_at < $2
      AND event='web_vital' AND device_category IS NOT NULL
      GROUP BY device_category,page,metric ORDER BY device_category,page,metric`,
        params,
      ),
      db.query(
        `WITH journeys AS (
      SELECT device_category,journey_id,bool_or(event='search_start') AS started,
        bool_or(event='search_results') AS results,bool_or(event='search_error') AS failed,
        bool_or(event='search_cancel') AS cancelled,max(created_at) AS last_at,
        max(duration_ms) FILTER(WHERE event='search_results') AS duration_ms
      FROM directory_discovery_events WHERE created_at >= $1 AND created_at < $2
        AND device_category IS NOT NULL AND journey_id IS NOT NULL AND event IN ('search_start','search_results','search_error','search_cancel')
      GROUP BY device_category,journey_id)
      SELECT device_category,count(*) FILTER(WHERE started)::int AS started,
        count(*) FILTER(WHERE started AND results)::int AS results,
        count(*) FILTER(WHERE started AND failed AND NOT results)::int AS errors,
        count(*) FILTER(WHERE started AND cancelled AND NOT results)::int AS cancelled,
        count(*) FILTER(WHERE started AND NOT results AND NOT failed AND NOT cancelled AND last_at < $2 - INTERVAL '30 minutes')::int AS no_result_recorded,
        percentile_cont(0.75) WITHIN GROUP(ORDER BY duration_ms) FILTER(WHERE started AND results) AS results_p75_ms
      FROM journeys GROUP BY device_category`,
        params,
      ),
      db.query(
        `WITH journeys AS (
      SELECT device_category,journey_id,bool_or(event='quote_open') AS opened,
        bool_or(event='quote_input') AS entered,bool_or(event='quote_step' AND step='contact') AS contact,
        bool_or(event='quote_step' AND step='review') AS review,bool_or(event='quote_attempt') AS attempted,
        bool_or(event='quote_saved') AS saved,bool_or(event='quote_validation') AS validation,
        bool_or(event='quote_error') AS failed,max(created_at) AS last_at
      FROM directory_discovery_events WHERE created_at >= $1 AND created_at < $2
        AND device_category IS NOT NULL AND journey_id IS NOT NULL AND event LIKE 'quote_%'
      GROUP BY device_category,journey_id)
      SELECT device_category,count(*)::int AS opened,count(*) FILTER(WHERE entered)::int AS entered,
        count(*) FILTER(WHERE contact)::int AS contact,count(*) FILTER(WHERE review)::int AS review,
        count(*) FILTER(WHERE attempted)::int AS attempted,count(*) FILTER(WHERE saved)::int AS saved,
        count(*) FILTER(WHERE validation)::int AS validation,count(*) FILTER(WHERE failed)::int AS errors,
        count(*) FILTER(WHERE NOT saved AND last_at >= $2 - INTERVAL '30 minutes')::int AS recent_unfinished,
        count(*) FILTER(WHERE NOT saved AND NOT attempted AND NOT contact AND NOT review AND last_at < $2 - INTERVAL '30 minutes')::int AS stopped_project,
        count(*) FILTER(WHERE NOT saved AND NOT attempted AND contact AND NOT review AND last_at < $2 - INTERVAL '30 minutes')::int AS stopped_contact,
        count(*) FILTER(WHERE NOT saved AND NOT attempted AND review AND last_at < $2 - INTERVAL '30 minutes')::int AS stopped_review,
        count(*) FILTER(WHERE NOT saved AND attempted AND last_at < $2 - INTERVAL '30 minutes')::int AS attempt_unconfirmed
      FROM journeys WHERE opened GROUP BY device_category`,
        params,
      ),
      db.query(
        `SELECT device_category,event,count(*)::int AS events,count(DISTINCT journey_id)::int AS journeys
      FROM directory_discovery_events WHERE created_at >= $1 AND created_at < $2 AND device_category IS NOT NULL
        AND (event LIKE 'application_%' OR event LIKE 'claim_%' OR event LIKE 'lookup_%')
      GROUP BY device_category,event ORDER BY device_category,event`,
        params,
      ),
      db.query(
        `SELECT min(created_at) AS first_event,count(*)::int AS events FROM directory_discovery_events
      WHERE created_at >= $1 AND created_at < $2 AND device_category IS NOT NULL`,
        params,
      ),
      db.query(
        `WITH searches AS (SELECT device_category,session_id,created_at FROM directory_discovery_events
      WHERE created_at >= $1 AND created_at < $2 AND event='search_results' AND device_category IS NOT NULL)
      SELECT device_category,count(DISTINCT session_id)::int AS search_sessions,
      count(DISTINCT session_id) FILTER(WHERE EXISTS(SELECT 1 FROM directory_discovery_events c
        WHERE c.session_id=searches.session_id AND c.created_at>=searches.created_at
          AND c.created_at < LEAST($2,searches.created_at + INTERVAL '30 minutes')
          AND c.event IN ('phone_click','directions_click','website_click','quote_open')))::int AS contact_sessions
      FROM searches GROUP BY device_category`,
        params,
      ),
    ],
  );
  return {
    since,
    until,
    vitals: vitals.rows,
    search: search.rows,
    quotes: quotes.rows,
    forms: forms.rows,
    coverage: coverage.rows[0],
    contacts: contacts.rows,
  };
}
