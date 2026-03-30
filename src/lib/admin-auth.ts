import { NextRequest, NextResponse } from 'next/server';

const TOKEN_SECRET = 'vicrez-admin-secret-2026';
const ADMIN_USER = 'admin';

export function generateToken(): string {
  const payload = `${ADMIN_USER}:${Date.now()}:${TOKEN_SECRET}`;
  return Buffer.from(payload).toString('base64');
}

export function verifyToken(token: string): boolean {
  return verifyAdminToken(token);
}

export function verifyAdminToken(token: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    return decoded.startsWith(`${ADMIN_USER}:`) && decoded.endsWith(`:${TOKEN_SECRET}`);
  } catch {
    return false;
  }
}

export function requireAdmin(request: NextRequest): NextResponse | null {
  const token = request.cookies.get('admin_token')?.value;
  if (!token || !verifyAdminToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}
