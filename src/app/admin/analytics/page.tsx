'use client';

import { useState, useEffect } from 'react';

interface AnalyticsData {
  traffic: {
    totalEvents: number;
    events7d: number;
    events30d: number;
    uniqueVisitors: number;
    eventTypeBreakdown: { event: string; count: number }[];
    dailyEvents: { date: string; count: number }[];
  };
  search: {
    topQueries: { query: string; count: number }[];
    topLocations: { location: string; count: number }[];
    topProfileViews: { installer: string; count: number }[];
  };
  filter: {
    topServices: { service: string; count: number }[];
  };
  health: {
    avgRating: string | null;
    ratingDistribution: {
      rating45Plus: number;
      rating4045: number;
      rating3540: number;
      rating3035: number;
      ratingBelow30: number;
      noRating: number;
    };
    incompleteListings: {
      missingPhone: number;
      missingEmail: number;
      missingWebsite: number;
      total: number;
    };
    coverageGaps: { state: string; count: number }[];
    topCities: { city: string; state: string; count: number }[];
    staleListings: number;
  };
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load analytics');
        return res.json();
      })
      .then((analyticsData) => {
        setData(analyticsData);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <svg className="animate-spin h-10 w-10 text-vicrez-red" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400">{error || 'Failed to load analytics'}</p>
      </div>
    );
  }

  const { traffic, search, health } = data;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: '#ffffff' }}>Analytics</h1>

      {/* Section 1: Traffic Overview */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold" style={{ color: '#ffffff' }}>Traffic Overview</h2>
        
        {/* Traffic Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Events" value={traffic.totalEvents} color="#ffffff" />
          <StatCard label="Last 7 Days" value={traffic.events7d} color="#60a5fa" />
          <StatCard label="Last 30 Days" value={traffic.events30d} color="#a78bfa" />
          <StatCard label="Unique Visitors" value={traffic.uniqueVisitors} color="#4ade80" />
        </div>

        {/* Event Type Breakdown */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-base font-semibold mb-4" style={{ color: '#ffffff' }}>Event Types</h3>
          <div className="space-y-2.5">
            {traffic.eventTypeBreakdown.map((item) => {
              const maxCount = traffic.eventTypeBreakdown[0]?.count || 1;
              const pct = (item.count / maxCount) * 100;
              const colorMap: { [key: string]: string } = {
                'page_view': '#60a5fa',
                'search': '#4ade80',
                'profile_view': '#f59e0b',
                'filter': '#a78bfa'
              };
              return (
                <div key={item.event} className="flex items-center gap-3">
                  <span className="w-24 text-sm text-gray-500 flex-shrink-0 capitalize">{item.event.replace('_', ' ')}</span>
                  <div className="flex-1 bg-gray-800 rounded-full h-5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: colorMap[item.event] || '#6b7280' }}
                    />
                  </div>
                  <span className="text-sm text-gray-400 w-16 text-right flex-shrink-0 font-mono">{item.count.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Section 2: Search Intelligence */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold" style={{ color: '#ffffff' }}>Search Intelligence</h2>
        
        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Searches */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-base font-semibold mb-4" style={{ color: '#ffffff' }}>Top Searches</h3>
            <div className="space-y-2.5">
              {search.topQueries.slice(0, 10).map((item) => {
                const maxCount = search.topQueries[0]?.count || 1;
                const pct = (item.count / maxCount) * 100;
                return (
                  <div key={item.query} className="flex items-center gap-3">
                    <span className="w-32 text-sm text-gray-500 flex-shrink-0 truncate" title={item.query}>{item.query}</span>
                    <div className="flex-1 bg-gray-800 rounded-full h-4 overflow-hidden">
                      <div
                        className="bg-blue-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-400 w-10 text-right flex-shrink-0 font-mono">{item.count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Locations Searched */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-base font-semibold mb-4" style={{ color: '#ffffff' }}>Top Locations Searched</h3>
            <div className="space-y-2.5">
              {search.topLocations.slice(0, 10).map((item) => {
                const maxCount = search.topLocations[0]?.count || 1;
                const pct = (item.count / maxCount) * 100;
                return (
                  <div key={item.location} className="flex items-center gap-3">
                    <span className="w-32 text-sm text-gray-500 flex-shrink-0 truncate" title={item.location}>{item.location}</span>
                    <div className="flex-1 bg-gray-800 rounded-full h-4 overflow-hidden">
                      <div
                        className="bg-green-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-400 w-10 text-right flex-shrink-0 font-mono">{item.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Most Viewed Profiles */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-base font-semibold mb-4" style={{ color: '#ffffff' }}>Most Viewed Profiles</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left">
                  <th className="py-2.5 px-3 text-gray-500 font-medium">Installer</th>
                  <th className="py-2.5 px-3 text-gray-500 font-medium text-right">Views</th>
                </tr>
              </thead>
              <tbody>
                {search.topProfileViews.slice(0, 10).map((inst) => (
                  <tr key={inst.installer} className="border-b border-gray-800/50">
                    <td className="py-2.5 px-3 font-medium" style={{ color: '#e5e7eb' }}>{inst.installer}</td>
                    <td className="py-2.5 px-3 text-gray-400 text-right font-mono">{inst.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Section 3: Directory Health */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold" style={{ color: '#ffffff' }}>Directory Health</h2>
        
        {/* Health Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard 
            label="Avg Google Rating" 
            value={health.avgRating ? `${health.avgRating}★` : 'N/A'} 
            color="#f59e0b" 
            isText={true}
          />
          <StatCard 
            label="Listings with Rating" 
            value={
              health.ratingDistribution.rating45Plus + 
              health.ratingDistribution.rating4045 + 
              health.ratingDistribution.rating3540 + 
              health.ratingDistribution.rating3035 + 
              health.ratingDistribution.ratingBelow30
            } 
            color="#4ade80" 
          />
          <StatCard label="Incomplete Listings" value={health.incompleteListings.total} color="#f87171" />
          <StatCard label="Stale Listings" value={health.staleListings} color="#f59e0b" />
        </div>

        {/* Rating Distribution */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-base font-semibold mb-4" style={{ color: '#ffffff' }}>Rating Distribution</h3>
          <div className="space-y-2.5">
            {[
              { label: '4.5+ Stars', count: health.ratingDistribution.rating45Plus, color: '#22c55e' },
              { label: '4.0-4.5 Stars', count: health.ratingDistribution.rating4045, color: '#84cc16' },
              { label: '3.5-4.0 Stars', count: health.ratingDistribution.rating3540, color: '#eab308' },
              { label: '3.0-3.5 Stars', count: health.ratingDistribution.rating3035, color: '#f97316' },
              { label: 'Below 3.0', count: health.ratingDistribution.ratingBelow30, color: '#ef4444' },
              { label: 'No Rating', count: health.ratingDistribution.noRating, color: '#6b7280' }
            ].map((item) => {
              const totalWithRatings = Object.values(health.ratingDistribution).reduce((sum, val) => sum + val, 0);
              const pct = totalWithRatings > 0 ? (item.count / totalWithRatings) * 100 : 0;
              return (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="w-28 text-sm text-gray-500 flex-shrink-0">{item.label}</span>
                  <div className="flex-1 bg-gray-800 rounded-full h-5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: item.color }}
                    />
                  </div>
                  <span className="text-sm text-gray-400 w-16 text-right flex-shrink-0 font-mono">{item.count.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Coverage Gaps & Incomplete Listings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Coverage Gaps */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-base font-semibold mb-4" style={{ color: '#ffffff' }}>Coverage Gaps ({"<"}5 installers)</h3>
            {health.coverageGaps.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-left">
                      <th className="py-2.5 px-3 text-gray-500 font-medium">State</th>
                      <th className="py-2.5 px-3 text-gray-500 font-medium text-right">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {health.coverageGaps.map((gap) => (
                      <tr key={gap.state} className="border-b border-gray-800/50">
                        <td className="py-2.5 px-3 font-medium" style={{ color: '#e5e7eb' }}>{gap.state}</td>
                        <td className="py-2.5 px-3 text-gray-400 text-right font-mono">{gap.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">No coverage gaps found</p>
            )}
          </div>

          {/* Incomplete Listings Breakdown */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-base font-semibold mb-4" style={{ color: '#ffffff' }}>Incomplete Listings Breakdown</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Missing Phone</span>
                <span className="text-sm text-gray-400 font-mono">{health.incompleteListings.missingPhone.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Missing Email</span>
                <span className="text-sm text-gray-400 font-mono">{health.incompleteListings.missingEmail.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Missing Website</span>
                <span className="text-sm text-gray-400 font-mono">{health.incompleteListings.missingWebsite.toLocaleString()}</span>
              </div>
              <div className="border-t border-gray-800 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium" style={{ color: '#e5e7eb' }}>Total Incomplete</span>
                  <span className="text-sm text-red-400 font-mono font-bold">{health.incompleteListings.total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: Top Cities */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4" style={{ color: '#ffffff' }}>Top Cities by Installer Count</h2>
        <div className="space-y-2.5">
          {health.topCities.map((city) => {
            const maxCount = health.topCities[0]?.count || 1;
            const pct = (city.count / maxCount) * 100;
            return (
              <div key={`${city.city}-${city.state}`} className="flex items-center gap-3">
                <span className="w-40 text-sm text-gray-500 flex-shrink-0 truncate" title={`${city.city}, ${city.state}`}>
                  {city.city}, {city.state}
                </span>
                <div className="flex-1 bg-gray-800 rounded-full h-5 overflow-hidden">
                  <div
                    className="bg-vicrez-red h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-sm text-gray-400 w-14 text-right flex-shrink-0 font-mono">{city.count.toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCard({ 
  label, 
  value, 
  color,
  isText = false 
}: { 
  label: string; 
  value: number | string; 
  color: string;
  isText?: boolean;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div 
        className={`text-2xl font-bold ${isText ? '' : 'font-mono'}`} 
        style={{ color }}
      >
        {isText ? value : typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}