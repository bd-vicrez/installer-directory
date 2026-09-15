"use client";
import ReviewHistory from "./ReviewHistory";
import { useEffect, useState } from "react";
export default function ReviewQueue({
  kind,
}: {
  kind: "applications" | "claims";
}) {
  const [rows, setRows] = useState<any[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(""),
    [filter, setFilter] = useState("open");
  const [drafts, setDrafts] = useState<Record<string, any>>({});
  const endpoint =
    kind === "applications" ? "/api/applications" : "/api/admin/claims";
  async function load() {
    try {
      const r = await fetch(endpoint);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Unable to load review queue.");
      setRows(d[kind]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Queue unavailable.");
    }
  }
  useEffect(() => {
    load();
  }, [kind]);
  const change = (id: string, key: string, value: any) =>
    setDrafts((d) => ({ ...d, [id]: { ...d[id], [key]: value } }));
  async function save(row: any, action?: string) {
    setError("");
    setBusy(row.id);
    try {
      const draft = drafts[row.id] || {},
        r = await fetch(
          kind === "applications" ? endpoint + "/" + row.id : endpoint,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reviewer: row.reviewer,
              note: row.review_note,
              public_message: row.public_message,
              verification_channel: row.verification_channel,
              verification_evidence: row.verification_evidence,
              street_address: row.street_address,
              city: row.city,
              state: row.state,
              zip_code: row.zip_code,
              ...draft,
              id: row.id,
              action,
              status: draft.status || row.status,
            }),
          },
        );
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Unable to save.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save.");
    } finally {
      setBusy("");
    }
  }
  return (
    <div className="max-w-5xl space-y-6">
      <h1 className="text-2xl font-bold capitalize">{kind} review queue</h1>
      <p>
        Vicrez installer operations · Review oldest requests first. Submission
        does not establish business ownership or certification. Status messages
        are visible through the requester’s private link; email notifications
        are not enabled.
      </p>
      <label>
        Queue{" "}
        <select
          className="input-field ml-2"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="open">Open requests</option>
          <option value="all">All requests (up to 200)</option>
        </select>
      </label>
      {error && (
        <p role="alert" className="text-red-700 bg-red-50 p-3">
          {error}
        </p>
      )}
      {rows
        .filter(
          (r) =>
            filter === "all" ||
            ["pending", "needs_information", "verified"].includes(r.status),
        )
        .map((row) => {
          const d = drafts[row.id] || {};
          const field = (key: string, label: string, value = "") => (
            <label className="block text-sm">
              {label}
              <input
                className="input-field w-full mt-1"
                maxLength={
                  key === "note" || key === "verification_evidence" ? 1500 : 500
                }
                value={d[key] ?? value}
                onChange={(e) => change(row.id, key, e.target.value)}
              />
            </label>
          );
          const check = (key: string, label: string) => (
            <label className="flex items-start gap-2 text-sm">
              <input
                className="mt-1"
                type="checkbox"
                checked={d[key] === true}
                onChange={(e) => change(row.id, key, e.target.checked)}
              />
              {label}
            </label>
          );
          return (
            <article
              key={row.id}
              className="bg-white text-gray-900 border rounded-xl p-5 space-y-4"
            >
              <div>
                <h2 className="text-xl font-semibold">{row.business_name}</h2>
                <p>
                  {row.application_id ||
                    "CLM-" + row.id.slice(0, 8).toUpperCase()}{" "}
                  · {row.status} ·{" "}
                  {Math.max(0, Math.floor(Number(row.age_days)))} days old
                </p>
                <p>
                  {row.street_address} {row.city} {row.state} {row.zip_code}
                </p>
                <p>
                  {row.email} · {row.phone || row.relationship}
                </p>
              </div>
              {row.correction && (
                <p className="whitespace-pre-wrap">
                  Requested correction: {row.correction}
                </p>
              )}
              <details>
                <summary className="cursor-pointer font-medium">
                  Submitted fields and services
                </summary>
                <dl className="space-y-2 mt-3">
                  {Object.entries({
                    ...row.details,
                    services: row.install_capabilities || row.details?.services,
                  }).map(([key, value]) => (
                    <div key={key}>
                      <dt className="font-medium">
                        {key.replaceAll("_", " ")}
                      </dt>
                      <dd className="whitespace-pre-wrap break-words">
                        {Array.isArray(value)
                          ? value.join(", ")
                          : value == null
                            ? "Not provided"
                            : String(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p>
                  Consent:{" "}
                  {row.consent_version || "Legacy record; not captured"}{" "}
                  {row.consent_at || ""}
                </p>
              </details>
              {row.duplicate_candidates?.length > 0 && (
                <div className="bg-amber-50 p-3">
                  <p>Potential existing listings — review before approval:</p>
                  {row.duplicate_candidates.map((c: any) => (
                    <a
                      key={c.id}
                      className="block underline"
                      href={"/installer/" + c.slug}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {c.name}
                    </a>
                  ))}
                  <p>
                    A shared phone or address does not by itself prove
                    duplication.
                  </p>
                </div>
              )}
              {field("reviewer", "Reviewer name", row.reviewer)}
              {field(
                "note",
                "Internal review note (at least 10 characters)",
                row.review_note,
              )}
              {field(
                "public_message",
                "Message visible to the requester",
                row.public_message,
              )}
              {kind === "applications" ? (
                <>
                  <details>
                    <summary>Correct pending application address</summary>
                    <div className="space-y-3 my-3">
                      {field(
                        "street_address",
                        "Street address",
                        row.street_address,
                      )}
                      {field("city", "City", row.city)}
                      {field("state", "State", row.state)}
                      {field("zip_code", "ZIP", row.zip_code)}
                      <button
                        className="btn-secondary"
                        disabled={busy === row.id}
                        onClick={() => save(row, "address")}
                      >
                        Save corrected address
                      </button>
                    </div>
                  </details>
                  <p>
                    Location:{" "}
                    {row.location_evidence
                      ? row.location_evidence.formatted_address +
                        " · " +
                        row.location_evidence.precision +
                        (row.location_evidence.eligible
                          ? " · eligible for review"
                          : " · needs clarification")
                      : "Not confirmed — approval blocked"}
                  </p>
                  <button
                    className="btn-secondary"
                    disabled={busy === row.id}
                    onClick={() => save(row, "locate")}
                  >
                    Look up full business address
                  </button>
                  {check(
                    "confirm_location",
                    "I checked the matching full street address and map location.",
                  )}
                  {check(
                    "confirm_identity",
                    "I verified this business and the applicant’s authority through an independent business-controlled channel.",
                  )}
                  {check(
                    "confirm_duplicates",
                    "I reviewed potential duplicates; this is a distinct listing.",
                  )}
                  {check(
                    "confirm_inquiry_contact",
                    "I verified the inquiry email. Enable only if the application explicitly opted in.",
                  )}
                  {check(
                    "confirm_publish",
                    "I reviewed the submitted shop details and permission to publish them with this new listing.",
                  )}
                </>
              ) : (
                <>
                  <p>
                    <a className="underline" href={"/installer/" + row.slug}>
                      View affected listing
                    </a>{" "}
                    ·{" "}
                    <a className="underline" href="/admin/installers">
                      Review contact/address correction
                    </a>
                  </p>
                  <label className="block">
                    Verification channel
                    <select
                      className="input-field w-full"
                      value={d.verification_channel ?? row.verification_channel}
                      onChange={(e) =>
                        change(row.id, "verification_channel", e.target.value)
                      }
                    >
                      <option value="">Choose evidence source</option>
                      <option value="business-domain-email">
                        Business domain email challenge, manually verified
                      </option>
                      <option value="existing-business-phone">
                        Independently sourced business phone callback
                      </option>
                      <option value="business-document-review">
                        Business document review
                      </option>
                    </select>
                  </label>
                  {field(
                    "verification_evidence",
                    "Verification evidence, source and date",
                    row.verification_evidence,
                  )}
                  {check(
                    "confirm_identity",
                    "I verified control through this channel; knowing the public contact information alone was not accepted.",
                  )}
                  {check(
                    "publish_details",
                    "Publish the submitted service details and replace declared service categories when present.",
                  )}
                  {check(
                    "confirm_publish",
                    "I reviewed the exact details and the shop’s permission to publish them.",
                  )}
                </>
              )}
              <label className="block">
                Review decision
                <select
                  className="input-field w-full mt-1"
                  value={d.status || row.status}
                  onChange={(e) => change(row.id, "status", e.target.value)}
                >
                  {(kind === "applications"
                    ? ["pending", "needs_information", "approved", "rejected"]
                    : [
                        "pending",
                        "needs_information",
                        "verified",
                        "resolved",
                        "rejected",
                      ]
                  ).map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <button
                className="btn-primary"
                disabled={busy === row.id}
                onClick={() => save(row)}
              >
                {busy === row.id ? "Saving…" : "Save review"}
              </button>
              <ReviewHistory
                kind={kind === "applications" ? "application" : "claim"}
                id={row.id}
              />
            </article>
          );
        })}
      {!rows.length && <p>No requests in the queue.</p>}
    </div>
  );
}
