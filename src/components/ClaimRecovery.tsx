"use client";
import { useRef, useState } from "react";
import { QUOTE_SUPPORT_EMAIL } from "@/lib/quote-contact";
export default function ClaimRecovery({
  recovery,
  onSaved,
}: {
  recovery: any;
  onSaved: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const attempt = useRef("");
  async function renew() {
    setBusy(true);
    setError("");
    if (!attempt.current) attempt.current = crypto.randomUUID();
    try {
      const r = await fetch("/api/claims/recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: window.location.hash.slice(1),
          confirm: true,
          request_id: attempt.current,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMessage(d.message);
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="rounded-xl bg-blue-50 border border-blue-200 text-slate-900 p-5 space-y-3"
      aria-label="Ownership verification next steps"
    >
      <h2 className="text-xl font-semibold">{recovery.stage}</h2>
      <p>{recovery.next_step}</p>
      {!!recovery.missing.length && (
        <ul className="list-disc pl-5 space-y-2">
          {recovery.missing.map((m: string) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}
      {recovery.expires_at && (
        <p>Confirm by {new Date(recovery.expires_at).toLocaleString()}.</p>
      )}
      {recovery.can_renew && (
        <button
          type="button"
          className="btn-primary"
          disabled={busy}
          onClick={() => void renew()}
        >
          {busy ? "Requesting review…" : "Request a fresh verification review"}
        </button>
      )}
      {message && <p role="status">{message}</p>}
      {error && (
        <p role="alert" className="text-red-800">
          {error}
        </p>
      )}
      <p className="text-sm">
        Need help?{" "}
        <a
          className="underline break-all"
          href={"mailto:" + QUOTE_SUPPORT_EMAIL}
        >
          {QUOTE_SUPPORT_EMAIL}
        </a>
        . Include your request reference.
      </p>
    </section>
  );
}
