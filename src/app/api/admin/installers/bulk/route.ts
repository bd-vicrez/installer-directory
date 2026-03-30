import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export async function PUT(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  try {
    const { ids, updates } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array is required' }, { status: 400 });
    }

    const db = getPool();
    const fields: string[] = [];
    const values: any[] = [];
    let paramIdx = 1;

    const allowedFields = ['status', 'install_capabilities'];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        fields.push(`${field} = $${paramIdx}`);
        values.push(updates[field]);
        paramIdx++;
      }
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Create placeholders for the IDs
    const idPlaceholders = ids.map((_: any, i: number) => `$${paramIdx + i}`).join(', ');
    values.push(...ids);

    const result = await db.query(
      `UPDATE installers SET ${fields.join(', ')} WHERE id IN (${idPlaceholders}) RETURNING id`,
      values
    );

    return NextResponse.json({
      success: true,
      updated: result.rowCount,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Bulk update failed' }, { status: 500 });
  }
}
