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
      <a href="/admin/operations" className="text-sm underline">
        View operations and delivery evidence
      </a>
    </section>
  );
}
