"use client";
import { useEffect, useState } from "react";
export default function OperationsPage() {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState("");
  async function refresh() {
    try {
      const r = await fetch("/api/admin/operations", { cache: "no-store" });
      if (!r.ok) throw Error();
      setData(await r.json());
      setError("");
    } catch {
      setError("Could not load operations. Try again.");
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  return (
    <div className="max-w-6xl space-y-6 text-gray-100 [&_.card]:text-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Installer operations</h1>
        <button className="btn-secondary" onClick={refresh}>
          Refresh
        </button>
      </div>
      <p>
        Review requests, notification outcomes and measured visitor actions.
        Provider acceptance and delivery to the receiving mail server are
        separate from a person reading or answering a message.
      </p>
      {error && <p role="alert">{error}</p>}
      {data && (
        <>
          <section className="card p-5 space-y-3">
            <h2 className="font-bold">Notification service</h2>
            <p>
              Automatic request updates:{" "}
              {data.notifications_enabled ? "Enabled" : "Paused"}
            </p>
            <div className="flex flex-wrap gap-4">
              {data.notification_states.map((s: any) => (
                <span key={s.state}>
                  {s.state}: <strong>{s.count}</strong>
                </span>
              ))}
            </div>
            {data.runs.map((r: any) => (
              <p key={r.name}>
                {r.name}:{" "}
                {!r.ok
                  ? "Needs attention"
                  : Date.now() - new Date(r.checked_at).getTime() >
                      (["backup", "installer-agent", "contact-health"].includes(r.name) ? 30 * 3600000 : 15 * 60000)
                    ? "Check-in overdue"
                    : "Last check passed"}{" "}
                · {new Date(r.checked_at).toLocaleString()}
              </p>
            ))}
            <p className="text-sm">
              Uncertain sends require provider reconciliation before retrying.
              Held messages require review. Internal review notes are never
              included in requester emails.
            </p>
          </section>
          {data.runs.filter((r: any) => r.name === "contact-health").map((run: any) => (
            <section key={run.name} className="card p-5 space-y-3">
              <h2 className="font-bold">Shop contact health</h2>
              <p>Daily check · {run.details.checked ?? 0} contacts reviewed · {run.details.paused_awaiting_review ?? 0} paused pending review.</p>
              <p className="text-sm">Owner: {run.details.owner || "Staff review required"}. A working mail route does not prove a shop reads or answers inquiries. Verify the business contact and permission before manually re-enabling a paused shop.</p>
              {!!run.details.provider_errors?.length && <p role="alert">Provider checks were incomplete. Uncertain results require review.</p>}
              {run.details.error && <p role="alert">The check could not finish. Review the VPS contact health report.</p>}
              <details>
                <summary className="cursor-pointer font-semibold">Contacts needing attention ({run.details.issues?.length ?? 0})</summary>
                <ul className="space-y-2 mt-3">
                  {(run.details.issues || []).map((item: any) => (
                    <li key={item.installer_id} className="text-sm">
                      {item.business_name}: {item.reason.replaceAll("_", " ")} · {item.paused_by_checker ? "Routing paused" : "Needs review"}
                    </li>
                  ))}
                </ul>
              </details>
            </section>
          ))}
          <section className="card p-5 space-y-3">
            <h2 className="font-bold">Review age</h2>
            {["applications", "claims"].map((k) => (
              <div key={k}>
                <h3 className="capitalize font-semibold">
                  <a className="underline" href={"/admin/" + k}>
                    {k}
                  </a>
                </h3>
                {data[k].length ? (
                  data[k].map((r: any) => (
                    <p key={r.status}>
                      {r.status}: {r.count} · oldest {r.oldest_days} days
                    </p>
                  ))
                ) : (
                  <p>No open requests.</p>
                )}
              </div>
            ))}
          </section>
          <section className="card p-5 space-y-3">
            <h2 className="font-bold">Discovery: last 30 days</h2>
            <p>
              Requests saved in the database: {data.saved.applications}{" "}
              applications · {data.saved.claims} claims. These totals include
              requests received before this release.
            </p>
            <p>
              Search sessions: {data.funnel.search_sessions} · Search sessions
              with a supported contact click:{" "}
              {data.funnel.search_contact_sessions} · Sessions with an empty
              search: {data.funnel.zero_result_sessions}
            </p>
            <p className="text-sm">
              Anonymous browser sessions and clicks are not unique people,
              completed calls or bookings. Data starts with this release and
              excludes visitors opting out through Do Not Track. No search text,
              ZIP, email or phone is stored here.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr>
                    <th className="p-2">Action</th>
                    <th>Events</th>
                    <th>Sessions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.events.map((r: any) => (
                    <tr key={r.event}>
                      <td className="p-2">{r.event}</td>
                      <td>{r.events}</td>
                      <td>{r.sessions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="card p-5 space-y-3">
            <h2 className="font-bold">Recent request notifications</h2>
            {!data.notifications.length && (
              <p>No notifications queued since this release.</p>
            )}
            {data.notifications.map((r: any) => (
              <article key={r.id} className="border-t pt-3 text-sm">
                <p className="font-semibold">
                  {r.reference} · {r.outcome} · {r.state}
                </p>
                <p>
                  {new Date(r.created_at).toLocaleString()} · {r.attempts} send
                  attempt(s)
                </p>
                {r.last_error && <p>{r.last_error}</p>}
                {r.delivered_at && (
                  <p>
                    Delivery to the receiving mail server confirmed at:{" "}
                    {new Date(r.delivered_at).toLocaleString()}
                  </p>
                )}
              </article>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
