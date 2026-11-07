"use client";
import { useEffect, useState, useRef } from "react";
import { QUOTE_SUPPORT_EMAIL } from "@/lib/quote-contact";
export default function VerifyClaimPage() {
  const token = useRef(""),
    started = useRef(false);
  const [detail, setDetail] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [confirmed, setConfirmed] = useState(false);
  async function submit(action: string) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/claims/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          token: token.current,
          confirm_authority: confirmed,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Verification is unavailable.");
      setDetail(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification is unavailable.");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    token.current = window.location.hash.slice(1);
    window.history.replaceState(null, "", window.location.pathname);
    if (token.current) void submit("inspect");
    else
      setError(
        "Open the private verification link sent to your business email.",
      );
  }, []);
  return (
    <section className="rounded-2xl border bg-white p-6 space-y-5 text-gray-900">
      <a href="/for-shops" className="text-sm underline">
        Vicrez Installer Network
      </a>
      <h1 className="text-2xl font-bold">Verify shop ownership</h1>
      {error && (
        <p role="alert" className="rounded bg-red-50 p-3 text-red-800">
          {error}
        </p>
      )}
      {detail && !detail.verified && (
        <>
          <h2 className="text-xl font-semibold">{detail.business_name}</h2>
          <p className="text-sm text-gray-600">{detail.reference}</p>
          <p>
            This link confirms control of the business contact associated with
            this request. Approving it grants this email access to manage the
            shop.
          </p>
          <label className="flex gap-3 items-start">
            <input
              type="checkbox"
              className="mt-1"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            I am the owner or an authorized employee responsible for this shop
            and requested this access.
          </label>
          <button
            className="btn-primary w-full disabled:opacity-50"
            disabled={busy || !confirmed}
            onClick={() => void submit("confirm")}
          >
            {busy ? "Verifying…" : "Confirm ownership and approve access"}
          </button>
          <p className="text-sm">
            If you did not request access, do not confirm or forward this link.
            It expires {new Date(detail.expires_at).toLocaleString()}.
          </p>
        </>
      )}
      {detail?.verified && (
        <div role="status">
          <h2 className="text-xl font-semibold">Ownership verified</h2>
          <p className="mt-2">
            Your owner access is approved. Sign in using the same business
            email. Requested public listing changes still require review.
          </p>
          <a className="btn-primary inline-block mt-4" href="/owner">
            Sign in to manage your shop
          </a>
        </div>
      )}
      {busy && !detail && <p role="status">Checking your verification link…</p>}
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
  );
}
