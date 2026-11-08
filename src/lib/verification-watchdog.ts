import { randomUUID, timingSafeEqual } from "node:crypto";
import type { Pool } from "pg";
import { processNotifications } from "./notifications";

export function watchdogAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32) return false;
  const supplied = Buffer.from(request.headers.get("authorization") || ""),
    expected = Buffer.from("Bearer " + secret);
  return (
    supplied.length === expected.length && timingSafeEqual(supplied, expected)
  );
}
export function verificationProblem(run: any, now = Date.now()) {
  const checked = run?.checked_at ? new Date(run.checked_at).getTime() : NaN;
  if (
    !Number.isFinite(checked) ||
    checked > now + 300000 ||
    now - checked >= 2 * 3600000
  )
    return "Hourly shop and ownership verification has missed its two-hour check-in. Check the VPS and installer-verification.timer. Held applications are not an outage.";
  if (run.ok !== true)
    return "The verification worker reported an error. Review Operations and the VPS report; unverified shops and owners remain held.";
  return null;
}
export async function checkVerificationWatchdog(
  db: Pool,
  transport: typeof fetch = fetch,
) {
  if (process.env.DIRECTORY_VERIFICATION_WATCHDOG_ENABLED !== "1")
    return { enabled: false };
  const recipients = [
    ...new Set(
      (process.env.DIRECTORY_STAFF_ALERT_EMAILS || "")
        .split(",")
        .map((x) => x.trim().toLowerCase())
        .filter((x) => /^[a-z0-9._%+-]+@vicrez\.com$/.test(x)),
    ),
  ];
  if (
    !recipients.length ||
    process.env.DIRECTORY_NOTIFICATIONS_ENABLED !== "1" ||
    !process.env.SENDGRID_API_KEY
  )
    throw new Error("Watchdog notification configuration is incomplete");
  const c = await db.connect();
  let problem: string | null = null;
  try {
    await c.query("BEGIN");
    await c.query("SELECT pg_advisory_xact_lock(19339,1)");
    const run = (
      await c.query(
        "SELECT checked_at,ok FROM directory_operation_runs WHERE name='installer-verification'",
      )
    ).rows[0];
    problem = verificationProblem(run);
    const open = (
      await c.query(
        "SELECT * FROM directory_verification_incidents WHERE recovered_at IS NULL FOR UPDATE",
      )
    ).rows[0];
    let event: any = null;
    if (problem && !open) {
      const id = randomUUID();
      await c.query(
        "INSERT INTO directory_verification_incidents(id,reason) VALUES($1,$2)",
        [id, problem],
      );
      event = { id, phase: "outage", message: problem };
    } else if (!problem && open) {
      await c.query(
        "UPDATE directory_verification_incidents SET recovered_at=NOW() WHERE id=$1",
        [open.id],
      );
      event = {
        id: open.id,
        phase: "recovered",
        message:
          "The hourly shop and ownership worker has checked in successfully again. Normal reviews have resumed within the daily research limit. Held cases still require their verification steps.",
      };
    }
    if (event)
      for (const recipient of recipients)
        await c.query(
          `INSERT INTO directory_notifications(event_key,kind,record_id,recipient,reference,outcome,public_message)
        VALUES($1,'staff',$2,$3,$4,'staff_alert',$5) ON CONFLICT(event_key) DO NOTHING`,
          [
            `verification-watchdog:${event.id}:${event.phase}:${recipient}`,
            event.id,
            recipient,
            "VERIFICATION-" + event.phase.toUpperCase(),
            event.message,
          ],
        );
    await c.query("COMMIT");
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
  // Sends only these alerts from Vercel. Never relies on the VPS notification cron.
  const delivery = await processNotifications(
    db,
    transport,
    "verification-watchdog:",
  );
  const attention = (
    await db.query(`SELECT count(*)::int n FROM directory_notifications WHERE starts_with(event_key,'verification-watchdog:')
    AND (state IN ('uncertain','failed','held','not_delivered') OR (state IN ('pending','retry','sending') AND created_at<NOW()-INTERVAL '20 minutes') OR (state='accepted' AND accepted_at<NOW()-INTERVAL '1 day'))`)
  ).rows[0].n;
  await db.query(
    `INSERT INTO directory_operation_runs(name,ok,details) VALUES('verification-watchdog',$1,$2)
    ON CONFLICT(name) DO UPDATE SET checked_at=NOW(),ok=EXCLUDED.ok,details=EXCLUDED.details`,
    [
      attention === 0,
      JSON.stringify({
        worker_healthy: !problem,
        processed: delivery.processed,
        alert_delivery_attention: attention,
        independent_of_vps: true,
      }),
    ],
  );
  return {
    enabled: true,
    worker_healthy: !problem,
    processed: delivery.processed,
    alert_delivery_attention: attention,
  };
}
