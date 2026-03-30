'use client';

import { useState, useEffect } from 'react';

interface Stats {
  total: number;
  verified: number;
  listed: number;
  removed: number;
  states: number;
  addedThisWeek: number;
  addedThisMonth: number;
  topStates: { state: string; count: number }[];
  topCapabilities: { name: string; count: number }[];
  recentAdditions: { id: number; business_name: string; city: string; state: string; date_added: string; status: string }[];
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load stats');
        return res.json();
      })
      .then((data) => {
        setStats(data);
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

  if (error || !stats) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400">{error || 'Failed to load stats'}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: '#ffffff' }}>Dashboard</h1>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard label="Total Installers" value={stats.total} color="#ffffff" />
        <StatCard label="Verified" value={stats.verified} color="#4ade80" />
        <StatCard label="Listed" value={stats.listed} color="#9ca3af" />
        <StatCard label="Removed" value={stats.removed} color="#f87171" />
        <StatCard label="Added This Week" value={stats.addedThisWeek} color="#60a5fa" />
        <StatCard label="Added This Month" value={stats.addedThisMonth} color="#a78bfa" />
      </div>

      {/* Two-column charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top States */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-base font-semibold mb-4" style={{ color: '#ffffff' }}>Top States</h2>
          <div className="space-y-2.5">
            {stats.topStates.map((item) => {
              const maxCount = stats.topStates[0]?.count || 1;
              const pct = (item.count / maxCount) * 100;
              return (
                <div key={item.state} className="flex items-center gap-3">
                  <span className="w-8 text-sm text-gray-500 flex-shrink-0 font-mono">{item.state}</span>
                  <div className="flex-1 bg-gray-800 rounded-full h-5 overflow-hidden">
                    <div
                      className="bg-vicrez-red h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-400 w-14 text-right flex-shrink-0 font-mono">{item.count.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Capabilities */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-base font-semibold mb-4" style={{ color: '#ffffff' }}>Top Capabilities</h2>
          <div className="space-y-2.5">
            {stats.topCapabilities.map((cap) => {
              const maxCap = stats.topCapabilities[0]?.count || 1;
              const pct = (cap.count / maxCap) * 100;
              return (
                <div key={cap.name} className="flex items-center gap-3">
                  <span className="w-36 text-sm text-gray-500 flex-shrink-0 truncate" title={cap.name}>{cap.name}</span>
                  <div className="flex-1 bg-gray-800 rounded-full h-5 overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-400 w-14 text-right flex-shrink-0 font-mono">{cap.count.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Additions */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-base font-semibold mb-4" style={{ color: '#ffffff' }}>Recent Additions</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left">
                <th className="py-2.5 px-3 text-gray-500 font-medium">Business Name</th>
                <th className="py-2.5 px-3 text-gray-500 font-medium">Location</th>
                <th className="py-2.5 px-3 text-gray-500 font-medium">Date Added</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentAdditions.map((inst) => (
                <tr key={inst.id} className="border-b border-gray-800/50">
                  <td className="py-2.5 px-3 font-medium" style={{ color: '#e5e7eb' }}>{inst.business_name}</td>
                  <td className="py-2.5 px-3 text-gray-500">{inst.city}, {inst.state}</td>
                  <td className="py-2.5 px-3 text-gray-500">
                    {inst.date_added ? new Date(inst.date_added).toLocaleDateString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="text-2xl font-bold font-mono" style={{ color }}>{value.toLocaleString()}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}
