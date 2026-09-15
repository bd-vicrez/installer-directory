import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

const MAX_AGE_MS = 24 * 60 * 60 * 1000;
export function generateToken(): string {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || secret.length < 32) throw new Error('Admin authentication is not configured');
  const payload = Buffer.from(JSON.stringify({ user: process.env.ADMIN_USERNAME || 'admin', exp: Date.now() + MAX_AGE_MS })).toString('base64url');
  return payload + '.' + createHmac('sha256', secret).update(payload).digest('base64url');
}
export function verifyAdminToken(token: string): boolean {
  try {
    const secret = process.env.ADMIN_SECRET;
    if (!secret || secret.length < 32 || token.length > 1024) return false;
    const parts = token.split('.');
    if (parts.length !== 2) return false;
    const signature = Buffer.from(parts[1], 'base64url');
    const expected = createHmac('sha256', secret).update(parts[0]).digest();
    if (signature.length !== expected.length || !timingSafeEqual(signature, expected)) return false;
    const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    return payload.user === (process.env.ADMIN_USERNAME || 'admin') && Number.isFinite(payload.exp) && payload.exp > Date.now() && payload.exp <= Date.now() + MAX_AGE_MS;
  } catch { return false; }
}
export const verifyToken = verifyAdminToken;
export function requireAdmin(request: NextRequest): NextResponse | null {
  const token = request.cookies.get('admin_token')?.value;
  return token && verifyAdminToken(token) ? null : NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
}
