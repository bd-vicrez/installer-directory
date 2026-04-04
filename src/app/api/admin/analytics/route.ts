import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  const db = getPool();

  try {
    const [
      trafficStatsRes,
      eventTypeBreakdownRes,
      dailyEventsRes,
      uniqueVisitorsRes,
      topQueriesRes,
      topLocationsRes,
      topProfileViewsRes,
      topServicesRes,
      avgRatingRes,
      ratingDistRes,
      incompleteListingsRes,
      coverageGapsRes,
      topCitiesRes,
      staleListingsRes
    ] = await Promise.all([
      // Traffic stats
      db.query(`
        SELECT
          COUNT(*) as total_events,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as events_7d,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as events_30d
        FROM analytics_events
      `),
      
      // Event type breakdown
      db.query(`
        SELECT event, COUNT(*) as count
        FROM analytics_events
        GROUP BY event
        ORDER BY count DESC
      `),
      
      // Daily events for last 14 days
      db.query(`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM analytics_events
        WHERE created_at >= NOW() - INTERVAL '14 days'
        GROUP BY DATE(created_at)
        ORDER BY date
      `),
      
      // Unique visitors (approximate from distinct IPs in last 30 days)
      db.query(`
        SELECT COUNT(DISTINCT ip) as unique_visitors
        FROM analytics_events
        WHERE created_at >= NOW() - INTERVAL '30 days' AND ip IS NOT NULL AND ip != ''
      `),
      
      // Top 15 searched queries
      db.query(`
        SELECT query, COUNT(*) as count
        FROM analytics_events
        WHERE event = 'search' AND query IS NOT NULL AND query != ''
        GROUP BY query
        ORDER BY count DESC
        LIMIT 15
      `),
      
      // Top 15 searched locations
      db.query(`
        SELECT location, COUNT(*) as count
        FROM analytics_events
        WHERE event = 'search' AND location IS NOT NULL AND location != ''
        GROUP BY location
        ORDER BY count DESC
        LIMIT 15
      `),
      
      // Top 15 viewed installer profiles
      db.query(`
        SELECT installer, COUNT(*) as count
        FROM analytics_events
        WHERE event = 'profile_view' AND installer IS NOT NULL AND installer != ''
        GROUP BY installer
        ORDER BY count DESC
        LIMIT 15
      `),
      
      // Top services filtered
      db.query(`
        SELECT service, COUNT(*) as count
        FROM analytics_events
        WHERE event = 'filter' AND service IS NOT NULL AND service != ''
        GROUP BY service
        ORDER BY count DESC
        LIMIT 15
      `),
      
      // Average Google rating
      db.query(`
        SELECT AVG(google_rating) as avg_rating
        FROM installers
        WHERE google_rating IS NOT NULL AND status != 'removed'
      `),
      
      // Rating distribution
      db.query(`
        SELECT
          COUNT(*) FILTER (WHERE google_rating >= 4.5) as rating_45_plus,
          COUNT(*) FILTER (WHERE google_rating >= 4.0 AND google_rating < 4.5) as rating_40_45,
          COUNT(*) FILTER (WHERE google_rating >= 3.5 AND google_rating < 4.0) as rating_35_40,
          COUNT(*) FILTER (WHERE google_rating >= 3.0 AND google_rating < 3.5) as rating_30_35,
          COUNT(*) FILTER (WHERE google_rating < 3.0) as rating_below_30,
          COUNT(*) FILTER (WHERE google_rating IS NULL) as no_rating
        FROM installers
        WHERE status != 'removed'
      `),
      
      // Incomplete listings
      db.query(`
        SELECT
          COUNT(*) FILTER (WHERE phone IS NULL OR phone = '') as missing_phone,
          COUNT(*) FILTER (WHERE email IS NULL OR email = '') as missing_email,
          COUNT(*) FILTER (WHERE website IS NULL OR website = '') as missing_website
        FROM installers
        WHERE status != 'removed'
      `),
      
      // Coverage gaps: states with fewer than 5 installers
      db.query(`
        SELECT state, COUNT(*) as count
        FROM installers
        WHERE status != 'removed' AND state IS NOT NULL AND state != ''
        GROUP BY state
        HAVING COUNT(*) < 5
        ORDER BY count ASC, state
      `),
      
      // Top 20 metro cities by installer count
      db.query(`
        SELECT city, state, COUNT(*) as count
        FROM installers
        WHERE status != 'removed' AND city IS NOT NULL AND city != ''
        GROUP BY city, state
        ORDER BY count DESC
        LIMIT 20
      `),
      
      // Stale listings (older than 6 months or NULL date_added)
      db.query(`
        SELECT COUNT(*) as count
        FROM installers
        WHERE status != 'removed' AND (
          date_added IS NULL OR 
          date_added = '' OR 
          date_added::timestamp < NOW() - INTERVAL '6 months'
        )
      `)
    ]);

    const trafficStats = trafficStatsRes.rows[0];
    const uniqueVisitors = uniqueVisitorsRes.rows[0];
    const avgRating = avgRatingRes.rows[0];
    const ratingDist = ratingDistRes.rows[0];
    const incompleteListings = incompleteListingsRes.rows[0];
    const staleListings = staleListingsRes.rows[0];

    return NextResponse.json({
      // Traffic stats
      traffic: {
        totalEvents: parseInt(trafficStats.total_events),
        events7d: parseInt(trafficStats.events_7d),
        events30d: parseInt(trafficStats.events_30d),
        uniqueVisitors: parseInt(uniqueVisitors.unique_visitors),
        eventTypeBreakdown: eventTypeBreakdownRes.rows.map((r: any) => ({
          event: r.event,
          count: parseInt(r.count)
        })),
        dailyEvents: dailyEventsRes.rows.map((r: any) => ({
          date: r.date,
          count: parseInt(r.count)
        }))
      },
      
      // Search analytics
      search: {
        topQueries: topQueriesRes.rows.map((r: any) => ({
          query: r.query,
          count: parseInt(r.count)
        })),
        topLocations: topLocationsRes.rows.map((r: any) => ({
          location: r.location,
          count: parseInt(r.count)
        })),
        topProfileViews: topProfileViewsRes.rows.map((r: any) => ({
          installer: r.installer,
          count: parseInt(r.count)
        }))
      },
      
      // Filter analytics
      filter: {
        topServices: topServicesRes.rows.map((r: any) => ({
          service: r.service,
          count: parseInt(r.count)
        }))
      },
      
      // Directory health
      health: {
        avgRating: avgRating.avg_rating ? parseFloat(avgRating.avg_rating).toFixed(2) : null,
        ratingDistribution: {
          rating45Plus: parseInt(ratingDist.rating_45_plus),
          rating4045: parseInt(ratingDist.rating_40_45),
          rating3540: parseInt(ratingDist.rating_35_40),
          rating3035: parseInt(ratingDist.rating_30_35),
          ratingBelow30: parseInt(ratingDist.rating_below_30),
          noRating: parseInt(ratingDist.no_rating)
        },
        incompleteListings: {
          missingPhone: parseInt(incompleteListings.missing_phone),
          missingEmail: parseInt(incompleteListings.missing_email),
          missingWebsite: parseInt(incompleteListings.missing_website),
          total: parseInt(incompleteListings.missing_phone) + 
                 parseInt(incompleteListings.missing_email) + 
                 parseInt(incompleteListings.missing_website)
        },
        coverageGaps: coverageGapsRes.rows.map((r: any) => ({
          state: r.state,
          count: parseInt(r.count)
        })),
        topCities: topCitiesRes.rows.map((r: any) => ({
          city: r.city,
          state: r.state,
          count: parseInt(r.count)
        })),
        staleListings: parseInt(staleListings.count)
      }
    });
    
  } catch (err: any) {
    console.error('Analytics API error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}