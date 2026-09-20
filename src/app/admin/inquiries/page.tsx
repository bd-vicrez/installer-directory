"use client";
import { useEffect, useState } from "react";
import InquiryFollowup from "@/components/InquiryFollowup";
import Link from "next/link";
type Inquiry = {
  submission_id: number;
  acquisition?: { source: string; channel: string };
  created_at: string;
  flow: string;
  service: string;
  routing_state: string;
  routing_reason: string | null;
  full_name: string;
  email: string;
  phone: string;
  vehicle_year: number;
  vehicle_make: string;
  vehicle_model: string;
  notes: string;
  deliveries: {
    target_id: string;
    state: string;
    attempts: number;
    last_error: string | null;
    response_state?: string;
    response_note?: string;
    response_updated_at?: string;
    first_responded_at?: string;
    response_link_expires_at?: number;
    unanswered_over_48h?: number;
  }[];
};
type Dashboard = {
  requests: Inquiry[];
  routing_counts: Record<string, number>;
  delivery_counts: Record<string, number>;
  worker_recent: boolean;
  shop_response_counts?: Record<string, number>;
  unanswered_over_48h?: number;
};
export default function InquiriesPage() {
  const [data, setData] = useState<Dashboard | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/inquiries", {
        cache: "no-store",
      });
      if (!response.ok) throw new Error();
      setData(await response.json());
    } catch {
      setError("Could not load inquiry status. Please retry.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  return (
    <div className="space-y-6 max-w-6xl text-gray-100 [&_.card]:text-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Installation inquiries</h1>
        <button onClick={refresh} disabled={loading} className="btn-secondary">
          {loading ? "Loading…" : "Refresh status"}
        </button>
      </div>
      <p className="text-gray-300">
        Saved directory installation requests. A provider-accepted notification
        is not proof of inbox delivery or a shop response. Historical requests
        remain in the existing RFQ records.
      </p>
      <Link className="text-vicrez-red underline" href="/admin/contacts">
        Review shop contact permissions
      </Link>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {data && (
        <>
          <div
            role="status"
            className={
              "p-4 rounded-xl border " +
              (data.worker_recent
                ? "bg-green-50 border-green-200 text-green-900"
                : "bg-amber-50 border-amber-300 text-amber-900")
            }
          >
            {data.worker_recent
              ? "Delivery worker checked in recently."
              : "The delivery worker has not checked in recently. Escalate to engineering."}
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="card p-4">
              Saved requests:{" "}
              <strong>
                {Object.values(data.routing_counts).reduce((a, b) => a + b, 0)}
              </strong>
            </div>
            <div className="card p-4">
              Routing needs review:{" "}
              <strong>
                {(data.routing_counts.needs_review || 0) +
                  (data.routing_counts.failed || 0)}
              </strong>
            </div>
            <div className="card p-4">
              Failed/cancelled notifications:{" "}
              <strong>
                {(data.delivery_counts.failed || 0) +
                  (data.delivery_counts.cancelled || 0)}
              </strong>
            </div>
          </div>
          <div className="card p-4 space-y-2">
            <p>
              <strong>Shop responses:</strong>{" "}
              {Object.entries(data.shop_response_counts || {})
                .map(([k, v]) => `${k.replaceAll("_", " ")}: ${v}`)
                .join(" · ") || "No recorded responses yet"}
            </p>
            <p>
              <strong>{data.unanswered_over_48h || 0}</strong> response-enabled
              notifications have no shop reply after 48 elapsed hours. This is a
              staff review threshold, not a promised shop response time.
            </p>
          </div>
          {!data.requests.length && (
            <p className="card p-6">
              No requests have been saved through the new directory flow yet.
            </p>
          )}
          {data.requests.map((item) => (
            <article key={item.submission_id} className="card p-5 space-y-3">
              <div className="flex flex-wrap justify-between gap-2">
                <h2 className="font-semibold">
                  VZ-{item.submission_id} · {item.full_name}
                </h2>
                <span className="text-sm text-gray-600">
                  {item.created_at} UTC
                </span>
              </div>
              <p>
                {item.vehicle_year} {item.vehicle_make} {item.vehicle_model} ·{" "}
                {item.service} ·{" "}
                {item.flow === "selected" ? "Selected shop" : "Network match"}
              </p>
              <p className="text-sm">
                Source: {item.acquisition?.source || "unknown"} ·{" "}
                {item.acquisition?.channel || "unknown"}
              </p>
              <p className="text-sm">
                Routing: <strong>{item.routing_state}</strong>
                {item.routing_reason ? " — " + item.routing_reason : ""}
              </p>
              <p className="text-sm break-words">
                Customer: {item.email} · {item.phone}
              </p>
              {item.notes && (
                <p className="text-sm whitespace-pre-wrap">{item.notes}</p>
              )}
              {item.deliveries.map((delivery) => (
                <p key={delivery.target_id} className="text-sm">
                  Shop{" "}
                  <Link
                    className="text-vicrez-red underline"
                    href={
                      "/admin/contacts?shop=" +
                      encodeURIComponent(delivery.target_id)
                    }
                  >
                    {delivery.target_id}
                  </Link>
                  :{" "}
                  <strong>
                    {delivery.state === "accepted"
                      ? "Provider accepted"
                      : delivery.state}
                  </strong>{" "}
                  · {delivery.attempts} attempt(s)
                  {delivery.last_error ? " · " + delivery.last_error : ""}
                  <span className="block mt-1">
                    Shop response:{" "}
                    <strong>
                      {delivery.response_state?.replaceAll("_", " ") ||
                        (delivery.response_link_expires_at
                          ? "Awaiting response"
                          : "No response link in this historical notice")}
                    </strong>
                    {delivery.response_updated_at &&
                      " · " +
                        new Date(delivery.response_updated_at).toLocaleString()}
                  </span>
                  {delivery.response_note && (
                    <span className="block whitespace-pre-wrap">
                      Shop note: {delivery.response_note}
                    </span>
                  )}
                  {!!delivery.unanswered_over_48h && (
                    <span className="block text-amber-800 font-semibold">
                      Staff follow-up needed: no shop response after 48 elapsed
                      hours.
                    </span>
                  )}
                </p>
              ))}
              {item.routing_state === "needs_review" && (
                <p className="text-sm text-amber-800">
                  Review service/contact eligibility before arranging any new
                  recipient. A selected-shop request must not be reassigned
                  without the customer’s permission.
                </p>
              )}
              <InquiryFollowup id={item.submission_id} />
            </article>
          ))}
        </>
      )}
    </div>
  );
}
