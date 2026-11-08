"use client";
import { useEffect, useState } from "react";
export default function VerificationStatus({
  kind,
}: {
  kind: "applications" | "claims";
}) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch("/api/admin/verification", { cache: "no-store" });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        if (!cancelled) {
          setData(d);
          setError("");
        }
      } catch {
        if (!cancelled)
          setError(
            "Worker status is unavailable. Check Operations before assuming reviews are running.",
          );
      }
    }
    void load();
    const timer = setInterval(() => void load(), 60000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);
  const run = data?.run;
  const recent =
    run && Date.now() - new Date(run.checked_at).getTime() < 2 * 3600000;
  return (
    <section
      className="rounded-xl border border-blue-200 bg-blue-50 text-slate-900 p-4 space-y-2"
      aria-label="Autonomous verification status"
    >
      <h2 className="font-semibold">Autonomous shop verification</h2>
      <p>
        {error || !data
          ? error || "Checking the VPS worker…"
          : !run
            ? "Waiting for the verification worker’s first check-in."
            : !recent
              ? "Worker check-in is overdue. Staff attention is needed."
              : run.ok
                ? "Worker checked in successfully. Reviews run hourly within the daily research limit."
                : "Worker checked in with an error. Some reviews need a retry; see Operations."}
      </p>
      {run && (
        <p className="text-sm">
          Last check: {new Date(run.checked_at).toLocaleString()} ·{" "}
          {run.details.applications_reviewed || 0} applications and{" "}
          {run.details.claims_reviewed || 0} ownership requests reviewed in that
          run.
        </p>
      )}
      <p className="text-sm">
        {kind === "applications"
          ? "New submissions are reviewed before older retries. Approval requires corroborated business identity, public address and advertised services. Unverified shops stay held."
          : "Owner access requires a verified business contact and explicit confirmation through a private email link. Conflicting claims, unrelated contacts and expired proof stay with staff. Requested public edits require a separate review."}
      </p>
      {data?.metrics && (
        <div className="border-t border-blue-200 pt-3 space-y-3">
          <p className="text-sm">
            Research attempts today (UTC):{" "}
            <strong>{data.metrics.attempts_used_utc_day}</strong>
            {Number.isInteger(run?.details?.max_reviews_per_day) && (
              <>
                {" "}
                of {run.details.max_reviews_per_day} ·{" "}
                {Math.max(
                  0,
                  run.details.max_reviews_per_day -
                    data.metrics.attempts_used_utc_day,
                )}{" "}
                remaining
              </>
            )}
            . Failed research attempts also count. The allowance resets at
            midnight UTC.
          </p>
          <div className="overflow-x-auto">
            <table className="text-sm w-full text-left">
              <caption className="text-left font-semibold mb-2">
                Verification queue
              </caption>
              <thead>
                <tr>
                  <th className="pr-4">Requests</th>
                  <th className="pr-4">Not reviewed</th>
                  <th className="pr-4">Held</th>
                  <th className="pr-4">Waiting for email confirmation</th>
                  <th>Oldest not reviewed</th>
                </tr>
              </thead>
              <tbody>
                {data.metrics.queue.map((q: any) => (
                  <tr key={q.kind}>
                    <th className="py-2 pr-4">
                      {q.kind === "claim" ? "Ownership" : "Applications"}
                    </th>
                    <td>{q.unreviewed}</td>
                    <td>{q.held}</td>
                    <td>{q.awaiting_confirmation}</td>
                    <td>
                      {q.oldest_unreviewed_at
                        ? new Date(q.oldest_unreviewed_at).toLocaleString()
                        : "None"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm">
            Ownership confirmations in the last 30 days:{" "}
            <strong>{data.metrics.proofs.confirmed_30d}</strong> · Expired,
            unconsumed links: {data.metrics.proofs.expired}
          </p>
          <details>
            <summary className="cursor-pointer font-medium">
              Verification email delivery — last 30 days
            </summary>
            <ul className="text-sm list-disc pl-5 mt-2">
              {data.metrics.delivery_30d.map((d: any) => (
                <li key={d.outcome + ":" + d.state}>
                  {d.outcome === "ownership_verification"
                    ? "Ownership links"
                    : "Quote inbox tests"}{" "}
                  — {d.state.replaceAll("_", " ")}: {d.count}
                </li>
              ))}
            </ul>
            <p className="text-sm mt-2">
              Accepted means the provider received the send request. Delivered
              means the receiving server accepted it. Only explicit confirmation
              completes verification.
            </p>
          </details>
          <p className="text-sm">
            Independent alert monitor:{" "}
            {data.metrics.watchdog &&
            Date.now() - new Date(data.metrics.watchdog.checked_at).getTime() <
              20 * 60000 &&
            data.metrics.watchdog.ok
              ? "Checked in within 20 minutes"
              : "Check-in missing or overdue — review Operations"}
            .
          </p>
        </div>
      )}
      <a href="/admin/operations" className="text-sm underline">
        View operations and delivery evidence
      </a>
    </section>
  );
}
