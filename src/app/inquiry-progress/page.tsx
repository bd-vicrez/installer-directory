"use client";
import { useEffect, useRef, useState } from "react";
import InquiryProject from "@/components/InquiryProject";
import ProjectBriefFields from "@/components/ProjectBriefFields";
const replyLabels: Record<string, string> = {
  awaiting_response: "Awaiting a shop response",
  interested: "Shop is interested — contact it to discuss the job",
  needs_details: "Shop needs more details",
  declined: "Shop cannot take this job",
};
export default function InquiryProgress() {
  const token = useRef(""),
    pending = useRef<any>(null);
  const [data, setData] = useState<any>(null),
    [fields, setFields] = useState<Record<string, string>>({}),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [action, setAction] = useState("alternative_requested"),
    [note, setNote] = useState(""),
    [confirm, setConfirm] = useState(false),
    [retry, setRetry] = useState(false),
    [projectKey, setProjectKey] = useState(0);
  async function api(b: any) {
    const r = await fetch("/api/inquiry-progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...b, token: token.current }),
      cache: "no-store",
    });
    const d = await r.json();
    if (!r.ok) {
      if (r.status < 500) {
        pending.current = null;
        setRetry(false);
      }
      throw Error(d.error);
    }
    return d;
  }
  async function load() {
    const d = await api({ action: "view" });
    setData(d);
    setFields(d.project_brief.fields);
  }
  useEffect(() => {
    token.current = window.location.hash.slice(1);
    if (!token.current) {
      setError(
        "Open the private progress link saved with your inquiry receipt. Contact support@vicrez.com with your reference if it expired.",
      );
      return;
    }
    void load().catch((e) => setError(e.message));
  }, []);
  async function save(type: string) {
    setBusy(true);
    setError("");
    setMessage("");
    if (!pending.current)
      pending.current = {
        action: type,
        request_id: crypto.randomUUID(),
        version:
          type === "project"
            ? data.project_brief.version
            : data.customer_action.version,
        ...(type === "project" ? { fields } : { note, confirm }),
      };
    try {
      await api(pending.current);
      pending.current = null;
      setRetry(false);
      setMessage(
        type === "project"
          ? "Project details saved. Shops can view the updated brief through their existing private inquiry link."
          : type === "alternative_requested"
            ? "Your request for another shop is with the Vicrez team. No additional shop has been contacted."
            : "Your request is closed for further follow-up through this site. Contact the shop directly about any agreed appointment.",
      );
      try {
        await load();
        setProjectKey((k) => k + 1);
      } catch {
        setData(null);
        setError(
          "Your change was saved, but the latest details could not load. Reload this private link before making another change.",
        );
      }
    } catch (e) {
      if (pending.current) setRetry(true);
      setError(e instanceof Error ? e.message : "Could not confirm the save.");
    } finally {
      setBusy(false);
    }
  }
  const closed =
    data && ["closed", "withdrawn"].includes(data.customer_action.state);
  return (
    <div className="space-y-5">
      <p className="font-bold text-red-700">VICREZ INSTALLER NETWORK</p>
      <h1 className="text-3xl font-bold">Your installation inquiry</h1>
      <p>
        Keep this link private. It expires seven days after the receipt was
        issued. The shop confirms pricing and appointments directly with you.
      </p>
      {error && (
        <p role="alert" className="bg-red-50 border rounded p-3">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="bg-green-50 border rounded p-3">
          {message}
        </p>
      )}
      {data && (
        <>
          <section className="border rounded-xl bg-white p-5 space-y-2">
            <h2 className="text-xl font-semibold">
              {data.reference} · {data.vehicle}
            </h2>
            <p>{data.work}</p>
            <p className="font-semibold">
              {closed
                ? "Closed for further site follow-up"
                : data.customer_action.state === "alternative_requested"
                  ? "Another-shop request awaiting staff review"
                  : "Request open"}
            </p>
            <p>
              {closed
                ? "Pending notifications and reminder eligibility have been cancelled. Emails already sent cannot be recalled."
                : data.message}
            </p>
            {data.staff_update && (
              <div className="border-t pt-3">
                <p>
                  Staff recorded: <strong>{data.staff_update.state}</strong> ·{" "}
                  {new Date(data.staff_update.updated_at).toLocaleString()}
                </p>
                {data.staff_update.public_message && (
                  <p className="whitespace-pre-wrap">
                    {data.staff_update.public_message}
                  </p>
                )}
              </div>
            )}
          </section>
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Shop responses</h2>
            {data.shops.map((shop: any, i: number) => (
              <article key={i} className="bg-white border rounded-xl p-4">
                <h3 className="font-semibold">{shop.name}</h3>
                <p>{replyLabels[shop.state]}</p>
                {shop.message && (
                  <p className="whitespace-pre-wrap mt-2">{shop.message}</p>
                )}
              </article>
            ))}
            {!data.shops.length && (
              <p>A recipient has not yet been confirmed.</p>
            )}
          </section>
          <InquiryProject
            key={projectKey}
            scope="customer"
            token={token.current}
            closed={closed}
          />
          {!closed && (
            <>
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void save("project");
                }}
              >
                <fieldset disabled={busy || retry}>
                  <ProjectBriefFields
                    value={fields}
                    onChange={setFields}
                    service={data.service}
                  />
                </fieldset>
                <button className="btn-secondary" disabled={busy || retry}>
                  Save project details
                </button>
              </form>
              <form
                className="border rounded-xl p-5 bg-white space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void save(action);
                }}
              >
                <h2 className="text-xl font-semibold">Manage this request</h2>
                <fieldset className="space-y-3" disabled={busy || retry}>
                  <label className="block">
                    Action
                    <select
                      className="input-field block w-full"
                      value={action}
                      onChange={(e) => setAction(e.target.value)}
                    >
                      <option value="alternative_requested">
                        Ask Vicrez to help find another shop
                      </option>
                      <option value="closed">
                        Close — I no longer need site follow-up
                      </option>
                      <option value="withdrawn">
                        Withdraw this installation inquiry
                      </option>
                    </select>
                  </label>
                  <label className="block">
                    Reason
                    <textarea
                      className="input-field block w-full"
                      required
                      minLength={5}
                      maxLength={500}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </label>
                  <label className="flex gap-2">
                    <input
                      type="checkbox"
                      required
                      checked={confirm}
                      onChange={(e) => setConfirm(e.target.checked)}
                    />
                    I confirm this request. Finding another shop requires staff
                    review; closing here does not cancel a booking agreed
                    directly with a shop.
                  </label>
                </fieldset>
                <button className="btn-secondary" disabled={busy || retry}>
                  Save request action
                </button>
              </form>
            </>
          )}
          {retry && (
            <button
              className="btn-primary"
              disabled={busy}
              onClick={() => void save(pending.current.action)}
            >
              Retry the same save
            </button>
          )}
          <button
            className="underline"
            disabled={busy || retry}
            onClick={() => {
              setError("");
              void load().catch((e) => setError(e.message));
            }}
          >
            Refresh progress
          </button>
        </>
      )}
      <p>
        Need help?{" "}
        <a className="underline" href="mailto:support@vicrez.com">
          support@vicrez.com
        </a>
      </p>
    </div>
  );
}
