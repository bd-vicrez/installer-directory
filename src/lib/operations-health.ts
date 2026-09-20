import type { Pool } from "pg";
import { loadActionQueue } from "./action-queue";
import { rfqFetch } from "./directory-rfq";
export async function operationHealth(db: Pool) {
  const counts = (
    await db.query(`SELECT
 (SELECT COUNT(*)::int FROM applications WHERE status IN ('pending','needs_information') AND submitted_at<NOW()-INTERVAL '1 day') AS applications_overdue,
 (SELECT COUNT(*)::int FROM directory_claims WHERE status IN ('pending','needs_information','verified') AND submitted_at<NOW()-INTERVAL '1 day') AS claims_overdue,
 (SELECT COUNT(*)::int FROM directory_notifications WHERE state IN ('uncertain','failed','held','not_delivered') OR (state IN ('pending','retry') AND created_at<NOW()-INTERVAL '15 minutes') OR (state='accepted' AND accepted_at<NOW()-INTERVAL '1 day')) AS notification_attention,
 (SELECT COUNT(*)::int FROM directory_inquiry_followup WHERE next_followup_at<NOW() AND state NOT IN ('booked','declined')) AS followups_due,
 (SELECT checked_at FROM directory_operation_runs WHERE name='backup' AND ok=true) AS last_backup,
 (SELECT checked_at FROM directory_operation_runs WHERE name='notifications' AND ok=true) AS last_notification_worker,
 (SELECT checked_at FROM directory_operation_runs WHERE name='notification-delivery' AND ok=true) AS last_delivery_worker`)
  ).rows[0];
  let inquiry: any = { available: false };
  try {
    const r = await rfqFetch("/internal/directory-rfq/requests");
    if (r.ok) {
      const d = await r.json();
      inquiry = {
        available: true,
        worker_recent: d.worker_recent,
        routing_attention:
          (d.routing_counts?.needs_review || 0) +
          (d.routing_counts?.failed || 0),
        unanswered_over_48h: d.unanswered_over_48h || 0,
        delivery_attention:
          (d.delivery_counts?.failed || 0) +
          (d.delivery_counts?.cancelled || 0),
      };
    }
  } catch {
    /* Report unavailable. */
  }
  const issues: string[] = [];
  for (const [key, label] of [
    ["applications_overdue", "applications awaiting review over 24 hours"],
    [
      "claims_overdue",
      "ownership/correction requests awaiting review over 24 hours",
    ],
    ["notification_attention", "notifications needing review"],
    ["followups_due", "inquiry follow-ups due"],
  ])
    if (counts[key]) issues.push(counts[key] + " " + label);
  if (!inquiry.available) issues.push("Inquiry status could not be checked");
  else {
    if (!inquiry.worker_recent)
      issues.push("Inquiry delivery worker has not checked in recently");
    if (inquiry.routing_attention)
      issues.push(inquiry.routing_attention + " inquiries need routing review");
    if (inquiry.unanswered_over_48h)
      issues.push(
        inquiry.unanswered_over_48h +
          " inquiry notifications have no shop response after 48 elapsed hours; review follow-up",
      );
    if (inquiry.delivery_attention)
      issues.push(
        inquiry.delivery_attention + " inquiry notifications need review",
      );
  }
  if (
    !counts.last_backup ||
    Date.now() - new Date(counts.last_backup).getTime() > 30 * 3600000
  )
    issues.push("Backup verification is missing or older than 30 hours");
  if (
    !counts.last_notification_worker ||
    Date.now() - new Date(counts.last_notification_worker).getTime() >
      15 * 60000
  )
    issues.push(
      "Notification worker check-in is missing or older than 15 minutes",
    );
  if (
    !counts.last_delivery_worker ||
    Date.now() - new Date(counts.last_delivery_worker).getTime() > 15 * 60000
  )
    issues.push(
      "Notification delivery check-in is missing or older than 15 minutes",
    );
  return { counts, inquiry, issues };
}
export async function queueStaffDigest(db: Pool) {
  const health = await operationHealth(db),
    day = new Date().toISOString().slice(0, 10);
  const queue = await loadActionQueue(db);
  const overdue = queue.items.filter((i) => i.overdue).length,
    unassigned = queue.items.filter(
      (i) => !i.assigned_to || !i.assignee_active,
    ).length;
  if (overdue) health.issues.push(overdue + " overdue action-queue tasks");
  if (unassigned)
    health.issues.push(
      unassigned + " action-queue tasks need an active staff assignment",
    );
  health.issues.push(...queue.warnings);
  const recipients = (process.env.DIRECTORY_STAFF_ALERT_EMAILS || "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter((x) => /^[a-z0-9._%+-]+@vicrez\.com$/.test(x));
  if (health.issues.length)
    for (const email of new Set(recipients))
      await db.query(
        `INSERT INTO directory_notifications(event_key,kind,record_id,recipient,reference,outcome,public_message)
 VALUES($1,'staff',$2,$3,$4,'staff_alert',$5) ON CONFLICT(event_key) DO NOTHING`,
        [
          "daily:" + day + ":" + email,
          day,
          email,
          "OPS-" + day,
          health.issues.join("\n"),
        ],
      );
  return {
    actionable: health.issues.length,
    staff_notifications_configured: recipients.length > 0,
  };
}
