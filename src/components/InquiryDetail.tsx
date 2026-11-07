"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import InquiryIntakeReview from "./InquiryIntakeReview";
import InquiryProject from "./InquiryProject";
import InquiryFollowup from "./InquiryFollowup";
import InquiryReminder from "./InquiryReminder";

export default function InquiryDetail({
  id,
  stale,
  onChanged,
}: {
  id: number;
  stale: boolean;
  onChanged: () => void;
}) {
  const [item, setItem] = useState<any>(null),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setItem(null);
    setError("");
    fetch("/api/admin/inquiries?id=" + id, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((d) => {
        if (controller.signal.aborted) return;
        const row = d.requests?.find((r: any) => r.submission_id === id);
        if (!row) throw Error();
        setItem(row);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError(
            "Case details could not load. Refresh before taking action.",
          );
      });
    return () => controller.abort();
  }, [id, revision]);
  const refresh = () => {
    setRevision((n) => n + 1);
    onChanged();
  };
  return (
    <div className="inquiry-detail">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h3>Case details · VZ-{id}</h3>
        <button type="button" className="btn-secondary" onClick={refresh}>
          Refresh case
        </button>
      </div>
      {error && (
        <p role="alert" className="ui-error">
          {error}
        </p>
      )}
      {!item && !error && <p role="status">Loading private case details…</p>}
      {item && (
        <>
          <dl className="inquiry-facts">
            <div>
              <dt>Customer</dt>
              <dd>{item.full_name}</dd>
            </div>
            <div>
              <dt>Contact</dt>
              <dd className="break-words">
                {item.email}
                <br />
                {item.phone}
              </dd>
            </div>
            <div>
              <dt>Routing</dt>
              <dd>
                {item.routing_state?.replaceAll("_", " ")}
                {item.routing_reason &&
                  " · " + item.routing_reason.replaceAll("_", " ")}
              </dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>
                {item.acquisition?.source || "unknown"} ·{" "}
                {item.flow === "selected"
                  ? "Selected shop"
                  : item.flow === "legacy"
                    ? "Legacy inquiry"
                    : "Network match"}
              </dd>
            </div>
          </dl>
          {item.notes && (
            <p className="whitespace-pre-wrap break-words text-sm">
              {item.notes}
            </p>
          )}
          {item.customer_action?.state !== "open" &&
            item.customer_action?.state && (
              <p className="ui-notice">
                Customer action:{" "}
                {item.customer_action.state.replaceAll("_", " ")} ·{" "}
                {item.customer_action.note}
              </p>
            )}
          <p className="ui-muted text-sm">
            Direct email conversations may not appear here. Record outcomes only
            from actual shop or customer confirmation.
          </p>
          <fieldset disabled={stale} className="grid gap-4 min-w-0">
            <legend className="sr-only">Case review and follow-up</legend>
            {item.intake_review && (
              <InquiryIntakeReview
                id={id}
                review={item.intake_review}
                refresh={refresh}
              />
            )}
            {item.flow !== "legacy" && <InquiryProject scope="staff" id={id} />}
            {item.deliveries.map((d: any) => (
              <div className="inquiry-delivery" key={d.job_id}>
                <p>
                  <Link
                    className="underline"
                    href={
                      "/admin/contacts?shop=" + encodeURIComponent(d.target_id)
                    }
                  >
                    Shop contact record
                  </Link>{" "}
                  ·{" "}
                  {d.state === "accepted"
                    ? "Provider accepted"
                    : d.state?.replaceAll("_", " ")}
                </p>
                <p>
                  Delivery evidence:{" "}
                  <strong>
                    {(d.provider_delivery?.state || "unconfirmed").replaceAll(
                      "_",
                      " ",
                    )}
                  </strong>
                  . Delivery does not confirm a reply or appointment.
                </p>
                <p>
                  Recorded response:{" "}
                  {d.response_state?.replaceAll("_", " ") || "None recorded"}
                </p>
                {d.response_note && (
                  <p className="whitespace-pre-wrap break-words">
                    {d.response_note}
                  </p>
                )}
                {!!d.unanswered_over_48h && (
                  <p className="ui-notice">
                    No response recorded after 48 hours. Check for a direct
                    conversation before following up.
                  </p>
                )}
                {!!d.delivery_unconfirmed_over_1h && (
                  <p className="ui-notice">
                    Delivery remains unconfirmed. Review evidence before
                    considering another send.
                  </p>
                )}
                {d.last_error && (
                  <details>
                    <summary>Delivery diagnostic</summary>
                    <p className="break-words">{d.last_error}</p>
                  </details>
                )}
                {["verified", "released"].includes(item.intake_review?.state) &&
                  !!d.unanswered_over_48h &&
                  !["closed", "withdrawn"].includes(
                    item.customer_action?.state,
                  ) && (
                    <InquiryReminder job={d.job_id} state={d.reminder_state} />
                  )}
              </div>
            ))}
            <InquiryFollowup key={id} id={id} />
          </fieldset>
          {stale && (
            <p role="alert" className="ui-notice">
              The workspace is out of date. Refresh it before taking action.
            </p>
          )}
        </>
      )}
    </div>
  );
}
