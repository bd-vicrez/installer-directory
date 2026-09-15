import { NextRequest, NextResponse } from 'next/server';
import { UUID, recordQuoteEvent, sameOrigin, withinRateLimit } from '@/lib/directory-rfq';
import { isQuoteService } from '@/lib/quote-services';
export async function POST(request: NextRequest) {
  const headers = { 'Cache-Control': 'no-store' };
  try {
    if (!sameOrigin(request)) return new NextResponse(null, { status: 403, headers });
    const raw = await request.text();
    if (raw.length > 1024) return new NextResponse(null, { status: 413, headers });
    const data = JSON.parse(raw);
    if (!['quote_open', 'quote_attempt', 'quote_error'].includes(data.event) || !UUID.test(data.id || '') || !UUID.test(data.session_id || '') || !['selected', 'network'].includes(data.flow) || (data.service && !isQuoteService(data.service))) return new NextResponse(null, { status: 400, headers });
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    if (!await withinRateLimit(ip, 'quote-events', 120, 900)) return new NextResponse(null, { status: 429, headers });
    await recordQuoteEvent(data.event, { id: data.id, flow: data.flow, service: data.service, session_id: data.session_id });
    return new NextResponse(null, { status: 204, headers });
  } catch { return new NextResponse(null, { status: 503, headers }); }
}
