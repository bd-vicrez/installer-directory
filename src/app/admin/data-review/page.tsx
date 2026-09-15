"use client";
import { useEffect, useState } from "react";
export default function Page() {
  const [rows, setRows] = useState<any[]>([]),
    [draft, setDraft] = useState<Record<string, any>>({}),
    [error, setError] = useState(""),
    [busy, setBusy] = useState("");
  async function load() {
    try {
      const r = await fetch("/api/admin/data-review");
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setRows(d.records);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Queue unavailable.");
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function save(id: string, action: string) {
    setBusy(id);
    setError("");
    try {
      const r = await fetch("/api/admin/data-review", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft[id], id, action, status: action }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please retry.");
    } finally {
      setBusy("");
    }
  }
  const change = (id: string, k: string, v: any) =>
    setDraft((d) => ({ ...d, [id]: { ...d[id], [k]: v } }));
  return (
    <div className="space-y-5 max-w-5xl">
      <h1 className="text-2xl font-bold">Location data review</h1>
      <p>
        Bounded location pilot and address changes requiring confirmation. No
        record is merged or removed through this queue.
      </p>
      {error && (
        <p role="alert" className="bg-red-50 text-red-800 p-3">
          {error}
        </p>
      )}
      {rows.map((r) => (
        <article
          className="bg-white text-gray-900 border rounded-xl p-5 space-y-3"
          key={r.id}
        >
          <h2 className="text-xl font-semibold">
            <a className="underline" href={"/installer/" + r.slug}>
              {r.business_name}
            </a>
          </h2>
          <p>
            {r.street_address}, {r.city}, {r.state} {r.zip_code}
          </p>
          <p>
            {r.issue} · {r.status}
          </p>
          <p>
            Candidate: {r.candidate.formatted_address || "Needs lookup"} ·{" "}
            {r.candidate.reason || r.candidate.source || ""}
          </p>
          <p>
            Reviewed by {r.reviewer || "Not assigned"}: {r.note}
          </p>
          {["pending", "held"].includes(r.status) && (
            <>
              <label className="block">
                Reviewer
                <input
                  className="input-field w-full"
                  value={draft[r.id]?.reviewer || ""}
                  onChange={(e) => change(r.id, "reviewer", e.target.value)}
                />
              </label>
              <label className="block">
                Evidence note
                <input
                  className="input-field w-full"
                  maxLength={1500}
                  value={draft[r.id]?.note || ""}
                  onChange={(e) => change(r.id, "note", e.target.value)}
                />
              </label>
              <label className="flex gap-2">
                <input
                  type="checkbox"
                  checked={draft[r.id]?.confirm_location === true}
                  onChange={(e) =>
                    change(r.id, "confirm_location", e.target.checked)
                  }
                />
                I confirmed this exact business address and location.
              </label>
              <div className="flex gap-3 flex-wrap">
                {[
                  ["locate", "Look up address"],
                  ["corrected", "Apply location correction"],
                  ["held", "Hold for review"],
                ].map(([action, label]) => (
                  <button
                    className="btn-secondary"
                    disabled={busy === r.id}
                    onClick={() => save(r.id, action)}
                    key={action}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
        </article>
      ))}
    </div>
  );
}
