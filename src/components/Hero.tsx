"use client";
import { useEffect, useState } from "react";
import { QUOTE_SERVICES } from "@/lib/quote-services";

export default function Hero({
  onSearch,
  isLoading,
  resultCount,
  locationLabel,
  initialInput = "",
  service = "",
  onServiceChange,
}: {
  onSearch: (input: string, coords?: { lat: number; lng: number }) => void;
  isLoading: boolean;
  resultCount: number | null;
  locationLabel: string | null;
  initialInput?: string;
  service?: string;
  onServiceChange?: (value: string) => void;
}) {
  const [input, setInput] = useState(initialInput);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => setInput(initialInput), [initialInput]);
  function locate() {
    setError("");
    if (!navigator.geolocation) {
      setError("Enter a ZIP code or city and state to search.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocating(false);
        setInput("");
        onSearch("", { lat: p.coords.latitude, lng: p.coords.longitude });
      },
      () => {
        setLocating(false);
        setError(
          "Location was unavailable. Enter a ZIP code or city and state.",
        );
      },
      { timeout: 10000 },
    );
  }
  return (
    <section className="bg-gradient-to-br from-gray-50 to-red-50 border-b">
      <div className="max-w-5xl mx-auto px-4 py-7 sm:py-12">
        <h1 className="text-3xl sm:text-5xl font-bold text-center">
          Find an <span className="text-vicrez-red">Installer</span> Near You
        </h1>
        <p className="text-gray-600 text-center mt-3 mb-5">
          Find local shops for your vehicle, parts and installation project.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim()) onSearch(input.trim());
          }}
          className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] items-end"
        >
          <label className="text-sm font-medium">
            Installation service
            <select
              className="input-field w-full mt-1"
              value={service}
              onChange={(e) => onServiceChange?.(e.target.value)}
            >
              <option value="">All services</option>
              {QUOTE_SERVICES.filter((s) => s.id !== "other").map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            ZIP code or city and state
            <input
              className="input-field w-full mt-1"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="ZIP or city, state"
              maxLength={120}
              required
            />
          </label>
          <button
            disabled={isLoading || locating || !input.trim()}
            className="btn-primary min-h-12 disabled:opacity-50"
          >
            {isLoading ? "Searching…" : "Find shops"}
          </button>
        </form>
        <div className="text-center mt-3">
          <button
            className="underline text-sm min-h-10"
            disabled={locating || isLoading}
            onClick={locate}
          >
            {locating ? "Getting location…" : "Use My Location"}
          </button>
        </div>
        {error && (
          <p role="alert" className="text-red-800 text-center">
            {error}
          </p>
        )}
        {resultCount !== null && (
          <p role="status" className="text-sm text-center mt-2">
            {resultCount.toLocaleString()} matching listings
            {locationLabel ? " near " + locationLabel : ""}
          </p>
        )}
      </div>
    </section>
  );
}
