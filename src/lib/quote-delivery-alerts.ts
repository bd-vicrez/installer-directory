import type { Pool } from 'pg';
import { rfqFetch, UUID } from './directory-rfq';

const reasons: Record<string,string> = {
  routing_unavailable:'No eligible shop recipient could be confirmed. Review the request and ask the customer about the next step before sharing it with another shop.',
  recipient_suppressed:'The shop email is suppressed. Keep the suppression in place; ask the customer to choose another shop or use the shop’s listed phone/website.',
  notification_failed:'The shop notification failed. Check the delivery evidence before taking another action.',
  bounced:'The provider reported a bounced shop email. Review the recipient and contact the customer about the next step.',
  dropped:'The provider dropped the shop email. Review delivery and suppression evidence.',
  spam:'The shop reported the message as spam. Do not send a reminder or bypass its preference.',
  delivery_unconfirmed:'Delivery remains unconfirmed after ten minutes. Inspect the provider evidence; do not resend an accepted message blindly.',
};
const actor = 'Vicrez quote delivery monitor';

export async function queueQuoteDeliveryAlerts(db: Pool) {
  const recipients = [...new Set((process.env.DIRECTORY_STAFF_ALERT_EMAILS || '').split(',').map(x=>x.trim().toLowerCase()).filter(x=>/^[a-z0-9._%+-]+@vicrez\.com$/.test(x)))];
  let data: any;
  try {
    const response = await rfqFetch('/internal/directory-rfq/delivery-monitor', {});
    if (!response.ok) throw new Error('Monitor unavailable');
    data = await response.json();
    if (data.enabled === false) return {enabled:false,queued:0};
    if (data.enabled !== true || !Array.isArray(data.alerts)) throw new Error('Invalid monitor result');
  } catch { data={enabled:true,alerts:[],provider_evidence_ok:false,error:'monitor_unavailable'}; }
  const unique = new Map<string,any>();
  let invalid=false;
  for (const alert of data.alerts) {
    if (!alert || !Number.isSafeInteger(alert.submission_id) || alert.submission_id<1 || !UUID.test(alert.job_id || '') || !Object.prototype.hasOwnProperty.call(reasons,alert.reason)) {invalid=true;continue;}
    unique.set(`${alert.submission_id}:${alert.reason}`,alert);
  }
  const keys = [...unique].flatMap(([key])=>recipients.map(email=>`quote-delivery:${key}:${email}`));
  const existing = new Set<string>(keys.length ? (await db.query('SELECT event_key FROM directory_notifications WHERE event_key=ANY($1::text[])',[keys])).rows.map(r=>r.event_key) : []);
  let queued=0,handled=0;
  for (const [key,alert] of unique) {
    const missing = recipients.filter(email=>!existing.has(`quote-delivery:${key}:${email}`));
    if ((!missing.length && recipients.length) || handled>=50) continue;
    const reference=`VZ-${alert.submission_id}`, message=`${reference}: ${reasons[alert.reason]} No appointment is confirmed. Open https://installers.vicrez.com/admin/inquiries and search this reference.`;
    // Human follow-up and ownership always win over automation.
    await db.query(`INSERT INTO directory_inquiry_followup(submission_id,state,note,actor,next_followup_at,public_message)
      VALUES($1,'new',$2,$3,NOW(),$4) ON CONFLICT(submission_id) DO NOTHING`,
      [alert.submission_id,message,actor,'Your request is saved, but notification delivery needs review. No shop receipt or appointment is confirmed.']);
    await db.query(`INSERT INTO directory_action_assignments(task_key,kind,record_id,due_at,workflow,note,actor)
      VALUES($1,'inquiry',$2,NOW(),'open',$3,$4) ON CONFLICT(task_key) DO NOTHING`,
      [`inquiry:${alert.submission_id}`,String(alert.submission_id),message,actor]);
    for (const email of missing) {
      const result=await db.query(`INSERT INTO directory_notifications(event_key,kind,record_id,recipient,reference,outcome,public_message)
        VALUES($1,'staff',$2,$3,$4,'staff_alert',$5) ON CONFLICT(event_key) DO NOTHING RETURNING id`,
        [`quote-delivery:${key}:${email}`,String(alert.submission_id),email,reference,message]);
      queued+=result.rows.length;
    }
    handled++;
  }
  const ok=data.provider_evidence_ok===true && !data.limited && !invalid && recipients.length>0;
  if (!ok) {
    const hour=new Date().toISOString().slice(0,13);
    for (const email of recipients) {
      const result=await db.query(`INSERT INTO directory_notifications(event_key,kind,record_id,recipient,reference,outcome,public_message)
        VALUES($1,'staff',$2,$3,'QUOTE-DELIVERY-MONITOR','staff_alert',$4) ON CONFLICT(event_key) DO NOTHING RETURNING id`,
        [`quote-delivery:monitor:${hour}:${email}`,hour,email,'Quote delivery monitoring needs attention. Delivery evidence could not be fully checked; existing acceptance records were preserved. Review Operations.']);
      queued+=result.rows.length;
    }
  }
  await db.query(`INSERT INTO directory_operation_runs(name,ok,details) VALUES('quote-delivery', $1, $2)
    ON CONFLICT(name) DO UPDATE SET checked_at=NOW(),ok=EXCLUDED.ok,details=EXCLUDED.details`,
    [ok,JSON.stringify({checked:data.checked || 0,attention:unique.size,queued,recipients_configured:recipients.length>0,limited:!!data.limited})]);
  return {enabled:true,queued,attention:unique.size,ok};
}
