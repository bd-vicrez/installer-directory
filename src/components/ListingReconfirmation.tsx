"use client";
import { useEffect, useState } from "react";
const names: Record<string, string> = {
  business_name: "Business name",
  street_address: "Street address",
  zip_code: "ZIP code",
  inquiry_enabled: "Vicrez inquiry routing enabled",
  paused: "Owner has paused new inquiries",
  owner_details: "Published shop details",
  photo_ids: "Selected shop photos",
  projects: "Completed projects",
  hours_note: "Hours / appointment policy",
  parts_policy: "Customer-supplied parts policy",
};
function display(value: any): string {
  if (value === null || value === undefined || value === "")
    return "Not provided";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value))
    return value.length ? value.map(display).join("\n") : "Not provided";
  if (typeof value === "object")
    return (
      Object.entries(value)
        .filter(([k]) => !["photo_id", "projects_confirmed"].includes(k))
        .map(
          ([k, v]) =>
            (names[k] || k.replaceAll("_", " ")) +
            ": " +
            (k === "photo_ids" && Array.isArray(v)
              ? String(v.length)
              : display(v)),
        )
        .join("\n") || "Not provided"
    );
  return String(value);
}
export default function ListingReconfirmation({
  snapshot,
  hash,
  freshness,
  onSaved,
}: {
  snapshot: any;
  hash: string;
  freshness: any;
  onSaved: () => Promise<void>;
}) {
  const [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => setConfirmed(false), [hash]);
  return (
    <section className="border rounded-xl p-5 space-y-3">
      <h2 className="text-xl font-semibold">
        Confirm your current listing details
      </h2>
      <p>
        Review the saved details below. If anything needs changing, submit a
        profile update or listing correction first. Reconfirm every 90 days.
      </p>
      <dl className="space-y-2">
        {Object.entries(snapshot).map(([k, v]) => (
          <div key={k}>
            <dt className="font-semibold">
              {names[k] || k.replaceAll("_", " ")}
            </dt>
            <dd className="break-words whitespace-pre-wrap">{display(v)}</dd>
          </div>
        ))}
      </dl>
      <p>
        Last owner confirmation:{" "}
        {freshness.last_confirmed_at
          ? new Date(freshness.last_confirmed_at).toLocaleDateString()
          : "Not yet recorded"}
        . {freshness.current ? "Current." : "Confirmation needed."}
      </p>
      <label className="flex gap-2">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        I reviewed the business details, services, hours and inquiry
        availability above and confirm they are current.
      </label>
      <button
        className="btn-secondary"
        disabled={!confirmed || busy}
        onClick={async () => {
          setBusy(true);
          setMessage("");
          try {
            const r = await fetch("/api/owner/shop", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "reconfirm",
                snapshot_hash: hash,
                confirm: true,
              }),
            });
            const d = await r.json();
            if (!r.ok) throw Error(d.error);
            setConfirmed(false);
            await onSaved();
            setMessage("Current listing details confirmed.");
          } catch (e) {
            setMessage(e instanceof Error ? e.message : "Unable to confirm.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Saving…" : "Confirm current details"}
      </button>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
