import { createHash, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const expected = process.env.INSTALLER_FEED_TOKEN;
  const supplied = request.headers.get('authorization')?.replace(/^Bearer /, '') || '';
  if (!expected || expected.length < 32 || !timingSafeEqual(createHash('sha256').update(expected).digest(), createHash('sha256').update(supplied).digest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }
  try {
    const { rows } = await getPool().query("SELECT * FROM installers WHERE status != 'removed' ORDER BY id");
    return NextResponse.json(rows, { headers: { 'Cache-Control': 'private, no-store', 'Vary': 'Authorization' } });
  } catch {
    return NextResponse.json({ error: 'Feed temporarily unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
