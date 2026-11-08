"use client";
import { useRef, useState } from "react";
import { QUOTE_SUPPORT_EMAIL } from "@/lib/quote-contact";
export default function OwnerQuoteChecklist({
  setup,
  shop,
  onSaved,
}: {
  setup: any;
  shop: any;
  onSaved: () => Promise<void>;
}) {
  const [services, setServices] = useState(false),
    [participation, setParticipation] = useState(false),
    [test, setTest] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const attempt = useRef("");
  async function request() {
    setBusy(true);
    setError("");
    if (!attempt.current) attempt.current = crypto.randomUUID();
    try {
      const r = await fetch("/api/owner/quote-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request",
          request_id: attempt.current,
          snapshot_hash: shop.snapshot_hash,
          confirm_services: services,
          confirm_participation: participation,
          confirm_test: test,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMessage(d.message);
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save setup.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="bg-white text-slate-900 rounded-xl border p-5 space-y-4"
      aria-label="Quote setup checklist"
    >
      <h2 className="text-xl font-semibold">
        Get ready to receive quote requests
      </h2>
      <ol className="list-decimal pl-5 space-y-2">
        <li>Owner access: approved.</li>
        <li>
          Services:{" "}
          {(shop.snapshot.services || []).join(", ") ||
            "Add your current services through a profile update."}
        </li>
        <li>
          Availability:{" "}
          {setup.paused
            ? "Paused — resume new inquiries above when you are ready."
            : "Your shop is not paused."}
        </li>
        <li>
          Quote inbox: <strong className="break-all">{setup.recipient}</strong>.
          Contact B2B support to use a different address.
        </li>
        <li>
          Delivery test:{" "}
          {setup.test_confirmed
            ? "Receipt confirmed by your shop."
            : setup.delivery_state === "delivered"
              ? "Delivered to the receiving server; confirm receipt using the private email link."
              : setup.delivery_state === "accepted"
                ? "Accepted by the provider; receipt is not yet confirmed."
                : setup.delivery_state
                  ? setup.delivery_state.replaceAll("_", " ")
                  : "Not requested."}
        </li>
        <li>
          Quote routing:{" "}
          {setup.enabled
            ? "Enabled, subject to availability and email safety checks."
            : setup.test_confirmed
              ? "Setup complete — Vicrez participation review is next."
              : "Not enabled. Complete setup and participation review first."}
        </li>
      </ol>
      {setup.expires_at && (
        <p>
          Confirm your test by {new Date(setup.expires_at).toLocaleString()}.
        </p>
      )}
      {setup.staff_hold && (
        <p>
          Participation is held for staff review. Contact B2B support before
          requesting a delivery test.
        </p>
      )}
      {setup.can_request && (
        <div className="space-y-3">
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={services}
              onChange={(e) => setServices(e.target.checked)}
            />
            I reviewed the services above and my shop is available to discuss
            this work.
          </label>
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={participation}
              onChange={(e) => setParticipation(e.target.checked)}
            />
            I agree to receive installation inquiries at this business email and
            reply directly to customers about pricing and scheduling.
          </label>
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={test}
              onChange={(e) => setTest(e.target.checked)}
            />
            Send one clearly labeled test to this email so I can confirm
            receipt.
          </label>
          <button
            className="btn-primary"
            disabled={busy || !services || !participation || !test}
            onClick={() => void request()}
          >
            {busy ? "Saving setup…" : "Save participation and send test"}
          </button>
        </div>
      )}
      {message && <p role="status">{message}</p>}
      {error && (
        <p role="alert" className="text-red-800">
          {error}
        </p>
      )}
      <p className="text-sm">
        Vicrez support is for help:{" "}
        <a
          className="underline break-all"
          href={"mailto:" + QUOTE_SUPPORT_EMAIL}
        >
          {QUOTE_SUPPORT_EMAIL}
        </a>
        . Completing this checklist does not confirm a customer appointment.
      </p>
    </section>
  );
}
