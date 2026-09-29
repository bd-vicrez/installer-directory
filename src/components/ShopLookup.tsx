"use client";
import { useRef, useState } from "react";
import { discoveryEvent } from "@/lib/discovery-client";
import { resultBucket } from "@/lib/measurement-client";
export default function ShopLookup({
  onContinue,
}: {
  onContinue?: () => void;
}) {
  const [name, setName] = useState(""),
    [location, setLocation] = useState("");
  const [shops, setShops] = useState<any[] | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [limited, setLimited] = useState(false);
  const sequence = useRef(0);
  const journey = useRef("");
  async function search(e: React.FormEvent) {
    e.preventDefault();
    const id = ++sequence.current;
    const journey_id = crypto.randomUUID(),
      started = performance.now();
    journey.current = journey_id;
    discoveryEvent("lookup_start", { journey_id });
    setBusy(true);
    setError("");
    setShops(null);
    try {
      const r = await fetch(
        "/api/shop-lookup?" + new URLSearchParams({ name, location }),
        { cache: "no-store" },
      );
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      if (sequence.current === id) {
        discoveryEvent("lookup_results", {
          journey_id,
          result_bucket: resultBucket(d.shops.length),
          duration_ms: Math.round(performance.now() - started),
        });
        setShops(d.shops);
        setLimited(d.limited);
      }
    } catch (e) {
      discoveryEvent("lookup_error", {
        journey_id,
        duration_ms: Math.round(performance.now() - started),
      });
      if (sequence.current === id)
        setError(e instanceof Error ? e.message : "Please retry.");
    } finally {
      if (sequence.current === id) setBusy(false);
    }
  }
  return (
    <section
      className="bg-white border rounded-xl p-5 space-y-4"
      aria-label="Find your business"
    >
      <h2 className="text-xl font-semibold">Find your business</h2>
      <p className="text-sm text-gray-600">
        Already listed? Request ownership review for the existing listing. You
        do not need another application.
      </p>
      <form onSubmit={search} className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          Business name
          <input
            className="input-field w-full mt-1"
            required
            minLength={3}
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="text-sm">
          City, state or ZIP code
          <input
            className="input-field w-full mt-1"
            placeholder="San Diego, CA or 92101"
            required
            minLength={2}
            maxLength={100}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </label>
        <button className="btn-primary sm:col-span-2" disabled={busy}>
          {busy ? "Looking for your shop…" : "Find my business"}
        </button>
      </form>
      {error && (
        <p role="alert" className="text-red-800">
          {error}
        </p>
      )}
      {shops && (
        <div role="status" className="space-y-3">
          <p>
            {shops.length
              ? "Select your location below."
              : "No matching listing found. Try another business name or nearby city, or apply for a new listing."}
            {limited &&
              " More than ten matches: narrow the business name or use a ZIP code."}
          </p>
          {shops.map((s) => (
            <div className="border rounded-lg p-3 space-y-2" key={s.id}>
              <p className="font-semibold">{s.business_name}</p>
              <p className="text-sm">
                {[s.street_address, s.city, s.state, s.zip_code]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              <a
                className="btn-primary inline-block text-sm"
                href={"/claim?shop=" + encodeURIComponent(s.id)}
                onClick={() =>
                  discoveryEvent("lookup_claim", {
                    journey_id: journey.current || crypto.randomUUID(),
                  })
                }
              >
                Claim or update this shop
              </a>{" "}
              <a className="underline text-sm" href={"/installer/" + s.slug}>
                View listing
              </a>
            </div>
          ))}
        </div>
      )}
      {onContinue ? (
        <button
          type="button"
          onClick={() => {
            discoveryEvent("lookup_new", {
              journey_id: journey.current || crypto.randomUUID(),
            });
            onContinue();
          }}
          className="underline text-sm min-h-10"
        >
          My location needs a new listing — continue application
        </button>
      ) : (
        <a className="underline text-sm inline-block py-2" href="/apply">
          Not listed? Apply for a free listing
        </a>
      )}
    </section>
  );
}
