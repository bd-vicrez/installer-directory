import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';
import { randomUUID } from 'crypto';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  // Admin only
  const authError = requireAdmin(request);
  if (authError) return authError;

  try {
    const { id } = params;
    const body = await request.json();
    const { status, rejection_reason } = body;

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const db = getPool();

    if (status === 'approved') {
      // Get application data from applications table
      const { rows: applications } = await db.query(
        'SELECT * FROM applications WHERE id = $1',
        [id]
      );

      if (applications.length === 0) {
        return NextResponse.json({ error: 'Application not found' }, { status: 404 });
      }

      const app = applications[0];

      // Generate slug from business_name + city + state
      const slug = `${app.business_name}-${app.city}-${app.state}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      // Generate unique ID for installers table
      const installerId = randomUUID();

      // Get next legacy_id (sequential integer, NOT NULL constraint)
      const { rows: maxRows } = await db.query(
        `SELECT MAX(CAST(legacy_id AS INTEGER)) as max_id FROM installers WHERE legacy_id ~ '^[0-9]+$'`
      );
      const nextLegacyId = String((maxRows[0]?.max_id || 0) + 1);

      // Copy to installers table with correct column mappings
      const insertQuery = `
        INSERT INTO installers (
          id, legacy_id, business_name, slug, street_address, city, state, zip_code, phone, email,
          website, install_capabilities, shop_type, specialize_in, source, status, date_added, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW()
        ) RETURNING id
      `;

      const { rows: newInstaller } = await db.query(insertQuery, [
        installerId,
        nextLegacyId,
        app.business_name,
        slug,
        app.street_address,
        app.city,
        app.state,
        app.zip_code,
        app.phone,
        app.email,
        app.website,
        app.install_capabilities,
        'Auto Shop',
        app.install_capabilities ? app.install_capabilities.join(', ') : '',
        '[Installer Application]',
        'active'
      ]);

      // Update applications row: status='approved', reviewed_at=NOW()
      await db.query(
        'UPDATE applications SET status = $1, reviewed_at = NOW() WHERE id = $2',
        ['approved', id]
      );

      return NextResponse.json({
        success: true,
        installer_id: newInstaller[0].id,
        message: 'Application approved and installer created'
      });

    } else if (status === 'rejected') {
      // Update applications row: status='rejected', rejection_reason, reviewed_at=NOW()
      await db.query(
        'UPDATE applications SET status = $1, rejection_reason = $2, reviewed_at = NOW() WHERE id = $3',
        ['rejected', rejection_reason || null, id]
      );

      return NextResponse.json({
        success: true,
        message: 'Application rejected'
      });
    }

  } catch (error) {
    console.error('Update application error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
