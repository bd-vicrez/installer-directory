import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  const db = getPool();

  try {
  const [countsRes, statesRes, capsRes, recentRes, weekRes, monthRes] = await Promise.all([
    // Total, verified, listed, removed counts
    db.query(`
      SELECT
        COUNT(*) FILTER (WHERE status != 'removed') as total,
        COUNT(*) FILTER (WHERE status = 'removed') as removed,
        COUNT(*) FILTER (WHERE status != 'removed' AND (
          source ILIKE '%[New Dealer Form]%'
          OR source ILIKE '%[CS Sheet]%'
          OR source ILIKE '%[Vicrez Business Network]%'
          OR source ILIKE '%Alex Cold Call%'
          OR source ILIKE '%manual%'
        )) as verified,
        COUNT(DISTINCT state) FILTER (WHERE status != 'removed') as states
      FROM installers
    `),
    // Top states
    db.query(`
      SELECT state, COUNT(*) as count
      FROM installers
      WHERE status != 'removed' AND state IS NOT NULL AND state != ''
      GROUP BY state
      ORDER BY count DESC
      LIMIT 15
    `),
    // Top capabilities (parse comma-separated field, handle NULLs)
    db.query(`
      SELECT LOWER(TRIM(cap)) as name, COUNT(*) as count
      FROM installers,
      LATERAL unnest(
        CASE
          WHEN install_capabilities IS NULL OR install_capabilities::text = '' THEN ARRAY[]::text[]
          ELSE string_to_array(install_capabilities::text, ',')
        END
      ) AS cap
      WHERE status != 'removed' AND TRIM(cap) != ''
      GROUP BY LOWER(TRIM(cap))
      ORDER BY count DESC
      LIMIT 15
    `),
    // Recent additions
    db.query(`
      SELECT id, business_name, city, state, date_added, status
      FROM installers
      WHERE status != 'removed'
      ORDER BY date_added DESC NULLS LAST
      LIMIT 10
    `),
    // Added this week
    db.query(`
      SELECT COUNT(*) as count
      FROM installers
      WHERE status != 'removed' AND date_added IS NOT NULL AND date_added != '' AND date_added::timestamp >= NOW() - INTERVAL '7 days'
    `),
    // Added this month
    db.query(`
      SELECT COUNT(*) as count
      FROM installers
      WHERE status != 'removed' AND date_added IS NOT NULL AND date_added != '' AND date_added::timestamp >= NOW() - INTERVAL '30 days'
    `),
  ]);

  const counts = countsRes.rows[0];
  const listed = parseInt(counts.total) - parseInt(counts.verified);

  return NextResponse.json({
    total: parseInt(counts.total),
    verified: parseInt(counts.verified),
    listed,
    removed: parseInt(counts.removed),
    states: parseInt(counts.states),
    addedThisWeek: parseInt(weekRes.rows[0].count),
    addedThisMonth: parseInt(monthRes.rows[0].count),
    topStates: statesRes.rows.map((r: any) => ({ state: r.state, count: parseInt(r.count) })),
    topCapabilities: capsRes.rows.map((r: any) => ({ name: r.name, count: parseInt(r.count) })),
    recentAdditions: recentRes.rows,
  });
  } catch (err: any) {
    console.error('Admin stats error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
