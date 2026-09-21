"use client";
import { useState } from "react";
export default function InquiryReminder({
  job,
  state,
}: {
  job: string;
  state?: string;
}) {
  const [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [saved, setSaved] = useState(false);
  return (
    <div className="mt-2 border rounded p-3 space-y-2">
      {state ? (
        <p>
          Reminder: {state.replaceAll("_", " ")}. One reminder maximum per shop
          and inquiry.
        </p>
      ) : (
        <>
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={confirm}
              onChange={(e) => setConfirm(e.target.checked)}
            />
            Send this shop one follow-up about the existing inquiry.
          </label>
          <button
            className="btn-secondary"
            disabled={!confirm || busy || saved}
            onClick={async () => {
              setBusy(true);
              try {
                const r = await fetch("/api/admin/inquiry-reminder", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ job_id: job, confirm }),
                });
                const d = await r.json();
                if (!r.ok) throw Error(d.error);
                setMessage(d.message);
                setSaved(true);
              } catch (e) {
                setMessage(
                  e instanceof Error ? e.message : "Unable to queue reminder.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Checking…" : "Queue one reminder"}
          </button>
        </>
      )}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
