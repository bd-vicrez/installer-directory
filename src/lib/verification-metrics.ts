import type { Pool } from "pg";
export async function verificationMetrics(db: Pool) {
  const [budget, queue, mail, proofs, watchdog] = await Promise.all([
    db.query(
      `SELECT count(*)::int used FROM directory_automation_attempts WHERE created_at >= (date_trunc('day',NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')`,
    ),
    db.query(`WITH requests AS (SELECT 'application' kind,id::text id,status,submitted_at,reviewed_at FROM applications WHERE status IN ('pending','needs_information')
    UNION ALL SELECT 'claim',id,status,submitted_at,reviewed_at FROM directory_claims WHERE status IN ('pending','needs_information'))
    SELECT r.kind,count(*)::int open,count(*) FILTER(WHERE a.task_key IS NULL AND r.reviewed_at IS NULL)::int unreviewed,
    MIN(r.submitted_at) FILTER(WHERE a.task_key IS NULL AND r.reviewed_at IS NULL) oldest_unreviewed_at,
    count(*) FILTER(WHERE a.state='awaiting_business_confirmation' AND EXISTS(SELECT 1 FROM directory_claim_verifications v WHERE v.claim_id=r.id AND v.cancelled_at IS NULL AND v.consumed_at IS NULL AND v.expires_at>NOW()))::int awaiting_confirmation,
    count(*) FILTER(WHERE a.paused)::int held,
    count(*) FILTER(WHERE a.state='recovery_requested')::int recovery_requested
    FROM requests r LEFT JOIN directory_automation_cases a ON a.task_key=r.kind||':'||r.id GROUP BY r.kind`),
    db.query(
      `SELECT outcome,state,count(*)::int count FROM directory_notifications WHERE outcome IN ('ownership_verification','quote_setup_test') AND created_at>=NOW()-INTERVAL '30 days' GROUP BY outcome,state`,
    ),
    db.query(`SELECT count(*) FILTER(WHERE consumed_at>=NOW()-INTERVAL '30 days')::int confirmed_30d,
    count(*) FILTER(WHERE consumed_at IS NULL AND cancelled_at IS NULL AND expires_at<=NOW())::int expired FROM directory_claim_verifications`),
    db.query(
      `SELECT checked_at,ok,details FROM directory_operation_runs WHERE name='verification-watchdog'`,
    ),
  ]);
  return {
    attempts_used_utc_day: budget.rows[0].used,
    queue: queue.rows,
    delivery_30d: mail.rows,
    proofs: proofs.rows[0],
    watchdog: watchdog.rows[0] || null,
  };
}
