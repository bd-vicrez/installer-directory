"use client";
import { useEffect, useState } from "react";
export default function Owners() {
  const [data, setData] = useState<any>({ grants: [], evidence: [] }),
    [choice, setChoice] = useState(""),
    [note, setNote] = useState(""),
    [confirm, setConfirm] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    const r = await fetch("/api/admin/owners", { cache: "no-store" });
    const d = await r.json();
    if (!r.ok) throw Error(d.error);
    setData(d);
  }
  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, []);
  async function save(body: any) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const r = await fetch("/api/admin/owners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, note, confirm_authority: confirm }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      await load();
      setMessage(
        body.action === "revoke"
          ? "Owner access revoked. Existing sessions and unused sign-in links are invalid."
          : "Owner access granted. The reviewed email can request a sign-in link at /owner. No invitation was sent.",
      );
      setConfirm(false);
      setNote("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="max-w-5xl space-y-5 text-gray-100">
      <h1 className="text-2xl font-bold">Owner access</h1>
      <p>
        Grant access from an approved application or independently verified
        ownership review. The approved requester can propose profile changes and
        pause new inquiries. Public contact details alone do not establish
        ownership.
      </p>
      {error && (
        <p role="alert" className="bg-red-50 text-red-800 p-3">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="bg-green-50 text-green-900 p-3">
          {message}
        </p>
      )}
      <form
        className="bg-white text-gray-900 border rounded-xl p-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const item = data.evidence.find(
            (r: any) => r.kind + ":" + r.id === choice,
          );
          if (item)
            void save({
              action: "grant",
              evidence_kind: item.kind,
              evidence_id: item.id,
            });
        }}
      >
        <h2 className="text-xl font-semibold">Grant or renew access</h2>
        <label className="block">
          Reviewed request
          <select
            required
            className="input-field w-full"
            value={choice}
            onChange={(e) => setChoice(e.target.value)}
          >
            <option value="">Choose a reviewed request</option>
            {data.evidence.map((r: any) => (
              <option key={r.kind + ":" + r.id} value={r.kind + ":" + r.id}>
                {r.reference} · {r.business_name} · {r.email}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          Access review note (required for grants and revocations)
          <textarea
            required
            minLength={20}
            maxLength={1500}
            className="input-field w-full"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        <label className="flex gap-2">
          <input
            required
            type="checkbox"
            checked={confirm}
            onChange={(e) => setConfirm(e.target.checked)}
          />
          I reviewed the evidence and this requester is authorized to manage
          this shop.
        </label>
        <button className="btn-primary" disabled={busy}>
          Grant reviewed access
        </button>
        <p className="text-sm">
          Renewing access invalidates prior sessions. Share{" "}
          <a
            className="underline"
            href="/owner"
            target="_blank"
            rel="noopener noreferrer"
          >
            the owner sign-in page
          </a>{" "}
          when ready. Address, ownership and contact changes still require staff
          review.
        </p>
      </form>
      <h2 className="text-xl font-semibold">Existing access</h2>
      {!data.grants.length && <p>No owner access has been granted yet.</p>}
      {data.grants.map((g: any) => (
        <article
          className="bg-white text-gray-900 border rounded-xl p-4 space-y-2"
          key={g.id}
        >
          <h3 className="font-semibold">{g.business_name}</h3>
          <p>
            {g.email} · {g.active ? "Access active" : "Access revoked"} ·{" "}
            {g.owner_inquiry_paused
              ? "New inquiries paused by owner"
              : "No owner pause"}
          </p>
          <p>{g.note}</p>
          {g.active && (
            <button
              className="btn-secondary"
              disabled={busy || note.trim().length < 20}
              onClick={() => save({ action: "revoke", id: g.id })}
            >
              Revoke access using review note above
            </button>
          )}
        </article>
      ))}
    </div>
  );
}
