'use client';

import { useState, useCallback, useMemo } from 'react';
import Hero from '@/components/Hero';
import Filters from '@/components/Filters';
import InstallerCard from '@/components/InstallerCard';
import ClaimModal from '@/components/ClaimModal';
import RemovalModal from '@/components/RemovalModal';
import { Installer, InstallerWithMeta, GeoLocation } from '@/lib/types';
import { enrichInstaller, sortInstallers, matchesCapabilityFilter, geocodeZip } from '@/lib/utils';

const PAGE_SIZE = 24;

export default function HomeSearch() {
  const [allInstallers, setAllInstallers] = useState<InstallerWithMeta[]>([]);
  const [userLocation, setUserLocation] = useState<GeoLocation | null>(null);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Filters
  const [capabilityFilter, setCapabilityFilter] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [radiusFilter, setRadiusFilter] = useState(50);

  // Modals
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [removalModalOpen, setRemovalModalOpen] = useState(false);
  const [removalInstaller, setRemovalInstaller] = useState<InstallerWithMeta | null>(null);

  const handleSearch = useCallback(async (zip: string) => {
    setIsLoading(true);
    setHasSearched(true);
    setVisibleCount(PAGE_SIZE);

    try {
      const [geo, res] = await Promise.all([
        geocodeZip(zip),
        fetch('/api/installers'),
      ]);

      if (!res.ok) throw new Error('API error');

      const data: Installer[] = await res.json();
      setUserLocation(geo);
      setLocationLabel(geo ? `${geo.city}, ${geo.state}` : zip);

      const enriched = data
        .filter((inst) => inst.status !== 'removed')
        .map((inst) => enrichInstaller(inst, geo));

      const sorted = sortInstallers(enriched);
      setAllInstallers(sorted);
    } catch (err) {
      console.error('Search failed:', err);
      setAllInstallers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const filteredInstallers = useMemo(() => {
    let results = allInstallers;

    if (userLocation) {
      results = results.filter(
        (inst) => inst.distance !== null && inst.distance <= radiusFilter
      );
    }

    if (capabilityFilter) {
      results = results.filter((inst) => matchesCapabilityFilter(inst, capabilityFilter));
    }

    if (tierFilter === 'verified') {
      results = results.filter((inst) => inst.tier === 'verified');
    }

    return results;
  }, [allInstallers, capabilityFilter, tierFilter, radiusFilter, userLocation]);

  const visibleInstallers = filteredInstallers.slice(0, visibleCount);
  const hasMore = visibleCount < filteredInstallers.length;

  const verifiedCount = filteredInstallers.filter((i) => i.tier === 'verified').length;
  const listedCount = filteredInstallers.filter((i) => i.tier === 'listed').length;

  return (
    <>
      <Hero
        onSearch={handleSearch}
        isLoading={isLoading}
        resultCount={hasSearched ? filteredInstallers.length : null}
        locationLabel={locationLabel}
      />

      {hasSearched && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Filters
            capabilityFilter={capabilityFilter}
            tierFilter={tierFilter}
            onCapabilityChange={setCapabilityFilter}
            onTierChange={setTierFilter}
            radiusFilter={radiusFilter}
            onRadiusChange={setRadiusFilter}
          />

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4 text-sm text-vicrez-muted">
              <span>
                <span className="text-white font-semibold">{filteredInstallers.length}</span> results
              </span>
              {verifiedCount > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  {verifiedCount} verified
                </span>
              )}
              {listedCount > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-vicrez-muted" />
                  {listedCount} listed
                </span>
              )}
            </div>
          </div>

          {filteredInstallers.length === 0 ? (
            <div className="text-center py-16">
              <svg className="w-16 h-16 mx-auto text-vicrez-muted mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 className="text-xl font-semibold mb-2">No installers found</h3>
              <p className="text-vicrez-muted max-w-md mx-auto">
                Try expanding your search radius, changing filters, or searching a different zip code.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {visibleInstallers.map((installer) => (
                  <InstallerCard
                    key={installer.id}
                    installer={installer}
                    onClaimClick={() => setClaimModalOpen(true)}
                    onRemovalClick={(inst) => {
                      setRemovalInstaller(inst);
                      setRemovalModalOpen(true);
                    }}
                  />
                ))}
              </div>

              {hasMore && (
                <div className="text-center mt-8">
                  <button
                    onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                    className="btn-secondary px-8"
                  >
                    Load More ({filteredInstallers.length - visibleCount} remaining)
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}

      <ClaimModal isOpen={claimModalOpen} onClose={() => setClaimModalOpen(false)} />
      <RemovalModal
        isOpen={removalModalOpen}
        installer={removalInstaller}
        onClose={() => {
          setRemovalModalOpen(false);
          setRemovalInstaller(null);
        }}
      />
    </>
  );
}
