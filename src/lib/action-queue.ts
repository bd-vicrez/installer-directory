import type { Pool } from "pg";
import { rfqFetch, UUID } from "./directory-rfq";
import { InputError, textField } from "./onboarding";
import { pilotMissing } from "./pilot";
export const ACTION_KINDS = [
  "application",
  "claim",
  "inquiry",
  "pilot",
  "notification",
  "operation",
];
export type ActionItem = {
  key: string;
  kind: string;
  record_id: string;
  title: string;
  reason: string;
  href: string;
  source_due_at: string | null;
  priority: "urgent" | "normal";
  created_at: string;
  source_status: string;
  source_updated_at: string;
  assigned_to?: string | null;
  assignee?: string | null;
  assignee_active?: boolean;
  due_at?: string | null;
  workflow?: string;
  note?: string;
  version?: number;
  overdue?: boolean;
};
const iso = (v: any) => new Date(v).toISOString();
const addHours = (v: any, h: number) =>
  new Date(new Date(v).getTime() + h * 3600000).toISOString();
// SQLite timestamps are UTC even when they lack an explicit suffix.
const sqliteDate = (v: string) =>
  v && !/[Zz]|[+-]\d\d:\d\d$/.test(v) ? v.replace(" ", "T") + "Z" : v;
export function deriveActions(data: any, now = Date.now()): ActionItem[] {
  const items: ActionItem[] = [];
  const add = (
    kind: string,
    row: any,
    title: string,
    reason: string,
    href: string,
    due: string | null,
    urgent = false,
  ) =>
    items.push({
      key: kind + ":" + row.id,
      kind,
      record_id: String(row.id),
      title,
      reason,
      href,
      source_due_at: due,
      priority: urgent ? "urgent" : "normal",
      created_at: iso(row.created_at),
      source_status: row.status || "",
      source_updated_at: iso(row.updated_at || row.created_at),
    });
  for (const row of data.applications || [])
    if (["pending", "needs_information"].includes(row.status))
      add(
        "application",
        {
          ...row,
          created_at: row.submitted_at,
          updated_at: row.reviewed_at || row.submitted_at,
        },
        row.business_name + " · " + row.application_id,
        row.status === "needs_information"
          ? "Applicant information needed"
          : "Application review needed",
        "/admin/applications#request-" + encodeURIComponent(row.id),
        addHours(row.submitted_at, 24),
      );
  for (const row of data.claims || [])
    if (["pending", "needs_information", "verified"].includes(row.status))
      add(
        "claim",
        {
          ...row,
          created_at: row.submitted_at,
          updated_at: row.reviewed_at || row.submitted_at,
        },
        row.business_name + " · CLM-" + row.id.slice(0, 8).toUpperCase(),
        row.owner_grant_id
          ? "Owner profile changes awaiting review"
          : "Ownership or listing correction review",
        "/admin/claims#request-" + encodeURIComponent(row.id),
        addHours(row.submitted_at, 24),
      );
  const followups = new Map(
    (data.followups || []).map((r: any) => [String(r.submission_id), r]),
  );
  for (const r of data.inquiries || []) {
    const f: any = followups.get(String(r.submission_id)),
      created = sqliteDate(r.created_at),
      latestReply = r.last_response_at ? sqliteDate(r.last_response_at) : null;
    const terminal = f && ["booked", "declined"].includes(f.state),
      unhandledReply =
        latestReply &&
        (!f ||
          new Date(latestReply).getTime() > new Date(f.updated_at).getTime());
    const routing =
      ["failed", "needs_review"].includes(r.routing_state) ||
      Number(r.failed_deliveries) > 0;
    const unsent =
      Number(r.pending_deliveries) > 0 &&
      now - new Date(created).getTime() > 3600000;
    const unanswered = Number(r.unanswered_over_48h) > 0;
    const due = f?.next_followup_at ? iso(f.next_followup_at) : null;
    if (terminal && !due && !unhandledReply) continue;
    let reason = unhandledReply
      ? "New shop response needs staff review"
      : routing
        ? "Routing or notification delivery needs review"
        : unsent
          ? "Notification still pending after one hour"
          : unanswered
            ? "Shop has not replied after 48 hours"
            : due
              ? "Scheduled customer/shop follow-up"
              : !f || f.state === "new"
                ? "Saved inquiry needs initial follow-up"
                : f.state === "quoted"
                  ? "Estimate sent; record the customer decision"
                  : "Contact started; record the next outcome";
    const sourceDue =
      due ||
      (unhandledReply ? addHours(latestReply, 24) : addHours(created, 48));
    add(
      "inquiry",
      {
        id: r.submission_id,
        created_at: created,
        updated_at: latestReply || f?.updated_at || created,
        status: f?.state || "new",
      },
      "VZ-" + r.submission_id + " · " + r.service,
      reason,
      "/admin/inquiries?request=" + r.submission_id,
      sourceDue,
      !terminal && (routing || unsent || unanswered),
    );
  }
  for (const r of data.pilot || []) {
    const missing = pilotMissing(r.evidence, r),
      active = r.decision === "active" && !missing.length;
    if (active || ["paused", "declined"].includes(r.decision)) continue;
    const notice = r.outreach_state,
      reason =
        r.decision === "active"
          ? "Participation evidence or current contact needs revalidation"
          : notice
            ? "Invitation " + notice + "; awaiting shop confirmation"
            : "Pilot candidate needs participation review";
    add(
      "pilot",
      {
        ...r,
        id: r.installer_id,
        created_at: r.created_at || r.updated_at,
        status: r.decision,
      },
      r.business_name,
      reason,
      "/admin/pilot#shop-" + encodeURIComponent(r.installer_id),
      notice ? addHours(r.outreach_at, 7 * 24) : null,
      r.decision === "active",
    );
  }
  for (const r of data.notifications || [])
    add(
      "notification",
      { ...r, created_at: r.created_at, status: r.state },
      r.reference + " · " + r.kind,
      "Notification " +
        r.state +
        ": " +
        (r.last_error || "Review provider evidence before retrying"),
      "/admin/operations",
      iso(r.created_at),
      true,
    );
  for (const r of data.runs || []) {
    const age = now - new Date(r.checked_at).getTime();
    if (r.ok && age < (r.name === "backup" ? 36 * 3600000 : 15 * 60000))
      continue;
    add(
      "operation",
      {
        id: r.name,
        created_at: r.checked_at,
        status: r.ok ? "stale" : "failed",
      },
      r.name.replaceAll("-", " ") + " check",
      r.ok
        ? "Scheduled check is overdue"
        : "Scheduled check reported a failure",
      "/admin/operations",
      iso(r.checked_at),
      true,
    );
  }
  return items;
}
export function decorateActions(
  items: ActionItem[],
  assignments: any[],
  now = Date.now(),
) {
  const byKey = new Map(assignments.map((a) => [a.task_key, a]));
  return items
    .map((item) => {
      const a = byKey.get(item.key),
        due = a?.due_at ? iso(a.due_at) : item.source_due_at;
      return {
        ...item,
        assigned_to: a?.assigned_to || null,
        assignee: a?.display_name || null,
        assignee_active: a?.assignee_active ?? true,
        due_at: due,
        custom_due_at: a?.due_at ? iso(a.due_at) : null,
        workflow: a?.workflow || "open",
        note: a?.note || "",
        version: a?.version || 0,
        overdue: !!due && new Date(due).getTime() < now,
      };
    })
    .sort(
      (a, b) =>
        Number(b.priority === "urgent") - Number(a.priority === "urgent") ||
        Number(b.overdue) - Number(a.overdue) ||
        (a.due_at ? Date.parse(a.due_at) : Infinity) -
          (b.due_at ? Date.parse(b.due_at) : Infinity) ||
        a.key.localeCompare(b.key),
    );
}
export async function loadActionQueue(pool: Pool) {
  const warnings: string[] = [];
  const [
    applications,
    claims,
    followups,
    pilot,
    notifications,
    runs,
    assignments,
    staff,
  ] = await Promise.all([
    pool.query(
      "SELECT id,application_id,business_name,status,submitted_at,reviewed_at FROM applications WHERE status IN ('pending','needs_information') ORDER BY submitted_at LIMIT 1001",
    ),
    pool.query(
      "SELECT c.id,c.status,c.owner_grant_id,c.submitted_at,c.reviewed_at,i.business_name FROM directory_claims c JOIN installers i ON i.id=c.installer_id WHERE c.status IN ('pending','needs_information','verified') ORDER BY c.submitted_at LIMIT 1001",
    ),
    pool.query(
      "SELECT submission_id,state,next_followup_at,updated_at FROM directory_inquiry_followup",
    ),
    pool.query(
      `SELECT p.*,i.business_name,i.status,i.routing_email,i.quote_routing_enabled,i.owner_inquiry_paused,i.google_status,n.state AS outreach_state,o.queued_at AS outreach_at FROM directory_shop_pilot p JOIN installers i ON i.id=p.installer_id LEFT JOIN directory_pilot_outreach o ON o.installer_id=p.installer_id AND o.campaign='installer-pilot-2026-09' LEFT JOIN directory_notifications n ON n.id=o.notification_id ORDER BY p.updated_at LIMIT 1001`,
    ),
    pool.query(
      "SELECT id,kind,reference,state,last_error,created_at FROM directory_notifications WHERE state IN ('failed','not_delivered','uncertain','held') ORDER BY created_at LIMIT 1001",
    ),
    pool.query(
      "SELECT name,checked_at,ok FROM directory_operation_runs WHERE name IN ('backup','notifications','notification-delivery','operations-client')",
    ),
    pool.query(
      "SELECT a.*,s.display_name,s.active AS assignee_active FROM directory_action_assignments a LEFT JOIN directory_staff_users s ON s.id=a.assigned_to",
    ),
    pool.query(
      "SELECT id,username,display_name FROM directory_staff_users WHERE active ORDER BY display_name",
    ),
  ]);
  let inquiries: any[] = [];
  try {
    const r = await rfqFetch("/internal/directory-rfq/action-items");
    if (!r.ok) throw Error();
    const data = await r.json();
    if (!Array.isArray(data.items)) throw Error();
    inquiries = data.items;
    if (data.limited)
      warnings.push("Only the newest 5,000 inquiry records are included.");
    if (data.worker_recent === false)
      warnings.push("The inquiry delivery worker has not checked in recently.");
  } catch {
    warnings.push(
      "Inquiry service unavailable. Inquiry tasks are missing from this view; retry before assessing the full queue.",
    );
  }
  for (const [label, rows] of [
    ["Applications", applications.rows],
    ["Ownership requests", claims.rows],
    ["Pilot candidates", pilot.rows],
    ["Notification issues", notifications.rows],
  ] as const)
    if (rows.length > 1000)
      warnings.push(label + ": the oldest 1,000 records are shown.");
  const items = decorateActions(
    deriveActions({
      applications: applications.rows.slice(0, 1000),
      claims: claims.rows.slice(0, 1000),
      followups: followups.rows,
      pilot: pilot.rows.slice(0, 1000),
      notifications: notifications.rows.slice(0, 1000),
      runs: runs.rows,
      inquiries,
    }),
    assignments.rows,
  );
  return {
    items,
    staff: staff.rows,
    warnings,
    checked_at: new Date().toISOString(),
  };
}
export function actionInput(b: any) {
  const kind = textField(b.kind, "task type", 1, 30),
    record_id = textField(b.record_id, "task reference", 1, 100);
  if (
    !ACTION_KINDS.includes(kind) ||
    !["open", "in_progress", "waiting"].includes(b.workflow) ||
    !Number.isInteger(b.version) ||
    b.version < 0
  )
    throw new InputError("Choose a current task and work status.");
  if (b.assigned_to !== null && !UUID.test(b.assigned_to || ""))
    throw new InputError(
      "Choose an active named staff account, or leave unassigned.",
    );
  if (b.due_at !== null && typeof b.due_at !== "string")
    throw new InputError("Choose a valid due date.");
  const due = b.due_at ? new Date(b.due_at) : null;
  if (
    due &&
    (!Number.isFinite(due.getTime()) ||
      Math.abs(due.getTime() - Date.now()) > 366 * 86400000)
  )
    throw new InputError("Choose a due date within one year.");
  if (b.workflow === "waiting" && !due)
    throw new InputError("Set a follow-up date for a waiting task.");
  return {
    kind,
    record_id,
    key: kind + ":" + record_id,
    assigned_to: b.assigned_to,
    due_at: due ? due.toISOString() : null,
    workflow: b.workflow,
    note: textField(b.note, "work note", 10, 1500),
    version: b.version,
  };
}
