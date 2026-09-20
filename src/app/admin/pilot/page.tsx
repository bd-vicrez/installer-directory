"use client";
import { useEffect, useState } from "react";
const fields = [
  ["authority", "Owner/manager authority — source and date"],
  [
    "participation",
    "Owner's explicit agreement to participate — source and date",
  ],
  ["services", "Confirmed services, vehicles and equipment limits"],
  ["parts_policy", "Customer-supplied parts policy"],
  ["hours", "Business hours and shop's stated response expectation"],
  ["inquiry_consent", "Permission to receive inquiries — source and date"],
  ["contact_email", "Verified private inquiry email"],
  ["contact_evidence", "How the inbox was verified — source and date"],
  [
    "test_acknowledgment",
    "Shop acknowledged an agreed labeled delivery test — source and date",
  ],
  ["note", "Internal review note (required to save)"],
];
export default function PilotPage() {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState("");
  const [drafts, setDrafts] = useState<Record<string, any>>({}),
    [busy, setBusy] = useState("");
  const [messages, setMessages] = useState<Record<string, string>>({});
  async function load() {
    const r = await fetch("/api/admin/pilot", { cache: "no-store" });
    const d = await r.json();
    if (!r.ok) throw Error(d.error);
    setData(d);
  }
  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, []);
  async function save(row: any) {
    setBusy(row.installer_id);
    setMessages((m) => ({ ...m, [row.installer_id]: "" }));
    try {
      const d = drafts[row.installer_id] || {};
      const r = await fetch("/api/admin/pilot", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          installer_id: row.installer_id,
          version: row.version,
          decision: d.decision ?? row.decision,
          evidence: { ...row.evidence, ...d.evidence },
        }),
      });
      const result = await r.json();
      if (!r.ok) throw Error(result.error);
      setDrafts((all) => {
        const next = { ...all };
        delete next[row.installer_id];
        return next;
      });
      setMessages((m) => ({
        ...m,
        [row.installer_id]:
          "Pilot review saved. Listing and contact permissions were not changed.",
      }));
      try {
        await load();
      } catch {
        setError(
          "Review saved, but the queue could not refresh. Reload before editing again.",
        );
      }
    } catch (e) {
      setMessages((m) => ({
        ...m,
        [row.installer_id]: e instanceof Error ? e.message : "Unable to save.",
      }));
    } finally {
      setBusy("");
    }
  }
  return (
    <div className="max-w-5xl space-y-5">
      <h1 className="text-2xl font-bold">Shop activation pilot</h1>
      <p>
        Record evidence from real owner confirmations. Candidate listings, email
        delivery and shop replies are different milestones.
      </p>
      {error && <p role="alert">{error}</p>}
      {data && (
        <>
          <div className="bg-white text-gray-900 rounded-xl p-5">
            <strong>
              {data.candidates} candidates · {data.participants} confirmed
              participants
            </strong>
            <p>
              Participation requires every activation check and a currently
              enabled, verified inquiry contact.
            </p>
            <p>
              Shop response counts:{" "}
              {data.response_counts
                ? Object.entries(data.response_counts)
                    .map(([k, v]) => `${k.replaceAll("_", " ")}: ${v}`)
                    .join(" · ") || "No recorded responses yet"
                : "Response service unavailable"}
            </p>
          </div>
          {data.records.map((row: any) => {
            const d = drafts[row.installer_id] || {},
              evidence = { ...row.evidence, ...d.evidence };
            return (
              <article
                key={row.installer_id}
                className="bg-white text-gray-900 rounded-xl border p-5 space-y-3"
              >
                <h2 className="text-xl font-semibold">{row.business_name}</h2>
                <p>
                  {row.street_address}, {row.city}, {row.state}
                </p>
                <p>
                  Saved decision: <strong>{row.decision}</strong> ·{" "}
                  {row.participating
                    ? "Confirmed participant"
                    : "Not counted as participating"}
                </p>
                <p className="text-sm">
                  Current inquiry contact:{" "}
                  {row.routing_email || "Not configured"} ·{" "}
                  {row.quote_routing_enabled ? "Enabled" : "Disabled"}
                </p>
                <p className="flex flex-wrap gap-4">
                  <a className="underline" href={"/installer/" + row.slug}>
                    Public profile
                  </a>
                  <a
                    className="underline"
                    href={
                      "/admin/contacts?shop=" +
                      encodeURIComponent(row.installer_id)
                    }
                  >
                    Review contact permission
                  </a>
                  <a
                    className="underline"
                    href={"/claim?shop=" + encodeURIComponent(row.installer_id)}
                  >
                    Owner update form
                  </a>
                </p>
                {row.missing.length > 0 && (
                  <details>
                    <summary className="cursor-pointer">
                      {row.missing.length} activation checks outstanding
                    </summary>
                    <ul className="list-disc pl-5">
                      {row.missing.map((m: string) => (
                        <li key={m}>{m}</li>
                      ))}
                    </ul>
                  </details>
                )}
                <details>
                  <summary className="cursor-pointer font-semibold">
                    Record owner confirmation and pilot decision
                  </summary>
                  <div className="grid gap-3 mt-4">
                    {fields.map(([key, label]) => (
                      <label key={key}>
                        {label}
                        <textarea
                          rows={key === "contact_email" ? 1 : 2}
                          maxLength={
                            key === "contact_email"
                              ? 255
                              : key === "note"
                                ? 1500
                                : 1000
                          }
                          className="input-field block w-full mt-1"
                          value={evidence[key] || ""}
                          onChange={(e) =>
                            setDrafts((all) => ({
                              ...all,
                              [row.installer_id]: {
                                ...d,
                                evidence: {
                                  ...d.evidence,
                                  [key]: e.target.value,
                                },
                              },
                            }))
                          }
                        />
                      </label>
                    ))}
                    <label>
                      Pilot decision
                      <select
                        className="input-field block w-full"
                        value={d.decision ?? row.decision}
                        onChange={(e) =>
                          setDrafts((all) => ({
                            ...all,
                            [row.installer_id]: {
                              ...d,
                              decision: e.target.value,
                            },
                          }))
                        }
                      >
                        {[
                          "candidate",
                          "reviewing",
                          "active",
                          "paused",
                          "declined",
                        ].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </label>
                    <p className="text-sm">
                      Pausing or declining the pilot changes participation only.
                      Use Contact permissions to stop all installation inquiry
                      delivery.
                    </p>
                    <button
                      className="btn-primary"
                      disabled={!!busy}
                      onClick={() => save(row)}
                    >
                      {busy === row.installer_id
                        ? "Saving…"
                        : "Save pilot review"}
                    </button>
                    {messages[row.installer_id] && (
                      <p role="status">{messages[row.installer_id]}</p>
                    )}
                  </div>
                </details>
              </article>
            );
          })}
        </>
      )}
    </div>
  );
}
