import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { canReceiveQuote } from '@/lib/installer-contact';
import { quoteReceipt, validateQuoteInput } from '@/lib/quote-validation';
import { recordQuoteEvent, rfqFetch, sameOrigin, withinRateLimit } from '@/lib/directory-rfq';
export const maxDuration = 30;
const headers = { 'Cache-Control': 'no-store' };

export async function POST(request: NextRequest) {
  try {
    if (!sameOrigin(request)) return NextResponse.json({ error: 'Open the form on this site to continue.' }, { status: 403, headers });
    if (Number(request.headers.get('content-length') || 0) > 16384) return NextResponse.json({ error: 'Request is too large.' }, { status: 413, headers });
    const raw = await request.text();
    if (Buffer.byteLength(raw, 'utf8') > 16384) return NextResponse.json({ error: 'Request is too large.' }, { status: 413, headers });
    let body;
    try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400, headers }); }
    const invalid = validateQuoteInput(body);
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400, headers });
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    if (!await withinRateLimit(ip, 'quote-submit', 12, 900)) return NextResponse.json({ error: 'Too many attempts. Please wait before trying again.' }, { status: 429, headers: { ...headers, 'Retry-After': '900' } });
    let shopZip: string | undefined;
    if (body.installer_id) {
      const { rows } = await getPool().query(`SELECT status,routing_email,quote_routing_enabled,google_status,zip_code FROM installers WHERE id::text=$1 LIMIT 1`, [body.installer_id]);
      if (!rows[0] || !canReceiveQuote(rows[0])) return NextResponse.json({ error: 'This shop is not accepting requests through Vicrez. Use its phone or website, or choose another installer.', code: 'shop_unavailable' }, { status: 409, headers });
      shopZip = rows[0].zip_code;
    }
    // Destination addresses are resolved privately; never forward caller fields.
    const payload = {
      request_id: body.request_id, full_name: body.customer_name, email: body.customer_email,
      phone: body.customer_phone, vehicle_year: Number(body.vehicle_year), vehicle_make: body.vehicle_make,
      vehicle_model: body.vehicle_model, service: body.service, what_needed: body.what_needed,
      notes: body.additional_notes || '', zip_code: body.zip_code || shopZip || null,
      preferred_installer_id: body.installer_id || null, flow: body.installer_id ? 'selected' : 'network',
      sharing_consent: body.sharing_consent, consent_version: 'directory-quote-2026-09-15',
      install_timeline: body.install_timeline || '', budget_range: body.budget_range || '',
    };
    const response = await rfqFetch('/webhook/rfq/directory', payload);
    if (response.status === 400 || response.status === 422) return NextResponse.json({ error: 'Check your contact, vehicle, service and sharing details before trying again.' }, { status: 400, headers });
    if (response.status === 409) return NextResponse.json({ error: 'This reference already belongs to a different request. Keep your previous receipt and start a new request for changed details.', code: 'request_changed' }, { status: 409, headers });
    if (!response.ok) throw new Error('Receipt unavailable');
    const saved = await response.json();
    const receipt = quoteReceipt(saved);
    await recordQuoteEvent('quote_received', { id: `directory-quote-${saved.submission_id}`, flow: payload.flow, service: body.service, session_id: body.session_id });
    return NextResponse.json(receipt, { headers });
  } catch {
    console.error('Quote receipt could not be confirmed');
    return NextResponse.json({ error: 'We could not confirm your request. Keep the form open and retry the same details; a retry will not create a second request.', code: 'unconfirmed' }, { status: 503, headers });
  }
}
