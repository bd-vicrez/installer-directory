"use client";
import { useRef, useState } from "react";
import { QUOTE_SERVICES } from "@/lib/quote-services";
export default function OnboardingUpdateForm({
  request,
  onSaved,
}: {
  request: any;
  onSaved: () => Promise<void>;
}) {
  const [note, setNote] = useState(""),
    [url, setUrl] = useState(""),
    [agreement, setAgreement] = useState(false);
  const [business, setBusiness] = useState(request.business || {}),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const attempt = useRef<{ id: string; fingerprint: string } | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    const changes =
      request.kind === "application"
        ? Object.fromEntries(
            [
              "street_address",
              "city",
              "state",
              "zip_code",
              "phone",
              "website",
              "install_capabilities",
            ]
              .filter(
                (k) =>
                  JSON.stringify(business[k]) !==
                  JSON.stringify(request.business[k]),
              )
              .map((k) => [k, business[k]]),
          )
        : {};
    const data = {
      note,
      evidence_url: url,
      changes,
      agreement,
      revision: request.revision,
    };
    const fingerprint = JSON.stringify(data);
    if (attempt.current && attempt.current.fingerprint !== fingerprint) {
      setError(
        "An earlier update may already be saved. Restore its details to retry, or refresh the status to start a new update.",
      );
      return;
    }
    if (!attempt.current)
      attempt.current = { id: crypto.randomUUID(), fingerprint };
    setBusy(true);
    try {
      const r = await fetch("/api/onboarding-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          request_id: attempt.current.id,
          token: window.location.hash.slice(1),
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        if (r.status === 400 || r.status === 429) attempt.current = null;
        throw new Error(d.error);
      }
      setMessage(d.message);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to confirm your update. Retry the same details.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (message)
    return (
      <div role="status" className="rounded-lg bg-green-50 p-4 space-y-3">
        <p>{message}</p>
        <button className="underline" onClick={() => void onSaved()}>
          View updated status
        </button>
      </div>
    );
  return (
    <section
      className="border rounded-xl p-5 space-y-4"
      aria-label="Add requested information"
    >
      <h2 className="text-xl font-semibold">Add requested information</h2>
      <p className="text-sm">
        Answer the review questions above. Updates stay attached to this request
        and require review before any listing or access changes.
      </p>
      <form onSubmit={submit} className="space-y-4">
        <fieldset disabled={busy} className="space-y-4">
          <label className="block">
            Your answer
            <textarea
              className="input-field w-full mt-1 min-h-28"
              required
              minLength={10}
              maxLength={2000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <label className="block">
            Supporting business page (optional)
            <input
              type="url"
              className="input-field w-full mt-1"
              placeholder="https://"
              maxLength={500}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </label>
          {request.kind === "application" && (
            <details>
              <summary className="cursor-pointer py-2 font-medium">
                Correct business details or services
              </summary>
              <p className="text-sm my-2">
                Use an address you permit us to publish. Explain mobile service
                areas in your answer. Name and account email changes need staff
                assistance.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  ["street_address", "Public business address"],
                  ["city", "City"],
                  ["state", "State abbreviation"],
                  ["zip_code", "ZIP code"],
                  ["phone", "Business phone"],
                  ["website", "Business website or social profile"],
                ].map(([k, label]) => (
                  <label key={k} className="text-sm">
                    {label}
                    <input
                      className="input-field w-full mt-1"
                      maxLength={
                        k === "website"
                          ? 500
                          : k === "street_address"
                            ? 200
                            : 100
                      }
                      value={business[k] || ""}
                      onChange={(e) =>
                        setBusiness({ ...business, [k]: e.target.value })
                      }
                    />
                  </label>
                ))}
              </div>
              <fieldset className="mt-3">
                <legend className="font-medium">
                  Services currently offered
                </legend>
                <div className="grid gap-2 mt-2">
                  {QUOTE_SERVICES.map((s) => (
                    <label key={s.id} className="text-sm flex gap-2">
                      <input
                        type="checkbox"
                        checked={
                          Array.isArray(business.install_capabilities) &&
                          business.install_capabilities.includes(s.id)
                        }
                        onChange={(e) =>
                          setBusiness({
                            ...business,
                            install_capabilities: e.target.checked
                              ? [
                                  ...(Array.isArray(
                                    business.install_capabilities,
                                  )
                                    ? business.install_capabilities
                                    : []),
                                  s.id,
                                ]
                              : (Array.isArray(business.install_capabilities)
                                  ? business.install_capabilities
                                  : []
                                ).filter((x: string) => x !== s.id),
                          })
                        }
                      />
                      {s.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            </details>
          )}
          <label className="flex gap-3 text-sm">
            <input
              className="w-5 h-5 shrink-0"
              type="checkbox"
              required
              checked={agreement}
              onChange={(e) => setAgreement(e.target.checked)}
            />
            I am authorized to supply these business details and ask Vicrez to
            review them for this request.
          </label>
        </fieldset>
        {error && (
          <p role="alert" className="text-red-800">
            {error}
          </p>
        )}
        <button disabled={busy} className="btn-primary w-full">
          {busy ? "Saving update…" : "Send information for review"}
        </button>
      </form>
    </section>
  );
}
