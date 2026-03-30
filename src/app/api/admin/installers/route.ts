import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const state = searchParams.get('state') || '';
  const status = searchParams.get('status') || '';
  const page = parseInt(searchParams.get('page') || '0');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = page * limit;

  const db = getPool();
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIdx = 1;

  if (search) {
    conditions.push(`(business_name ILIKE $${paramIdx} OR city ILIKE $${paramIdx} OR state ILIKE $${paramIdx} OR email ILIKE $${paramIdx})`);
    params.push(`%${search}%`);
    paramIdx++;
  }

  if (state) {
    conditions.push(`state = $${paramIdx}`);
    params.push(state);
    paramIdx++;
  }

  if (status) {
    conditions.push(`status = $${paramIdx}`);
    params.push(status);
    paramIdx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total count
  const countResult = await db.query(
    `SELECT COUNT(*) as total FROM installers ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].total);

  // Get paginated results
  const dataResult = await db.query(
    `SELECT * FROM installers ${whereClause} ORDER BY id DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
    [...params, limit, offset]
  );

  return NextResponse.json({
    installers: dataResult.rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const db = getPool();

    const {
      business_name, street_address, city, state, zip_code,
      phone, email, website, install_capabilities, shop_type,
      specialize_in, source, status
    } = body;

    if (!business_name || !city || !state) {
      return NextResponse.json(
        { error: 'business_name, city, and state are required' },
        { status: 400 }
      );
    }

    // Generate slug
    const slug = `${business_name}-${city}-${state}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const result = await db.query(
      `INSERT INTO installers (
        business_name, street_address, city, state, zip_code,
        phone, email, website, install_capabilities, shop_type,
        specialize_in, source, status, slug, date_added
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
      RETURNING *`,
      [
        business_name, street_address || '', city, state, zip_code || '',
        phone || '', email || '', website || '', install_capabilities || '',
        shop_type || '', specialize_in || '', source || 'manual',
        status || 'active', slug
      ]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create installer' }, { status: 500 });
  }
}
