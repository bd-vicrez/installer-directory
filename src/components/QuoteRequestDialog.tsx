"use client";
import { sessionAcquisition } from "@/lib/acquisition-client";
import { useEffect, useRef, useState } from "react";
import AccessibleDialog from "./AccessibleDialog";
import { QUOTE_SERVICES } from "@/lib/quote-services";
import { quoteEvent, quoteSession } from "@/lib/quote-telemetry";

export type QuoteShop = {
  id: string;
  business_name: string;
  city: string;
  state: string;
  phone: string;
};
type Fields = {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  vehicle_year: string;
  vehicle_make: string;
  vehicle_model: string;
  service: string;
  project_detail: string;
  what_needed: string;
  additional_notes: string;
  zip_code: string;
  install_timeline: string;
  budget_range: string;
  website_url: string;
  sharing_consent: boolean;
};
type Receipt = {
  reference: string;
  token: string;
  status: string;
  message: string;
};
const emptyFields = (): Fields => ({
  customer_name: "",
  customer_email: "",
  customer_phone: "",
  vehicle_year: "",
  vehicle_make: "",
  vehicle_model: "",
  service: "",
  project_detail: "",
  what_needed: "",
  additional_notes: "",
  zip_code: "",
  install_timeline: "",
  budget_range: "",
  website_url: "",
  sharing_consent: false,
});

