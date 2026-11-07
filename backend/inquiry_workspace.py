"""Read-only, paginated staff overview. No recipient checks or delivery writes."""
import re
from datetime import datetime, timezone
from fastapi import HTTPException

SCOPES = ('verified', 'held', 'quarantined', 'all')


def positive(value, label, maximum=10**15-1):
    if value is None:
        return None
    if not re.fullmatch(r'[1-9][0-9]{0,14}', value) or int(value) > maximum:
        raise HTTPException(400, 'Choose a valid '+label)
    return int(value)


def overview(conn, params):
    scope = params.get('scope', 'verified')
    if scope not in SCOPES:
        raise HTTPException(400, 'Choose a valid inquiry scope')
    limit = positive(params.get('limit', '20'), 'page size', 50)
    before = positive(params.get('before'), 'page cursor')
    snapshot = positive(params.get('snapshot'), 'snapshot')
    selected = positive(params.get('id'), 'inquiry')
    if before is not None and snapshot is None:
        raise HTTPException(400, 'Refresh the inquiry list before continuing')
    if selected is not None and (before is not None or snapshot is not None):
        raise HTTPException(400, 'Choose a request or a list page')
    # One read transaction keeps counts and the page consistent. The snapshot
    # upper bound excludes new arrivals until Refresh; ID cursors avoid offset drift.
    conn.execute('BEGIN')
    highest = conn.execute('SELECT MAX(id) FROM rfq_submissions').fetchone()[0] or 0
    snapshot = min(snapshot, highest) if snapshot is not None else highest
    cte = """WITH inventory AS (
      SELECT r.id AS submission_id,r.vehicle_year,r.vehicle_make,r.vehicle_model,
      COALESCE(d.created_at,q.created_at) AS created_at,
      COALESCE(d.flow,'legacy') AS flow,COALESCE(d.service,'Legacy inquiry') AS service,
      COALESCE(d.routing_state,'needs_review') AS routing_state,
      COALESCE(q.state,'held') AS review_state,
      CASE WHEN q.state IN ('verified','released') THEN 'verified'
           WHEN q.state='quarantined' THEN 'quarantined' ELSE 'held' END AS intake_scope,
      COALESCE(ca.state,'open') AS customer_state
      FROM rfq_submissions r LEFT JOIN directory_requests d ON d.submission_id=r.id
      LEFT JOIN quote_intake_reviews q ON q.submission_id=r.id
      LEFT JOIN directory_customer_actions ca ON ca.submission_id=r.id
      WHERE (d.submission_id IS NOT NULL OR q.submission_id IS NOT NULL) AND r.id<=?
    ) """
    counts = dict.fromkeys(SCOPES, 0)
    for row in conn.execute(cte+'SELECT intake_scope,COUNT(*) n FROM inventory GROUP BY intake_scope', (snapshot,)):
        counts[row['intake_scope']] = row['n']
        counts['all'] += row['n']
    where, values = ['1=1'], [snapshot]
    if selected is not None:
        where.append('submission_id=?'); values.append(selected)
    else:
        if scope != 'all':
            where.append('intake_scope=?'); values.append(scope)
        if before is not None:
            where.append('submission_id<?'); values.append(before)
    rows = conn.execute(cte+'SELECT * FROM inventory WHERE '+' AND '.join(where)+' ORDER BY submission_id DESC LIMIT ?', values+[limit+1]).fetchall()
    more = len(rows) > limit
    items = []
    for row in rows[:limit]:
        item = dict(row)
        # Bounded page, indexed per-request lookup; expose no contact fields,
        # request payloads, private links or provider errors in the overview.
        jobs = conn.execute("""SELECT o.target_id,o.state,e.state AS evidence,r.state AS response_state
          FROM directory_outbox o LEFT JOIN directory_delivery_checks e ON e.job_id=o.id
          LEFT JOIN directory_shop_responses r ON r.job_id=o.id
          WHERE o.submission_id=? AND o.kind='installer' ORDER BY o.id""", (row['submission_id'],)).fetchall()
        item['deliveries'] = [dict(job) for job in jobs]
        items.append(item)
    heartbeat = conn.execute('SELECT heartbeat FROM directory_worker_state WHERE id=1').fetchone()
    import time
    return {'items':items,'counts':counts,'scope':scope,'snapshot':snapshot,
            'next_cursor':items[-1]['submission_id'] if more else None,
            'selected_id':selected,'worker_recent':bool(heartbeat and time.time()-heartbeat['heartbeat']<120),
            'as_of':datetime.now(timezone.utc).isoformat(),'version':'workspace-v1'}
