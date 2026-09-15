"use client";
import { discoveryEvent } from "@/lib/discovery-client";
import ShopComparison from "./ShopComparison";
import { normalizeService } from "@/lib/service-taxonomy";

import { useState, useEffect, useRef, useCallback } from "react";
import Hero from "./Hero";
import Filters from "./Filters";
import InstallerCard from "./InstallerCard";
import ClaimModal from "./ClaimModal";
import RemovalModal from "./RemovalModal";
import type { PublicInstaller } from "@/lib/public-installers";

type SearchState = {
  sort: string;
  inquiry: string;
  q: string;
  lat?: number;
  lng?: number;
  service: string;
  tier: string;
  radius: number;
};
type Results = {
  installers: PublicInstaller[];
  total: number;
  verified: number;
  listed: number;
  location: { label: string } | null;
};
const initial: SearchState = {
  sort: "recommended",
  inquiry: "",
  q: "",
  service: "",
  tier: "",
  radius: 50,
};
export default function HomeSearch() {
  const [search, setSearch] = useState<SearchState>(initial);
  const [results, setResults] = useState<Results | null>(null);
  const [loading, setLoading] = useState(false),
    [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [claim, setClaim] = useState<PublicInstaller | null>(null);
  const [compare, setCompare] = useState<PublicInstaller[]>([]);
  const [removal, setRemoval] = useState<PublicInstaller | null>(null);
  const pending = useRef<AbortController | null>(null);
  const runSearch = useCallback(
    async (next: SearchState, offset = 0, updateUrl = true) => {
      pending.current?.abort();
      const controller = new AbortController();
      pending.current = controller;
      setSearch(next);
      setError("");
      if (offset) setLoadingMore(true);
      else {
        setLoading(true);
        setLoadingMore(false);
        setResults(null);
      }
      const params = new URLSearchParams();
      if (next.q) params.set("q", next.q);
      if (next.lat !== undefined && next.lng !== undefined) {
        params.set("lat", String(next.lat));
        params.set("lng", String(next.lng));
      }
      if (next.service) params.set("service", next.service);
      if (next.tier) params.set("tier", next.tier);
      params.set("radius", String(next.radius));
      if (next.sort !== "recommended") params.set("sort", next.sort);
      if (next.inquiry) params.set("inquiry", next.inquiry);
      // Precise device location stays out of browser history and shareable URLs.
      if (updateUrl && next.lat === undefined)
        window.history.pushState(null, "", "?" + params.toString());
      params.set("offset", String(offset));
      try {
        const response = await fetch("/api/installers?" + params, {
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Search is temporarily unavailable.");
        if (pending.current !== controller) return;
        if (!offset) {
          const result_bucket =
            data.total === 0
              ? "0"
              : data.total <= 5
                ? "1-5"
                : data.total <= 24
                  ? "6-24"
                  : "25+";
          discoveryEvent("search", {
            service: next.service || undefined,
            result_bucket,
          });
          if (!data.total)
            discoveryEvent("search_empty", {
              service: next.service || undefined,
              result_bucket,
            });
        }
        setResults((previous) => ({
          ...data,
          installers:
            offset && previous
              ? [...previous.installers, ...data.installers]
              : data.installers,
        }));
      } catch (e: any) {
        if (e.name !== "AbortError")
          setError(
            e.message || "Search is temporarily unavailable. Please try again.",
          );
      } finally {
        if (pending.current === controller) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [],
  );
  useEffect(() => {
    const restore = () => {
      const p = new URLSearchParams(window.location.search);
      if (p.toString())
        runSearch(
          {
            sort: p.get("sort") || "recommended",
            inquiry: p.get("inquiry") || "",
            q: p.get("q") || "",
            service: normalizeService(p.get("service") || ""),
            tier: p.get("tier") || "",
            radius: Number(p.get("radius") || 50),
          },
          0,
          false,
        );
      else {
        pending.current?.abort();
        setSearch(initial);
        setResults(null);
        setLoading(false);
        setLoadingMore(false);
        setError("");
      }
    };
    restore();
    window.addEventListener("popstate", restore);
    return () => {
      pending.current?.abort();
      window.removeEventListener("popstate", restore);
    };
  }, [runSearch]);
  const change = (patch: Partial<SearchState>) => {
    discoveryEvent("filter", {
      service:
        (patch.service !== undefined ? patch.service : search.service) ||
        undefined,
    });
    const next = { ...search, ...patch };
    setSearch(next);
    if (results || loading || error) runSearch(next);
  };
  return (
    <>
      <Hero
        onSearch={(q, coords) =>
          runSearch({ ...search, q, lat: coords?.lat, lng: coords?.lng })
        }
        isLoading={loading}
        resultCount={results?.total ?? null}
        locationLabel={results?.location?.label ?? null}
        initialInput={search.q}
      />
      <section
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
        aria-label="Installer search results"
        aria-busy={loading || loadingMore}
      >
        <Filters
          capabilityFilter={search.service}
          tierFilter={search.tier}
          radiusFilter={search.radius}
          sort={search.sort}
          inquiry={search.inquiry}
          onSortChange={(sort) => change({ sort })}
          onInquiryChange={(inquiry) => change({ inquiry })}
          onCapabilityChange={(service) => change({ service })}
          onTierChange={(tier) => change({ tier })}
          onRadiusChange={(radius) => change({ radius })}
        />
        {loading && (
          <p role="status" className="text-center py-10 text-gray-700">
            Finding nearby installers…
          </p>
        )}
        {error && (
          <p role="alert" className="p-4 rounded-lg bg-red-50 text-red-800">
            {error}
          </p>
        )}
        {results && !loading && (
          <>
            <p className="mb-6 text-sm text-gray-700" role="status">
              {results.total} results · {results.verified} Vicrez records ·{" "}
              {results.listed} listed
            </p>
            {results.total === 0 ? (
              <div className="text-center py-12">
                <h2 className="text-xl font-semibold mb-2">
                  No installers found
                </h2>
                <p className="text-gray-700">
                  Try a wider radius, another service or a nearby ZIP code.
                </p>
                {search.radius < 250 && (
                  <button
                    className="btn-secondary mt-4"
                    onClick={() =>
                      change({ radius: Math.min(250, search.radius * 2) })
                    }
                  >
                    Search a wider radius
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.installers.map((installer) => (
                  <div key={installer.id}>
                    <InstallerCard
                      installer={installer}
                      onClaimClick={() => setClaim(installer)}
                      onRemovalClick={setRemoval}
                    />
                    <label className="flex gap-2 p-3 border rounded-b-lg text-sm">
                      <input
                        type="checkbox"
                        checked={compare.some((i) => i.id === installer.id)}
                        disabled={
                          compare.length >= 3 &&
                          !compare.some((i) => i.id === installer.id)
                        }
                        onChange={(e) =>
                          setCompare((items) =>
                            e.target.checked
                              ? [...items, installer]
                              : items.filter((i) => i.id !== installer.id),
                          )
                        }
                      />
                      Compare this shop
                    </label>
                  </div>
                ))}
              </div>
            )}
            {results.installers.length < results.total && (
              <div className="text-center mt-8">
                <button
                  className="btn-secondary px-8"
                  disabled={loadingMore}
                  onClick={() =>
                    runSearch(search, results.installers.length, false)
                  }
                >
                  {loadingMore ? "Loading more…" : "Load More"}
                </button>
              </div>
            )}
          </>
        )}
      </section>
      <ShopComparison
        shops={compare}
        onRemove={(id) =>
          setCompare((items) => items.filter((i) => i.id !== id))
        }
      />
      <ClaimModal
        isOpen={!!claim}
        shop={claim}
        onClose={() => setClaim(null)}
      />
      <RemovalModal
        isOpen={!!removal}
        installer={removal}
        onClose={() => setRemoval(null)}
      />
    </>
  );
}
