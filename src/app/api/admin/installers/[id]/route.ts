import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const db = getPool();
    const id = params.id;

    const fields: string[] = [];
    const values: any[] = [];
    let paramIdx = 1;

    const allowedFields = [
      'business_name', 'street_address', 'city', 'state', 'zip_code',
      'phone', 'email', 'website', 'install_capabilities', 'shop_type',
      'specialize_in', 'source', 'status',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        fields.push(`${field} = $${paramIdx}`);
        values.push(body[field]);
        paramIdx++;
      }
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(id);
    const result = await db.query(
      `UPDATE installers SET ${fields.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Installer not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update installer' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  try {
    const db = getPool();
    const result = await db.query(
      `UPDATE installers SET status = 'removed' WHERE id = $1 RETURNING id, business_name`,
      [params.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Installer not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, ...result.rows[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to remove installer' }, { status: 500 });
  }
}
