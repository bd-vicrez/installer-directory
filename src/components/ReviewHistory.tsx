"use client";
import { useState } from "react";
export default function ReviewHistory({
  kind,
  id,
}: {
  kind: string;
  id: string;
}) {
  const [rows, setRows] = useState<any[]>([]),
    [error, setError] = useState("");
  async function load() {
    try {
      const r = await fetch(
        "/api/admin/review-history?kind=" +
          kind +
          "&record=" +
          encodeURIComponent(id),
      );
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setRows(d.history);
    } catch (e) {
      setError(e instanceof Error ? e.message : "History unavailable.");
    }
  }
  return (
    <details
      onToggle={(e) => {
        if (e.currentTarget.open) load();
      }}
    >
      <summary className="cursor-pointer">Review history</summary>
      {error && <p role="alert">{error}</p>}
      <ol className="mt-3 space-y-3">
        {rows.map((r, i) => (
          <li key={i}>
            <strong>{r.action}</strong> · {r.actor} ·{" "}
            {new Date(r.created_at).toLocaleString()}
            <p>{r.note}</p>
          </li>
        ))}
      </ol>
      {!rows.length && !error && <p>No recorded review actions.</p>}
    </details>
  );
}
