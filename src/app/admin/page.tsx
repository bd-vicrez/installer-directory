'use client';

import { useState, useEffect, useMemo } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Installer } from '@/lib/types';
import { getTier, parseCapabilities, formatPhone } from '@/lib/utils';

interface Stats {
  total: number;
  verified: number;
  listed: number;
  states: number;
  stateBreakdown: Record<string, number>;
  topCapabilities: { name: string; count: number }[];
}

export default function AdminPage() {
  const [installers, setInstallers] = useState<Installer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [selectedInstaller, setSelectedInstaller] = useState<Installer | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  useEffect(() => {
    fetch('/api/installers')
      .then((res) => res.json())
      .then((data: Installer[]) => {
        setInstallers(data.filter((i) => i.status !== 'removed'));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const stats: Stats = useMemo(() => {
    const stateBreakdown: Record<string, number> = {};
    const capCount: Record<string, number> = {};
    let verified = 0;
    let listed = 0;

    for (const inst of installers) {
      const tier = getTier(inst.source);
      if (tier === 'verified') verified++;
      else listed++;

      if (inst.state) {
        stateBreakdown[inst.state] = (stateBreakdown[inst.state] || 0) + 1;
      }

      const caps = parseCapabilities(inst.install_capabilities);
      for (const cap of caps) {
        const normalized = cap.toLowerCase().trim();
        if (normalized) {
          capCount[normalized] = (capCount[normalized] || 0) + 1;
        }
      }
    }

    const topCapabilities = Object.entries(capCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15)
      .map(([name, count]) => ({ name, count }));

    return {
      total: installers.length,
      verified,
      listed,
      states: Object.keys(stateBreakdown).length,
      stateBreakdown,
      topCapabilities,
    };
  }, [installers]);

  const filteredInstallers = useMemo(() => {
    let results = installers;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      results = results.filter(
        (i) =>
          i.business_name?.toLowerCase().includes(q) ||
          i.city?.toLowerCase().includes(q) ||
          i.state?.toLowerCase().includes(q)
      );
    }
    if (stateFilter) {
      results = results.filter((i) => i.state === stateFilter);
    }
    return results;
  }, [installers, searchQuery, stateFilter]);

  const paginatedInstallers = filteredInstallers.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE
  );
  const totalPages = Math.ceil(filteredInstallers.length / PAGE_SIZE);

  const allStates = useMemo(() => {
    const s = new Set(installers.map((i) => i.state).filter(Boolean));
    return Array.from(s).sort();
  }, [installers]);

  if (loading) {
    return (
      <>
        <Header />
        <main className="flex-1 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <svg className="animate-spin h-10 w-10 mx-auto text-vicrez-red mb-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-vicrez-muted">Loading installer data...</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-white mb-8">Admin Dashboard</h1>

          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="card p-5">
              <div className="text-2xl font-bold text-white">{stats.total.toLocaleString()}</div>
              <div className="text-sm text-vicrez-muted">Total Installers</div>
            </div>
            <div className="card p-5">
              <div className="text-2xl font-bold text-green-400">{stats.verified.toLocaleString()}</div>
              <div className="text-sm text-vicrez-muted">Verified</div>
            </div>
            <div className="card p-5">
              <div className="text-2xl font-bold text-gray-400">{stats.listed.toLocaleString()}</div>
              <div className="text-sm text-vicrez-muted">Listed</div>
            </div>
            <div className="card p-5">
              <div className="text-2xl font-bold text-vicrez-red">{stats.states}</div>
              <div className="text-sm text-vicrez-muted">States Covered</div>
            </div>
          </div>

          {/* Two-column: State breakdown + Top capabilities */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Installers per state */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Installers per State (Top 15)</h2>
              <div className="space-y-2">
                {Object.entries(stats.stateBreakdown)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 15)
                  .map(([state, count]) => {
                    const maxCount = Math.max(...Object.values(stats.stateBreakdown));
                    const pct = (count / maxCount) * 100;
                    return (
                      <div key={state} className="flex items-center gap-3">
                        <span className="w-8 text-sm text-gray-400 flex-shrink-0">{state}</span>
                        <div className="flex-1 bg-vicrez-dark rounded-full h-4 overflow-hidden">
                          <div
                            className="bg-vicrez-red h-full rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-sm text-vicrez-muted w-12 text-right flex-shrink-0">{count}</span>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Top capabilities */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Top Capabilities</h2>
              <div className="space-y-2">
                {stats.topCapabilities.map((cap) => {
                  const maxCap = stats.topCapabilities[0]?.count || 1;
                  const pct = (cap.count / maxCap) * 100;
                  return (
                    <div key={cap.name} className="flex items-center gap-3">
                      <span className="w-32 text-sm text-gray-400 flex-shrink-0 truncate" title={cap.name}>
                        {cap.name}
                      </span>
                      <div className="flex-1 bg-vicrez-dark rounded-full h-4 overflow-hidden">
                        <div
                          className="bg-blue-500 h-full rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-sm text-vicrez-muted w-12 text-right flex-shrink-0">{cap.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <input
              type="text"
              placeholder="Search by name, city, or state..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              className="input-field flex-1"
            />
            <select
              value={stateFilter}
              onChange={(e) => {
                setStateFilter(e.target.value);
                setPage(0);
              }}
              className="input-field w-full sm:w-40"
            >
              <option value="">All States</option>
              {allStates.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <p className="text-sm text-vicrez-muted mb-4">
            Showing {paginatedInstallers.length} of {filteredInstallers.length.toLocaleString()} installers
          </p>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-vicrez-border text-left">
                  <th className="py-3 px-3 text-gray-400 font-medium">Name</th>
                  <th className="py-3 px-3 text-gray-400 font-medium">City</th>
                  <th className="py-3 px-3 text-gray-400 font-medium">State</th>
                  <th className="py-3 px-3 text-gray-400 font-medium">Capabilities</th>
                  <th className="py-3 px-3 text-gray-400 font-medium">Rating</th>
                  <th className="py-3 px-3 text-gray-400 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedInstallers.map((inst) => {
                  const tier = getTier(inst.source);
                  const caps = parseCapabilities(inst.install_capabilities);
                  return (
                    <tr
                      key={inst.id}
                      onClick={() => setSelectedInstaller(inst)}
                      className="border-b border-vicrez-border/50 hover:bg-vicrez-card cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-3 text-white font-medium max-w-[200px] truncate">
                        {inst.business_name}
                      </td>
                      <td className="py-3 px-3 text-gray-300">{inst.city}</td>
                      <td className="py-3 px-3 text-gray-300">{inst.state}</td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1">
                          {caps.slice(0, 3).map((c, i) => (
                            <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-vicrez-dark text-gray-400 border border-vicrez-border">
                              {c}
                            </span>
                          ))}
                          {caps.length > 3 && (
                            <span className="text-xs text-vicrez-muted">+{caps.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {inst.google_rating ? (
                          <span className="text-yellow-400">{inst.google_rating.toFixed(1)}</span>
                        ) : (
                          <span className="text-vicrez-muted">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          tier === 'verified'
                            ? 'bg-green-500/10 text-green-400'
                            : 'bg-gray-500/10 text-gray-400'
                        }`}>
                          {tier}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="btn-secondary text-xs disabled:opacity-30"
              >
                Previous
              </button>
              <span className="text-sm text-vicrez-muted">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="btn-secondary text-xs disabled:opacity-30"
              >
                Next
              </button>
            </div>
          )}

          {/* Detail Modal */}
          {selectedInstaller && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
              onClick={() => setSelectedInstaller(null)}
            >
              <div
                className="card max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white">{selectedInstaller.business_name}</h2>
                    <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${
                      getTier(selectedInstaller.source) === 'verified'
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-gray-500/10 text-gray-400'
                    }`}>
                      {getTier(selectedInstaller.source)}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedInstaller(null)}
                    className="text-vicrez-muted hover:text-white text-2xl leading-none"
                  >
                    &times;
                  </button>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-500">Address</span>
                      <p className="text-gray-300">
                        {selectedInstaller.street_address && <>{selectedInstaller.street_address}<br /></>}
                        {selectedInstaller.city}, {selectedInstaller.state} {selectedInstaller.zip_code}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Phone</span>
                      <p className="text-gray-300">{formatPhone(selectedInstaller.phone) || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Email</span>
                      <p className="text-gray-300 break-all">{selectedInstaller.email || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Website</span>
                      <p className="text-gray-300 break-all">{selectedInstaller.website || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Google Rating</span>
                      <p className="text-gray-300">
                        {selectedInstaller.google_rating
                          ? `${selectedInstaller.google_rating}/5 (${selectedInstaller.google_review_count || 0} reviews)`
                          : '-'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Shop Type</span>
                      <p className="text-gray-300">{selectedInstaller.shop_type || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Slug</span>
                      <p className="text-gray-300">{selectedInstaller.slug || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Source</span>
                      <p className="text-gray-300">{selectedInstaller.source || '-'}</p>
                    </div>
                  </div>

                  <div>
                    <span className="text-gray-500">Capabilities</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {parseCapabilities(selectedInstaller.install_capabilities).map((cap, i) => (
                        <span key={i} className="text-xs px-2 py-1 rounded-full bg-vicrez-dark border border-vicrez-border text-gray-400">
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>

                  {selectedInstaller.specialize_in && (
                    <div>
                      <span className="text-gray-500">Specializes In</span>
                      <p className="text-gray-300">{selectedInstaller.specialize_in}</p>
                    </div>
                  )}

                  {selectedInstaller.slug && (
                    <div className="pt-3 border-t border-vicrez-border">
                      <a
                        href={`/installer/${selectedInstaller.slug}`}
                        className="btn-primary text-sm inline-block"
                      >
                        View Public Profile
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
