import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { rfqFetch } from '@/lib/directory-rfq';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;
  const headers = { 'Cache-Control':'private, no-store' };
  try {
    const response = await rfqFetch('/internal/directory-rfq/requests');
    if (!response.ok) throw new Error();
    return NextResponse.json(await response.json(),{headers});
  } catch { return NextResponse.json({error:'Inquiry status is temporarily unavailable.'},{status:503,headers}); }
}
