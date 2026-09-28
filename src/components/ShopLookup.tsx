"use client";
import { useRef, useState } from "react";
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
  async function search(e: React.FormEvent) {
    e.preventDefault();
    const id = ++sequence.current;
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
        setShops(d.shops);
        setLimited(d.limited);
      }
    } catch (e) {
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
          onClick={onContinue}
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
