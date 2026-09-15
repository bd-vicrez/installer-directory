"use client";
import { useRef, useState } from "react";
import { QUOTE_SERVICES } from "@/lib/quote-services";
import OwnerDetailsFields from "./OwnerDetailsFields";
export default function ClaimForm({
  shop,
}: {
  shop: { id: string; business_name: string };
}) {
  const [values, setValues] = useState<Record<string, any>>({
      services: [],
      agreement: false,
    }),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [receipt, setReceipt] = useState<any>(null);
  const requestId = useRef("");
  const change = (key: string, value: any) =>
    setValues((v) => ({ ...v, [key]: value }));
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    if (!requestId.current) requestId.current = crypto.randomUUID();
    try {
      const r = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          installer_id: shop.id,
          request_id: requestId.current,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setReceipt(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please retry.");
    } finally {
      setBusy(false);
    }
  }
  if (receipt)
    return (
      <div role="status" className="space-y-4">
        <h2 className="text-xl font-semibold">
          Request saved: {receipt.reference}
        </h2>
        <p>
          The Vicrez installer review team will verify your relationship to this
          shop before making changes.
        </p>
        <a
          className="btn-primary inline-block"
          href={"/request-status#" + receipt.token}
        >
          Keep your private status link
        </a>
        <p className="text-sm">
          This link works for 180 days. Save it privately; it gives access to
          your request status.
        </p>
      </div>
    );
  return (
    <form className="space-y-4" onSubmit={submit}>
      <p>
        Request ownership review or a correction for{" "}
        <strong>{shop.business_name}</strong>. Wholesale membership is a
        separate option. Submitting this form does not grant editing access.
      </p>
      {(
        [
          ["name", "Your name", 100],
          ["email", "Business email", 255],
          ["relationship", "Your relationship to this business", 200],
        ] as const
      ).map(([key, label, max]) => (
        <label className="block" key={key}>
          {label}
          <input
            className="input-field w-full mt-1"
            type={key === "email" ? "email" : "text"}
            required
            maxLength={max}
            value={values[key] || ""}
            onChange={(e) => change(key, e.target.value)}
          />
        </label>
      ))}
      <label className="block">
        What needs updating?
        <textarea
          className="input-field w-full mt-1"
          required
          minLength={10}
          maxLength={2000}
          value={values.correction || ""}
          onChange={(e) => change("correction", e.target.value)}
        />
      </label>
      <fieldset>
        <legend className="font-medium">
          Services your shop offers (optional)
        </legend>
        <div className="flex flex-wrap gap-3 mt-2">
          {QUOTE_SERVICES.filter((s) => s.id !== "other").map((s) => (
            <label className="flex gap-2 items-center text-sm" key={s.id}>
              <input
                type="checkbox"
                checked={values.services.includes(s.id)}
                onChange={(e) =>
                  change(
                    "services",
                    e.target.checked
                      ? [...values.services, s.id]
                      : values.services.filter((x: string) => x !== s.id),
                  )
                }
              />
              {s.label}
            </label>
          ))}
        </div>
      </fieldset>
      <OwnerDetailsFields values={values} onChange={change} />
      <input
        aria-hidden="true"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        value={values.honeypot || ""}
        onChange={(e) => change("honeypot", e.target.value)}
      />
      <label className="flex gap-3 items-start">
        <input
          className="mt-1 w-5 h-5"
          type="checkbox"
          required
          checked={values.agreement}
          onChange={(e) => change("agreement", e.target.checked)}
        />
        <span>
          I am authorized to request these changes. Vicrez may contact me to
          verify my relationship to the business and review the submitted
          details for publication.
        </span>
      </label>
      {error && (
        <p role="alert" className="text-red-800">
          {error}
        </p>
      )}
      <button disabled={busy} className="btn-primary">
        {busy ? "Saving…" : "Send for ownership review"}
      </button>
    </form>
  );
}
