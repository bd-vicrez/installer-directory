import { statusToken } from "./onboarding";
import { timingSafeEqual } from "node:crypto";
import type { Pool } from "pg";

export function operationsAuthorized(request: Request) {
  const expected = process.env.DIRECTORY_OPERATIONS_SECRET || "";
  const supplied = (request.headers.get("authorization") || "").replace(
    /^Bearer /,
    "",
  );
  const expectedBytes = Buffer.from(expected),
    suppliedBytes = Buffer.from(supplied);
  return (
    expected.length >= 32 &&
    suppliedBytes.length === expectedBytes.length &&
    timingSafeEqual(suppliedBytes, expectedBytes)
  );
}
export function notificationMessage(row: Record<string, any>) {
  const labels: Record<string, string> = {
    received: "Request received",
    pending: "Review pending",
    needs_information: "Additional information needed",
    approved: "Listing approved",
    verified: "Ownership review verified",
    resolved: "Listing review completed",
    rejected: "Request not approved",
    test: "Delivery test",
    staff_alert: "Review queue needs attention",
  };
  const label = labels[row.outcome] || "Request update";
  const type =
    row.kind === "application" ? "shop application" : "listing review request";
  const explanation: Record<string, string> = {
    received: `We saved your ${type}. The Vicrez installer team will review it. Submission does not grant ownership access or guarantee a listing.`,
    needs_information:
      "The reviewer needs additional information before continuing. Open your private status link for the current request. Reply to this email with the reference below if you need help.",
    approved:
      "Your directory listing has been approved. This is a directory listing; wholesale dealer membership is a separate program.",
    verified:
      "Your relationship to the listing has been reviewed. Requested listing changes may still require a publication decision.",
    resolved:
      "The review is complete. Open your private status link for the reviewer’s public update.",
    rejected:
      "Your request was not approved in its current form. Open the status link for the reviewer’s public update. You can reply with this reference if you need clarification.",
    pending: "Your request is pending review.",
    test: "This is the designated Vicrez installer notification delivery test. No customer application, shop claim or installation inquiry was created.",
    staff_alert:
      "The installer operations queue needs attention. Review the counts below and open https://installers.vicrez.com/admin/operations for details. Sign in to view private requests.",
  };
  const link = ["test", "staff"].includes(row.kind)
    ? ""
    : "https://installers.vicrez.com/request-status#" +
      statusToken(row.kind, row.record_id, row.created_at);
  const text = `${label}\n\n${explanation[row.outcome] || explanation.pending}\n\nReference: ${row.reference}${row.public_message ? "\n\nReviewer update: " + row.public_message : ""}${link ? "\n\nPrivate status link: " + link + "\nKeep this link private." : ""}\n\nVicrez Installer Network\nhttps://installers.vicrez.com/\nReply to support@vicrez.com for assistance.`;
  return {
    personalizations: [
      {
        to: [{ email: row.recipient }],
        custom_args: { directory_notice_id: String(row.id) },
      },
    ],
    from: { email: "support@vicrez.com", name: "Vicrez Installer Network" },
    reply_to: { email: "support@vicrez.com" },
    subject: `${row.kind === "test" ? "[TEST] " : ""}Vicrez installer ${label.toLowerCase()} · ${row.reference}`,
    content: [{ type: "text/plain", value: text }],
    tracking_settings: {
      click_tracking: { enable: false, enable_text: false },
      open_tracking: { enable: false },
    },
  };
}
export async function processNotifications(
  pool: Pool,
  transport: typeof fetch = fetch,
) {
  if (process.env.DIRECTORY_NOTIFICATIONS_ENABLED !== "1")
    return { enabled: false, processed: 0 };
  if (!process.env.SENDGRID_API_KEY)
    throw new Error("Notification provider is not configured");
  // A crashed send may already have reached the provider. Hold it for reconciliation, never blindly resend it.
  await pool.query(
    "UPDATE directory_notifications SET state='uncertain',last_error='Worker stopped before acceptance was recorded',updated_at=NOW() WHERE state='sending' AND lease_until<NOW()",
  );
  const rows = (
    await pool.query(`WITH candidates AS (
    SELECT id FROM directory_notifications WHERE state IN ('pending','retry') AND next_attempt_at<=NOW()
    ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 3
  ) UPDATE directory_notifications n SET state='sending',attempts=attempts+1,lease_until=NOW()+INTERVAL '3 minutes',updated_at=NOW()
    FROM candidates c WHERE n.id=c.id RETURNING n.*`)
  ).rows;
  for (const row of rows) {
    let state = "uncertain",
      error = "Provider acceptance could not be confirmed",
      providerId = null;
    try {
      const r = await transport("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + process.env.SENDGRID_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(notificationMessage(row)),
        signal: AbortSignal.timeout(10000),
      });
      if (r.status === 202) {
        state = "accepted";
        error = "";
        providerId = r.headers.get("x-message-id");
      } else if (r.status === 429) {
        state = row.attempts < 5 ? "retry" : "failed";
        error = "Provider rate limit";
      } else if (r.status >= 500) {
        error = "Provider returned an uncertain server error";
      } else {
        state = "failed";
        error = "Provider rejected request (HTTP " + r.status + ")";
      }
    } catch {
      /* Preserve uncertainty; network failure may follow acceptance. */
    }
    await pool.query(
      `UPDATE directory_notifications SET state=$2,last_error=$3,provider_id=$4,
      accepted_at=CASE WHEN $2='accepted' THEN NOW() ELSE accepted_at END,
      next_attempt_at=NOW()+INTERVAL '5 minutes',lease_until=NULL,updated_at=NOW() WHERE id=$1 AND state='sending'`,
      [row.id, state, error, providerId],
    );
  }
  const accepted = (
    await pool.query(
      "SELECT id,provider_id,recipient FROM directory_notifications WHERE state='accepted' AND provider_id IS NOT NULL AND accepted_at>NOW()-INTERVAL '7 days' AND (checked_at IS NULL OR checked_at<NOW()-INTERVAL '15 minutes') ORDER BY checked_at NULLS FIRST LIMIT 2",
    )
  ).rows;
  for (const row of accepted) {
    try {
      if (!/^[A-Za-z0-9_.-]{1,150}$/.test(row.provider_id)) continue;
      const params = new URLSearchParams({
        limit: "10",
        query: `msg_id LIKE '${row.provider_id}%'`,
      });
      const response = await transport(
        "https://api.sendgrid.com/v3/messages?" + params,
        {
          headers: { Authorization: "Bearer " + process.env.SENDGRID_API_KEY },
          signal: AbortSignal.timeout(7000),
        },
      );
      if (!response.ok) throw Error();
      const matches =
        (await response.json()).messages?.filter(
          (m: any) =>
            m.msg_id?.startsWith(row.provider_id) &&
            m.to_email?.toLowerCase() === row.recipient.toLowerCase(),
        ) || [];
      const status =
        matches.find((m: any) => m.status === "delivered")?.status ||
        matches.find((m: any) => m.status === "not_delivered")?.status;
      await pool.query(
        `UPDATE directory_notifications SET state=CASE WHEN $2='delivered' THEN 'delivered' WHEN $2='not_delivered' THEN 'not_delivered' ELSE state END,
        delivered_at=CASE WHEN $2='delivered' THEN NOW() ELSE delivered_at END,last_error=CASE WHEN $2 IN ('delivered','not_delivered') THEN '' ELSE last_error END,checked_at=NOW(),updated_at=NOW() WHERE id=$1`,
        [row.id, status || "unknown"],
      );
    } catch {
      await pool.query(
        "UPDATE directory_notifications SET checked_at=NOW(),last_error='Delivery evidence temporarily unavailable; acceptance preserved' WHERE id=$1",
        [row.id],
      );
    }
  }
  await pool.query(
    "INSERT INTO directory_operation_runs(name,ok,details) VALUES('notifications',true,$1) ON CONFLICT(name) DO UPDATE SET checked_at=NOW(),ok=true,details=EXCLUDED.details",
    [JSON.stringify({ processed: rows.length })],
  );
  return { enabled: true, processed: rows.length };
}
