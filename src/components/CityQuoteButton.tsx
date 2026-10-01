"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

const loadCityQuoteModal = () => import("./CityQuoteModal");
const CityQuoteModal = dynamic(loadCityQuoteModal);
const preloadQuote = () => void loadCityQuoteModal().catch(() => {});

interface Props {
  locationLabel: string;
  variant?: "banner" | "inline";
}

export default function CityQuoteButton({ locationLabel, variant = "banner" }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState(false);
  const launcher = useRef<HTMLDetailsElement>(null);
  const pending = useRef<object | null>(null);

  async function openQuote() {
    if (pending.current) return;
    const attempt = {};
    pending.current = attempt;
    setError(false);
    try {
      await loadCityQuoteModal();
      // Closing the disclosure or leaving this page cancels this attempt.
      if (pending.current !== attempt) return;
      setMounted(true);
      setOpen(true);
    } catch {
      if (pending.current === attempt) setError(true);
    } finally {
      if (pending.current === attempt) pending.current = null;
    }
  }

  useEffect(() => {
    // Native feedback works before hydration; resume an early tap afterward.
    if (launcher.current?.open) void openQuote();
    return () => { pending.current = null; };
  }, []);

  return (
    <>
      <details
        ref={launcher}
        className={`quote-launcher ${variant === "banner" ? "mb-8" : ""}`}
        onToggle={(event) => {
          if (event.currentTarget.open) void openQuote();
          else pending.current = null;
        }}
      >
        <summary
          onPointerEnter={preloadQuote}
          onPointerDown={preloadQuote}
          onFocus={preloadQuote}
          aria-haspopup="dialog"
          className={`list-none cursor-pointer ${variant === "banner"
            ? "block w-full bg-gradient-to-r from-vicrez-red to-red-700 rounded-xl p-6 text-center hover:from-vicrez-red-dark hover:to-red-800 transition-all"
            : "btn-primary w-full text-center text-lg py-3"}`}
        >
          {variant === "banner" ? (
            <>
              <span className="block text-lg font-bold text-white">🔧 Request Installation Quotes in {locationLabel}</span>
              <span className="block text-sm text-white/80 mt-1">
                Tell us your vehicle &amp; what you want installed — we will look for nearby shops with the recorded service you need. Availability varies.
              </span>
            </>
          ) : "Request Installation Quotes"}
        </summary>
        {error ? (
          <p role="alert" className="mt-2 text-sm text-red-700">
            We could not open the quote form. {" "}
            <button type="button" onClick={openQuote} className="underline">Retry opening quote form</button>
          </p>
        ) : (
          <p role="status" className="mt-2 text-sm text-gray-700">Preparing your quote form…</p>
        )}
        <noscript>Enable JavaScript to complete this form, or contact a listed shop using its phone or website.</noscript>
      </details>
      {mounted && (
        <CityQuoteModal
          isOpen={open}
          onClose={() => {
            setOpen(false);
            if (launcher.current) launcher.current.open = false;
          }}
          locationLabel={locationLabel}
        />
      )}
    </>
  );
}