export default function QuoteRequestDialog({
  isOpen,
  onClose,
  installer,
  locationLabel,
}: {
  isOpen: boolean;
  onClose: () => void;
  installer?: QuoteShop;
  locationLabel?: string;
}) {
  const flow = installer ? "selected" : "network";
  const [fields, setFields] = useState<Fields>(emptyFields);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [changed, setChanged] = useState(false);
  const requestId = useRef("");
  const attempted = useRef("");
  const wasOpen = useRef(false);
  const notice = useRef<HTMLDivElement>(null);
  const field = (key: keyof Fields, value: string | boolean) =>
    setFields((current) => ({ ...current, [key]: value }));
  useEffect(() => {
    if (isOpen && !wasOpen.current) {
      if (!requestId.current) requestId.current = crypto.randomUUID();
      quoteEvent("quote_open", flow);
    }
    wasOpen.current = isOpen;
  }, [isOpen, flow]);
  useEffect(() => {
    if (receipt || error) notice.current?.focus();
  }, [!!receipt, error]);
  useEffect(() => {
    if (
      changed &&
      attempted.current ===
        JSON.stringify({ ...fields, installer_id: installer?.id })
    ) {
      setChanged(false);
      setError(
        "The original details are restored. You can retry this request without creating another one.",
      );
    }
  }, [fields, installer?.id, changed]);
  useEffect(() => {
    if (!isOpen || !receipt?.token) return;
    let cancelled = false,
      polls = 0;
    let timer: ReturnType<typeof setTimeout>;
    const refresh = async () => {
      try {
        const response = await fetch("/api/quote-request/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: receipt.token }),
        });
        if (response.ok) {
          const status = await response.json();
          if (!cancelled && typeof status.message === "string")
            setReceipt((current) =>
              current ? { ...current, ...status } : current,
            );
          if (
            ["provider_accepted", "routing_needed", "needs_attention"].includes(
              status.status,
            )
          )
            return;
        }
      } catch {
        /* A status timeout does not invalidate the saved receipt. */
      }
      if (!cancelled && ++polls < 8) timer = setTimeout(refresh, 5000);
    };
    timer = setTimeout(refresh, 1500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isOpen, receipt?.token]);

  function newRequest(keepDetails = false) {
    requestId.current = crypto.randomUUID();
    attempted.current = "";
    setReceipt(null);
    setError("");
    setChanged(false);
    if (!keepDetails) setFields(emptyFields());
    requestAnimationFrame(() =>
      document
        .getElementById(
          (installer ? "shop-quote" : "network-quote") + "-customer_name",
        )
        ?.focus(),
    );
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    const content = { ...fields, installer_id: installer?.id };
    const fingerprint = JSON.stringify(content);
    if (attempted.current && attempted.current !== fingerprint) {
      setChanged(true);
      setError(
        "Your earlier attempt may already be saved. Retry its original details, or explicitly start a separate request with these changes.",
      );
      return;
    }
    if (fields.website_url) {
      setError("Unable to accept this request.");
      return;
    }
    attempted.current = fingerprint;
    setSubmitting(true);
    setError("");
    setChanged(false);
    quoteEvent("quote_attempt", flow, fields.service);
    try {
      const response = await fetch("/api/quote-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...content,
          request_id: requestId.current,
          session_id: quoteSession(),
          acquisition: sessionAcquisition(),
        }),
      });
      const accepted = await response.json().catch(() => ({}));
      if (!response.ok) {
        // A clear pre-save validation/availability rejection can be corrected.
        if (
          response.status === 400 ||
          response.status === 429 ||
          accepted.code === "shop_unavailable"
        )
          attempted.current = "";
        if (accepted.code === "request_changed") setChanged(true);
        throw new Error(
          accepted.error ||
            "Your request could not be confirmed. Retry the same details.",
        );
      }
      if (accepted.success !== true || !accepted.reference || !accepted.token)
        throw new Error(
          "Your request could not be confirmed. Retry the same details.",
        );
      setReceipt(accepted);
    } catch (issue) {
      setError(
        issue instanceof Error
          ? issue.message
          : "Unable to confirm your request.",
      );
      quoteEvent("quote_error", flow, fields.service);
    } finally {
      setSubmitting(false);
    }
  }
  const prefix = installer ? "shop-quote" : "network-quote";
  const input = (
    key: keyof Fields,
    label: string,
    options: {
      type?: string;
      minLength?: number;
      maxLength?: number;
      autoComplete?: string;
      placeholder?: string;
    } = {},
  ) => (
    <div>
      <label
        htmlFor={prefix + "-" + key}
        className="block text-sm font-medium text-gray-800 mb-1"
      >
        {label} <span aria-hidden="true">*</span>
      </label>
      <input
        id={prefix + "-" + key}
        name={key}
        type={options.type || "text"}
        value={String(fields[key])}
        onChange={(e) => field(key, e.target.value)}
        required
        className="input-field w-full"
        {...options}
      />
    </div>
  );
  return (
    <AccessibleDialog
      open={isOpen}
      onClose={onClose}
      title={
        receipt
          ? "Quote request received"
          : installer
            ? "Request a quote from " + installer.business_name
            : "Find a shop for your installation"
      }
    >
      {receipt ? (
        <div
          ref={notice}
          tabIndex={-1}
          role="status"
          className="outline-none space-y-4"
        >
          <p className="text-gray-700">{receipt.message}</p>
          <p className="text-lg font-semibold text-gray-900">
            Reference: {receipt.reference}
          </p>
          <p className="text-sm text-gray-600">
            Keep this reference when contacting Vicrez about your request. The
            shop must confirm services, pricing and availability.
          </p>
          <a
            href={
              "mailto:quotes@vicrez.com?subject=" +
              encodeURIComponent("Installation inquiry " + receipt.reference)
            }
            className="text-vicrez-red underline"
          >
            Contact Vicrez about this request
          </a>
          <div className="flex flex-wrap gap-3">
            <button onClick={onClose} className="btn-primary">
              Close
            </button>
            <button onClick={() => newRequest()} className="btn-secondary">
              Start a new request
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-700 mb-5">
            {installer ? (
              <>
                Your contact and project details will be shared with{" "}
                <strong>{installer.business_name}</strong>. This request will
                not be sent to other shops.
              </>
            ) : (
              <>
                We will look for up to three shops within 100 miles of your ZIP
                with the recorded service you select
                {locationLabel ? " near " + locationLabel : ""}. A match and
                shop availability are not guaranteed.
              </>
            )}
          </p>
          <form onSubmit={submit} className="space-y-4">
            <fieldset disabled={submitting} className="space-y-4">
              <legend className="sr-only">
                Your contact and installation details. Fields marked with an
                asterisk are required.
              </legend>
              <div className="sr-only" aria-hidden="true">
                <label>
                  Leave this blank
                  <input
                    name="website_url"
                    tabIndex={-1}
                    autoComplete="off"
                    value={fields.website_url}
                    onChange={(e) => field("website_url", e.target.value)}
                  />
                </label>
              </div>
              {input("customer_name", "Your name", {
                minLength: 2,
                maxLength: 80,
                autoComplete: "name",
              })}
              {input("customer_email", "Email", {
                type: "email",
                minLength: 5,
                maxLength: 255,
                autoComplete: "email",
              })}
              {input("customer_phone", "Phone", {
                type: "tel",
                minLength: 10,
                maxLength: 30,
                autoComplete: "tel",
              })}
              {!installer && (
                <div>
                  <label
                    htmlFor={prefix + "-zip"}
                    className="block text-sm font-medium text-gray-800 mb-1"
                  >
                    Your ZIP code *
                  </label>
                  <input
                    id={prefix + "-zip"}
                    name="zip_code"
                    className="input-field w-full"
                    inputMode="numeric"
                    autoComplete="postal-code"
                    pattern="[0-9]{5}"
                    maxLength={5}
                    required
                    value={fields.zip_code}
                    onChange={(e) => field("zip_code", e.target.value)}
                  />
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {input(
                  "vehicle_year",
                  "Vehicle year (1990–" + (new Date().getFullYear() + 1) + ")",
                  { minLength: 4, maxLength: 4, placeholder: "2024" },
                )}
                {input("vehicle_make", "Make", {
                  minLength: 2,
                  maxLength: 40,
                  placeholder: "Dodge",
                })}
                {input("vehicle_model", "Model", {
                  minLength: 1,
                  maxLength: 60,
                  placeholder: "Charger",
                })}
              </div>
              <div>
                <label
                  htmlFor={prefix + "-service"}
                  className="block text-sm font-medium text-gray-800 mb-1"
                >
                  Installation service *
                </label>
                <select
                  id={prefix + "-service"}
                  name="service"
                  required
                  className="input-field w-full"
                  value={fields.service}
                  onChange={(e) => field("service", e.target.value)}
                >
                  <option value="">Choose a service</option>
                  {QUOTE_SERVICES.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.label}
                    </option>
                  ))}
                </select>
                {!installer && fields.service === "other" && (
                  <p className="text-sm text-gray-600 mt-2">
                    This request will need review; we will not automatically
                    send it to shops with unrelated services.
                  </p>
                )}
              </div>
              {input("what_needed", "Parts or work needed", {
                minLength: 1,
                maxLength: 80,
                placeholder: "For example: install a rear diffuser",
              })}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor={prefix + "-timeline"}
                    className="block text-sm font-medium text-gray-800 mb-1"
                  >
                    Timeline (optional)
                  </label>
                  <select
                    id={prefix + "-timeline"}
                    className="input-field w-full"
                    value={fields.install_timeline}
                    onChange={(e) => field("install_timeline", e.target.value)}
                  >
                    <option value="">Choose a timeline</option>
                    {[
                      "As soon as available",
                      "2–4 weeks",
                      "1–3 months",
                      "Researching options",
                    ].map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor={prefix + "-budget"}
                    className="block text-sm font-medium text-gray-800 mb-1"
                  >
                    Budget (optional)
                  </label>
                  <select
                    id={prefix + "-budget"}
                    className="input-field w-full"
                    value={fields.budget_range}
                    onChange={(e) => field("budget_range", e.target.value)}
                  >
                    <option value="">Choose a range</option>
                    {[
                      "Under $1,000",
                      "$1,000–$2,500",
                      "$2,500–$5,000",
                      "$5,000+",
                      "Not sure",
                    ].map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label
                  htmlFor={prefix + "-project-detail"}
                  className="block text-sm font-medium text-gray-800 mb-1"
                >
                  {fields.service === "wheels-tires"
                    ? "Tire/wheel size and parts already owned (optional)"
                    : fields.service === "body-kits" ||
                        fields.service === "paint-bodywork"
                      ? "Part or product link, test fitting and paint needs (optional)"
                      : fields.service === "ppf" ||
                          fields.service === "vinyl-wrap"
                        ? "Desired coverage, finish and existing film (optional)"
                        : "Project requirements (optional)"}
                </label>
                <textarea
                  id={prefix + "-project-detail"}
                  maxLength={250}
                  className="input-field w-full"
                  value={fields.project_detail}
                  onChange={(e) => field("project_detail", e.target.value)}
                />
              </div>
              <div>
                <label
                  htmlFor={prefix + "-notes"}
                  className="block text-sm font-medium text-gray-800 mb-1"
                >
                  Additional details (optional)
                </label>
                <textarea
                  id={prefix + "-notes"}
                  className="input-field w-full min-h-24"
                  maxLength={
                    fields.project_detail
                      ? Math.max(0, 480 - fields.project_detail.length)
                      : 500
                  }
                  value={fields.additional_notes}
                  onChange={(e) => field("additional_notes", e.target.value)}
                />
              </div>
              <label
                htmlFor={prefix + "-consent"}
                className="flex gap-3 items-start text-sm text-gray-800 rounded-xl border border-gray-200 p-3"
              >
                <input
                  id={prefix + "-consent"}
                  type="checkbox"
                  required
                  className="mt-1 w-5 h-5 shrink-0 accent-red-700"
                  checked={fields.sharing_consent}
                  onChange={(e) => field("sharing_consent", e.target.checked)}
                />
                <span>
                  {installer ? (
                    <>
                      I want Vicrez to share these details with{" "}
                      {installer.business_name} so the shop can contact me about
                      this installation.
                    </>
                  ) : (
                    <>
                      I want Vicrez to share these details with up to three
                      eligible nearby shops matching my selected service, so
                      they can contact me about this installation.
                    </>
                  )}
                </span>
              </label>
            </fieldset>
            {error && (
              <div
                ref={notice}
                role="alert"
                tabIndex={-1}
                className="text-sm text-red-800 bg-red-50 p-3 rounded-lg outline-none"
              >
                {error}
              </div>
            )}
            {changed && (
              <button
                type="button"
                className="btn-secondary w-full"
                onClick={() => newRequest(true)}
              >
                Start a separate request with these details
              </button>
            )}
            <button
              type="submit"
              disabled={submitting || changed}
              className="btn-primary w-full disabled:opacity-60"
            >
              {submitting
                ? "Saving your request…"
                : "Send installation request"}
            </button>
            <p className="text-xs text-gray-600">
              For vehicles outside the supported year range, contact the shop
              directly. Submitting is a request for contact, not a booking or an
              installed-price quote. Required contact details are used to handle
              this request.
            </p>
          </form>
        </>
      )}
    </AccessibleDialog>
  );
}
