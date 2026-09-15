import { createHmac } from 'node:crypto';
import { getPool } from './db';
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function rfqConfig() {
  const secret = process.env.DIRECTORY_RFQ_SECRET;
  const base = process.env.DIRECTORY_RFQ_BASE_URL || 'https://ai.vicrez.com';
  if (!secret || secret.length < 32 || !/^https:\/\//.test(base)) throw new Error('Inquiry service unavailable');
  return { secret, base: base.replace(/\/$/, '') };
}
export async function rfqFetch(path: string, body?: unknown) {
  const { secret, base } = rfqConfig();
  return fetch(base + path, { method: body === undefined ? 'GET' : 'POST', headers: { Authorization: 'Bearer ' + secret, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store', signal: AbortSignal.timeout(20000) });
}
export async function withinRateLimit(ip: string, scope: string, limit: number, seconds: number): Promise<boolean> {
  const { secret } = rfqConfig();
  const key = createHmac('sha256', secret).update(scope + ':' + ip).digest('hex');
  const { rows } = await getPool().query(`INSERT INTO directory_rate_limits(key,count,expires_at)
    VALUES ($1,1,NOW()+$2*INTERVAL '1 second') ON CONFLICT(key) DO UPDATE SET
    count=CASE WHEN directory_rate_limits.expires_at<=NOW() THEN 1 ELSE directory_rate_limits.count+1 END,
    expires_at=CASE WHEN directory_rate_limits.expires_at<=NOW() THEN EXCLUDED.expires_at ELSE directory_rate_limits.expires_at END RETURNING count`, [key, seconds]);
  return rows[0].count <= limit;
}
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}
export async function recordQuoteEvent(event: string, data: { id: string; flow: string; session_id?: string; service?: string }) {
  try {
    const query = {text:`INSERT INTO analytics_events(id,event,page,service,session_id,flow,created_at) VALUES($1,$2,'quote',$3,$4,$5,NOW()) ON CONFLICT(id) DO NOTHING`,
      values:[data.id, event, data.service || '', UUID.test(data.session_id || '') ? data.session_id : null, data.flow], query_timeout:2000};
    await getPool().query(query);
  } catch { console.error('Quote measurement temporarily unavailable'); }
}
