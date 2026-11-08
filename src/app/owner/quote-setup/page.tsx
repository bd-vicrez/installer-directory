"use client";
import { useRef, useState, useEffect } from "react";
import { QUOTE_SUPPORT_EMAIL } from "@/lib/quote-contact";
export default function QuoteSetupProof() {
  const token = useRef(""),
    started = useRef(false);
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function send(action: string) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/owner/quote-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          token: token.current,
          confirm: action === "confirm",
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Test unavailable.");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    token.current = window.location.hash.slice(1);
    window.history.replaceState(null, "", window.location.pathname);
    if (token.current) void send("inspect");
    else setError("Open the private test link sent to your shop email.");
  }, []);
  return (
    <main className="max-w-xl mx-auto px-4 py-12">
      <section className="rounded-xl bg-white text-slate-900 p-6 border space-y-4">
        <h1 className="text-2xl font-bold">Confirm your quote inbox</h1>
        {error && (
          <p role="alert" className="text-red-800">
            {error}
          </p>
        )}
        {busy && !data && <p role="status">Checking your delivery test…</p>}
        {data && (
          <>
            <h2 className="font-semibold">{data.business_name}</h2>
            {data.confirmed ? (
              <p role="status">
                Receipt confirmed. Your setup is ready for Vicrez’s
                participation review. This test does not enable quote routing or
                confirm a customer appointment.
              </p>
            ) : (
              <>
                <p>
                  This is the test you requested. Confirm only if you received
                  it at your shop’s approved quote inbox.
                </p>
                <button
                  className="btn-primary"
                  disabled={busy}
                  onClick={() => void send("confirm")}
                >
                  {busy
                    ? "Confirming…"
                    : "I received the test at our shop inbox"}
                </button>
              </>
            )}
          </>
        )}
        <a className="underline block" href="/owner">
          Return to your shop dashboard
        </a>
        <p className="text-sm">
          Need help?{" "}
          <a
            className="underline break-all"
            href={"mailto:" + QUOTE_SUPPORT_EMAIL}
          >
            {QUOTE_SUPPORT_EMAIL}
          </a>
        </p>
      </section>
    </main>
  );
}
