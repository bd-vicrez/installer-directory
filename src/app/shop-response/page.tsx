"use client";
import InquiryProject from "@/components/InquiryProject";
import { useEffect, useRef, useState } from "react";
const labels: Record<string, string> = {
  interested: "Interested",
  needs_details: "Need more details",
  declined: "Cannot take this job",
};
export default function ShopResponsePage() {
  const token = useRef(""),
    pending = useRef<any>(null);
  const [data, setData] = useState<any>(null),
    [state, setState] = useState("interested"),
    [note, setNote] = useState("");
  const [customerMessage, setCustomerMessage] = useState("");
  const [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [retry, setRetry] = useState(false);
  async function load() {
    const r = await fetch("/api/shop-response", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: token.current, action: "view" }),
      cache: "no-store",
    });
    const d = await r.json();
    if (!r.ok) throw Error(d.error);
    setData(d);
    setState(d.response?.state || "interested");
    setNote(d.response?.note || "");
    setCustomerMessage(d.response?.customer_message || "");
  }
  useEffect(() => {
    token.current = window.location.hash.slice(1);
    if (!token.current) {
      setError(
        "Open the private response link in your installation inquiry email. For help, contact support@vicrez.com with the inquiry reference.",
      );
      return;
    }
    void load().catch((e) => setError(e.message));
  }, []);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    if (!pending.current)
      pending.current = {
        token: token.current,
        action: "save",
        state,
        note,
        customer_message: customerMessage,
        version: data.version,
        request_id: crypto.randomUUID(),
      };
    try {
      const r = await fetch("/api/shop-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pending.current),
      });
      const d = await r.json();
      if (!r.ok) {
        if ([400, 401, 403, 409, 410].includes(r.status)) {
          pending.current = null;
          setRetry(false);
        } else setRetry(true);
        throw Error(d.error);
      }
      pending.current = null;
      setRetry(false);
      setMessage(
        "Your response is saved. The customer can see the response status and any customer update on their private progress page. Your note for Vicrez stays private. No email was sent or appointment confirmed.",
      );
      try {
        await load();
      } catch {
        setError(
          "Response saved, but the latest details could not load. Reload this private link before making another change.",
        );
        setData(null);
      }
    } catch (e) {
      if (pending.current) setRetry(true);
      setError(
        e instanceof Error
          ? e.message
          : "Unable to confirm the save. Retry the same response.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="w-full max-w-2xl mx-auto px-4 py-10 space-y-5 text-gray-900">
      <p className="font-bold text-red-700">VICREZ INSTALLER NETWORK</p>
      <h1 className="text-3xl font-bold">Respond to an installation inquiry</h1>
      <p className="text-sm">
        Private shop link. Keep it within your authorized shop team.
      </p>
      {error && (
        <p
          role="alert"
          className="bg-red-50 border border-red-200 p-4 rounded-lg"
        >
          {error}
        </p>
      )}
      {message && (
        <p
          role="status"
          className="bg-green-50 border border-green-200 p-4 rounded-lg"
        >
          {message}
        </p>
      )}
      {data && (
        <>
          <section className="border rounded-xl p-5 space-y-2 bg-white">
            <h2 className="text-xl font-semibold">
              {data.shop} · {data.reference}
            </h2>
            <p>
              {data.vehicle} · {data.service}
            </p>
            <p className="font-semibold">{data.work}</p>
            <p className="whitespace-pre-wrap">{data.notes}</p>
            <p>Customer: {data.customer_name}</p>
            <p className="flex gap-4 flex-wrap">
              <a
                className="underline"
                href={"mailto:" + encodeURIComponent(data.customer_email)}
              >
                Email customer
              </a>
              <a className="underline" href={"tel:" + data.customer_phone}>
                Call customer
              </a>
            </p>
            <p className="text-sm">
              Saved response:{" "}
              <strong>
                {data.response
                  ? labels[data.response.state]
                  : "No response yet"}
              </strong>
              {data.response &&
                " · " + new Date(data.response.updated_at).toLocaleString()}
            </p>
          </section>
          <InquiryProject scope="shop" token={token.current} />
          <form
            onSubmit={save}
            className="border bg-white rounded-xl p-5 space-y-4"
          >
            <fieldset disabled={busy || retry} className="space-y-3">
              <legend className="font-semibold mb-2">
                Can your shop help with this request?
              </legend>
              {Object.entries(labels).map(([value, label]) => (
                <label className="flex gap-3 items-start" key={value}>
                  <input
                    type="radio"
                    name="response"
                    className="mt-1"
                    value={value}
                    checked={state === value}
                    onChange={() => setState(value)}
                  />
                  {label}
                </label>
              ))}
              <label className="block">
                Note for the Vicrez team (optional; private)
                <textarea
                  className="input-field block w-full mt-1"
                  rows={4}
                  maxLength={1000}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
              <label className="block">
                Update visible to the customer{" "}
                {state === "needs_details"
                  ? "— describe the missing information"
                  : "(optional)"}
                <textarea
                  minLength={state === "needs_details" ? 5 : 0}
                  required={state === "needs_details"}
                  className="input-field block w-full mt-1"
                  maxLength={1000}
                  rows={3}
                  value={customerMessage}
                  onChange={(e) => setCustomerMessage(e.target.value)}
                />
                <span className="text-sm">
                  Explain any missing details or next steps. This is shown on
                  the private progress page; it does not send an email.
                </span>
              </label>
            </fieldset>
            <button className="btn-primary w-full" disabled={busy}>
              {busy
                ? "Saving…"
                : retry
                  ? "Retry the same response"
                  : "Save response"}
            </button>
            {retry && (
              <p className="text-sm">
                The previous save could not be confirmed. Retrying these same
                details will not create a duplicate response.
              </p>
            )}
            <p className="text-sm text-gray-600">
              You set your own pricing and availability. You can update this
              response until{" "}
              {new Date(data.expires_at * 1000).toLocaleDateString()}.
            </p>
          </form>
        </>
      )}
      <p className="text-sm">
        Need help?{" "}
        <a className="underline" href="mailto:support@vicrez.com">
          Contact support@vicrez.com
        </a>
        .
      </p>
    </main>
  );
}
