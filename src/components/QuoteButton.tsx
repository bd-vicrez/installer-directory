"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { prepareQuoteDialog } from "@/lib/prepare-quote";
const loadQuoteModal = () => import("./QuoteModal");
const QuoteModal = dynamic(loadQuoteModal);
// Download only the form on interaction intent; permissions remain a fresh
// no-store request when opening. A failed preload is retried by openQuote.
const preloadQuoteModal = () => { void loadQuoteModal().catch(() => {}); };

interface Props {
  available: boolean;
  initialService?: string;
  installer: {
    id: string;
    business_name: string;
    city: string;
    state: string;
    phone: string;
  };
}

export default function QuoteButton({
  installer,
  available,
  initialService,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [unavailable, setUnavailable] = useState(!available);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const launcher = useRef<HTMLDetailsElement>(null);
  const pending = useRef<AbortController | null>(null);
  // The native disclosure responds before hydration. If it was opened early,
  // resume that same action once the event handlers are ready.
  useEffect(() => {
    if (launcher.current?.open) void openQuote();
    return () => {
      pending.current?.abort();
      pending.current = null;
    };
  }, []);
  async function openQuote() {
    if (pending.current) return;
    const attempt = new AbortController();
    pending.current = attempt;
    setChecking(true);
    setError("");
    try {
      const available = await prepareQuoteDialog(async () => {
        const response = await fetch(
          "/api/quote-availability?id=" + encodeURIComponent(installer.id),
          { cache: "no-store", signal: attempt.signal },
        );
        if (!response.ok) throw new Error();
        const result = await response.json();
        return result.available === true;
      }, loadQuoteModal);
      if (attempt.signal.aborted) return;
      if (!available) {
        setUnavailable(true);
        return;
      }
      setMounted(true);
      setOpen(true);
    } catch {
      if (attempt.signal.aborted) return;
      setError(
        "We could not open this shop’s quote form. Please retry or use its phone or website.",
      );
    } finally {
      if (pending.current === attempt) {
        pending.current = null;
        setChecking(false);
      }
    }
  }
  if (unavailable)
    return (
      <section className="card p-5" aria-label="Quote availability">
        <h2 className="font-semibold text-gray-900">
          Contact this shop directly
        </h2>
        <p className="text-sm text-gray-700 mt-2">
          This shop does not currently receive quote requests through Vicrez.
          Use its available phone or website contact options.
        </p>
        <a
          className="text-vicrez-red underline inline-block mt-3"
          href={
            "/?q=" +
            encodeURIComponent(installer.city + ", " + installer.state) +
            "#results"
          }
        >
          Find another installer
        </a>
      </section>
    );

  return (
    <>
      <details
        ref={launcher}
        className="quote-launcher"
        onToggle={(event) => {
          if (event.currentTarget.open) void openQuote();
          else {
            pending.current?.abort();
            pending.current = null;
            setChecking(false);
          }
        }}
      >
        <summary
          onPointerEnter={preloadQuoteModal}
          onPointerDown={preloadQuoteModal}
          onFocus={preloadQuoteModal}
          aria-haspopup="dialog"
          className="btn-primary w-full text-center text-lg py-3 list-none cursor-pointer"
        >
          Request a Quote
        </summary>
        {error ? (
          <div role="alert" className="mt-2 text-sm text-red-700">
            <p>{error}</p>
            <button type="button" onClick={openQuote} className="underline mt-2">
              Retry opening quote form
            </button>
          </div>
        ) : (
          <p role="status" className="mt-2 text-sm text-gray-700" aria-busy={checking}>
            Preparing your quote form…
          </p>
        )}
        <noscript>
          Enable JavaScript to complete this form, or contact the shop using its phone or website.
        </noscript>
      </details>
      {mounted && (
        <QuoteModal
          isOpen={open}
          onClose={() => {
            setOpen(false);
            if (launcher.current) launcher.current.open = false;
          }}
          installer={installer}
          initialService={initialService}
        />
      )}
    </>
  );
}
