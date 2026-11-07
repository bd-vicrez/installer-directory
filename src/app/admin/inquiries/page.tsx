"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import InquiryDetail from "@/components/InquiryDetail";

type Scope = "verified" | "held" | "quarantined" | "all";
type Item = {
  submission_id: number;
  vehicle_year: number;
  vehicle_make: string;
  vehicle_model: string;
  service: string;
  flow: string;
  created_at: string;
  review_state: string;
  intake_scope: string;
  customer_state: string;
  routing_state: string;
  deliveries: {
    target_id: string;
    state: string;
    evidence: string | null;
    response_state: string | null;
    business_name: string;
  }[];
  followup: { state: string; next_followup_at: string | null } | null;
  ownership: {
    display_name: string | null;
    owner_name: string | null;
    actor: string;
    paused: boolean;
    zendesk_ticket_id: number | null;
  } | null;
};
type Workspace = {
  items: Item[];
  counts: Record<Scope, number>;
  scope: Scope;
  snapshot: number;
  next_cursor: number | null;
  selected_id: number | null;
  worker_recent: boolean;
  as_of: string;
};
const scopes: Scope[] = ["verified", "held", "quarantined", "all"];
const labels: Record<Scope, string> = {
  verified: "Verified intake",
  held: "Held",
  quarantined: "Quarantined",
  all: "All records",
};
function deliveryLabel(item: Item) {
  if (
    item.deliveries.some(
      (d) =>
        d.state === "failed" ||
        ["bounced", "dropped", "spam"].includes(d.evidence || ""),
    )
  )
    return "Delivery blocked";
  if (item.deliveries.some((d) => d.response_state)) return "Response recorded";
  if (
    item.deliveries.length &&
    item.deliveries.every((d) => d.evidence === "delivered")
  )
    return "Delivery confirmed";
  if (item.deliveries.some((d) => d.state === "accepted"))
    return "Delivery unconfirmed";
  if (item.intake_scope !== "verified") return "Intake held";
  return item.deliveries.length ? "Delivery pending" : "Routing needs review";
}
export default function InquiriesPage() {
  const [data, setData] = useState<Workspace | null>(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [expanded, setExpanded] = useState<number | null>(null);
  const pending = useRef<AbortController | null>(null);
  const load = useCallback(
    async (params: URLSearchParams, updateUrl = false) => {
      pending.current?.abort();
      const controller = new AbortController();
      pending.current = controller;
      setLoading(true);
      setError("");
      if (updateUrl) {
        const url = new URLSearchParams(params);
        if (url.has("id")) {
          url.set("request", url.get("id")!);
          url.delete("id");
        }
        window.history.pushState(
          null,
          "",
          "/admin/inquiries" + (url.size ? "?" + url : ""),
        );
      }
      try {
        const r = await fetch("/api/admin/inquiry-workspace?" + params, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!r.ok) throw Error();
        const next = await r.json();
        if (controller.signal.aborted) return;
        setData(next);
        if (next.selected_id) setExpanded(next.selected_id);
      } catch {
        if (!controller.signal.aborted)
          setError(
            "Refresh failed. The information below may be out of date. Actions are paused until a successful refresh.",
          );
      } finally {
        if (pending.current === controller) setLoading(false);
      }
    },
    [],
  );
  const restore = useCallback(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.has("request")) {
      p.set("id", p.get("request")!);
      p.delete("request");
    }
    void load(p);
  }, [load]);
  useEffect(() => {
    restore();
    window.addEventListener("popstate", restore);
    return () => {
      pending.current?.abort();
      window.removeEventListener("popstate", restore);
    };
  }, [restore]);
  const refresh = () => {
    const p = new URLSearchParams();
    if (data?.selected_id) p.set("id", String(data.selected_id));
    else p.set("scope", data?.scope || "verified");
    void load(p, true);
  };
  const choose = (scope: Scope) => {
    setExpanded(null);
    void load(new URLSearchParams({ scope }), true);
  };
  return (
    <div className="installer-ui inquiry-workspace">
      <div className="inquiry-heading">
        <div>
          <p className="ui-eyebrow">Installer operations</p>
          <h1>Inquiry workspace</h1>
          <p className="ui-muted">
            Review delivery, keep ownership clear, and record the next step.
          </p>
        </div>
        <button className="btn-secondary" disabled={loading} onClick={refresh}>
          {loading ? "Refreshing…" : "Refresh status"}
        </button>
      </div>
      <div className="inquiry-toolbar">
        <Link href="/admin/actions">Staff action queue →</Link>
        <Link href="/admin/contacts">Shop contact permissions →</Link>
      </div>
      {error && (
        <p role="alert" className="ui-notice">
          {error}
          <button
            className="underline ml-3"
            onClick={restore}
            disabled={loading}
          >
            Retry
          </button>
        </p>
      )}
      <nav className="inquiry-scopes" aria-label="Intake verification scope">
        {scopes.map((scope) => (
          <button
            key={scope}
            aria-pressed={
              !data?.selected_id && (data?.scope || "verified") === scope
            }
            onClick={() => choose(scope)}
            disabled={loading}
          >
            {labels[scope]}
            {data && <span>{data.counts[scope]}</span>}
          </button>
        ))}
      </nav>
      <p className="ui-muted text-sm">
        Scopes describe intake verification, not permission to send. Paused
        cases and recorded outcomes remain separate.
      </p>
      <div className="inquiry-status" role="status">
        {loading ? (
          "Loading inquiry records…"
        ) : data ? (
          <>
            Last refreshed {new Date(data.as_of).toLocaleString()}.{" "}
            {data.worker_recent
              ? "Delivery worker checked in recently."
              : "Delivery worker check-in is overdue; review operations."}
          </>
        ) : (
          "Loading workspace…"
        )}
      </div>
      {data && (
        <div aria-busy={loading}>
          {data.selected_id && (
            <div className="ui-notice">
              Showing VZ-{data.selected_id} across all scopes.{" "}
              <button className="underline" onClick={() => choose("verified")}>
                Return to verified intake
              </button>
            </div>
          )}
          {!data.items.length && (
            <div className="inquiry-empty">
              <h2>
                {data.selected_id
                  ? "Inquiry not found"
                  : "No records in this view"}
              </h2>
              <p>Change the scope or refresh to check for new requests.</p>
            </div>
          )}
          <div className="inquiry-list">
            {data.items.map((item) => (
              <article className="inquiry-case" key={item.submission_id}>
                <div className="inquiry-case-heading">
                  <div>
                    <p className="ui-eyebrow">VZ-{item.submission_id}</p>
                    <h2>
                      {item.vehicle_year} {item.vehicle_make}{" "}
                      {item.vehicle_model}
                    </h2>
                    <p className="ui-muted text-sm">
                      {item.service.replaceAll("-", " ")} ·{" "}
                      {item.flow === "selected"
                        ? "Selected shop"
                        : item.flow === "legacy"
                          ? "Legacy review"
                          : "Network match"}
                    </p>
                  </div>
                  <span className="inquiry-badge">{deliveryLabel(item)}</span>
                </div>
                <div className="inquiry-tags">
                  {item.deliveries.map((d) => (
                    <Link
                      href={
                        "/admin/contacts?shop=" +
                        encodeURIComponent(d.target_id)
                      }
                      key={d.target_id}
                      className="inquiry-badge"
                    >
                      {d.business_name}
                    </Link>
                  ))}
                  <span className="inquiry-badge">
                    {item.followup?.state
                      ? "Outcome: " + item.followup.state
                      : "No outcome recorded"}
                  </span>
                  {item.ownership?.paused && (
                    <span className="inquiry-badge inquiry-paused">
                      Automation paused
                    </span>
                  )}
                  {["closed", "withdrawn"].includes(item.customer_state) && (
                    <span className="inquiry-badge">
                      Customer {item.customer_state}
                    </span>
                  )}
                </div>
                <p className="ui-muted text-sm">
                  {item.intake_scope === "verified"
                    ? "Shop replies go directly to the customer; direct email activity may not be recorded here."
                    : "Held and quarantined requests are excluded from automatic delivery. Opening this record does not release it."}
                </p>
                <div className="inquiry-case-footer">
                  <span>
                    Owner:{" "}
                    <strong>
                      {item.ownership?.display_name ||
                        item.ownership?.owner_name ||
                        "Unassigned"}
                    </strong>
                    {item.ownership?.zendesk_ticket_id && (
                      <>
                        {" "}
                        ·{" "}
                        <a
                          className="underline"
                          href={
                            "https://vicrezcom.zendesk.com/agent/tickets/" +
                            item.ownership.zendesk_ticket_id
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Ticket #{item.ownership.zendesk_ticket_id}
                        </a>
                      </>
                    )}
                    {item.followup?.next_followup_at && (
                      <>
                        {" "}
                        · Follow-up{" "}
                        {new Date(
                          item.followup.next_followup_at,
                        ).toLocaleString()}
                      </>
                    )}
                  </span>
                  <button
                    className="btn-secondary"
                    aria-expanded={expanded === item.submission_id}
                    onClick={() =>
                      setExpanded(
                        expanded === item.submission_id
                          ? null
                          : item.submission_id,
                      )
                    }
                  >
                    {expanded === item.submission_id
                      ? "Close details"
                      : "View case →"}
                  </button>
                </div>
                {expanded === item.submission_id && (
                  <InquiryDetail
                    key={item.submission_id}
                    id={item.submission_id}
                    stale={!!error || loading}
                    onChanged={refresh}
                  />
                )}
              </article>
            ))}
          </div>
          <div className="inquiry-pagination">
            <p className="ui-muted text-sm">
              {data.items.length} records on this page · newest first. Refresh
              to include new arrivals.
            </p>
            {data.next_cursor && (
              <button
                disabled={loading}
                className="btn-secondary"
                onClick={() => {
                  setExpanded(null);
                  void load(
                    new URLSearchParams({
                      scope: data.scope,
                      before: String(data.next_cursor),
                      snapshot: String(data.snapshot),
                    }),
                    true,
                  );
                }}
              >
                Next page →
              </button>
            )}
            <button
              disabled={loading}
              className="btn-secondary"
              onClick={refresh}
            >
              First page / refresh
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
