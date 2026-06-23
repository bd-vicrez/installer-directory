import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';
import { randomUUID } from 'crypto';

// Coerce install_capabilities to a plain JS array no matter how it was stored.
// Postgres TEXT[] columns return JS arrays directly; jsonb returns parsed objects;
// occasionally legacy rows are stored as JSON-strings or comma-separated strings.
function toCapArray(v: unknown): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s) return [];
    if (s.startsWith('[')) { try { const j = JSON.parse(s); return Array.isArray(j) ? j.map(String).filter(Boolean) : [s]; } catch { /* fall through */ } }
    if (s.startsWith('{') && s.endsWith('}')) { // pg array literal e.g. {"a","b"}
      return s.slice(1, -1).split(',').map(p => p.replace(/^"|"$/g, '').trim()).filter(Boolean);
    }
    return s.split(',').map(p => p.trim()).filter(Boolean);
  }
  return [];
}

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

      // Normalize install_capabilities into a plain JS array (handles TEXT[], jsonb, string, null)
      const capabilities = toCapArray(app.install_capabilities);
      const specializeIn = capabilities.join(', ');

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
        capabilities,           // plain JS array -> Postgres TEXT[]
        'Auto Shop',
        specializeIn,
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

  } catch (error: any) {
    // Expose the real error so we can debug from the client. Postgres errors come back
    // with .message, .code, .detail, .constraint — surface them all.
    console.error('Update application error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error?.message || String(error),
      code: error?.code,
      detail: error?.detail,
      constraint: error?.constraint,
      table: error?.table,
      column: error?.column,
    }, { status: 500 });
  }
}
