import { NextRequest, NextResponse } from 'next/server';
import { rfqFetch, sameOrigin } from '@/lib/directory-rfq';
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  const headers = { 'Cache-Control': 'private, no-store' };
  try {
    if (!sameOrigin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403, headers });
    const raw = await request.text();
    if (raw.length > 1024) return NextResponse.json({ error: 'Invalid receipt' }, { status: 400, headers });
    const body = JSON.parse(raw);
    if (typeof body.token !== 'string' || body.token.length > 512) return NextResponse.json({ error: 'Invalid receipt' }, { status: 400, headers });
    const response = await rfqFetch('/webhook/rfq/directory/status', { token: body.token });
    if (!response.ok) return NextResponse.json({ error: 'Receipt status unavailable' }, { status: response.status === 401 ? 401 : 503, headers });
    const data = await response.json();
    return NextResponse.json({ reference: data.reference, status: data.status, message: data.message }, { headers });
  } catch { return NextResponse.json({ error: 'Receipt status temporarily unavailable' }, { status: 503, headers }); }
}
