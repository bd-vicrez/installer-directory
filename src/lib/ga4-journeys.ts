"use client";
import { measurementAllowed } from "./measurement-client";

const eventNames = {
  search_results: "installer_search_results",
  quote_open: "installer_quote_open",
  quote_step: "installer_quote_step",
  quote_saved: "generate_lead",
  application_start: "installer_application_start",
  application_complete: "installer_application_saved",
  claim_start: "installer_claim_start",
  claim_complete: "installer_claim_saved",
} as const;
type AnalyticsWindow = Window & {
  gtag?: (...args: unknown[]) => void;
  __vicrezGa4Configured?: string;
  __vicrezGa4Flush?: () => void;
};
const queued: { name: string; params: Record<string, string> }[] = [];
const seen = new Set<string>();
const storageKey = "vicrez-ga4-journeys-v1";

/** No customer fields, search terms, tokens or request/session IDs go to GA4. */
export function ga4JourneyEvent(event: string, data: Record<string, unknown>) {
  try {
    const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    if (!id || !/^G-[A-Z0-9]+$/.test(id) || !measurementAllowed()) return;
    if (!Object.prototype.hasOwnProperty.call(eventNames, event)) return;
    const journey = data.journey_id;
    if (typeof journey !== "string" || !/^[0-9a-f-]{36}$/i.test(journey))
      return;
    const page = [
      "home",
      "profile",
      "location",
      "category",
      "apply",
      "claim",
      "shops",
      "guide",
      "other",
    ].includes(String(data.page))
      ? String(data.page)
      : "other";
    const params: Record<string, string> = {
      send_to: id,
      page_type: page,
      page_location: window.location.origin + window.location.pathname,
    };
    if (event === "quote_step") {
      if (!["project", "contact", "review"].includes(String(data.step))) return;
      params.form_step = String(data.step);
    }
    if (
      event === "search_results" &&
      ["0", "1-5", "6-24", "25+"].includes(String(data.result_bucket))
    )
      params.result_bucket = String(data.result_bucket);
    if (event === "quote_saved") params.lead_source = "installer_inquiry";
    const key = `${event}:${journey}:${params.form_step || ""}`;
    try {
      const stored = JSON.parse(sessionStorage.getItem(storageKey) || "[]");
      if (Array.isArray(stored))
        for (const value of stored.slice(-200))
          if (typeof value === "string") seen.add(value);
    } catch {
      /* In-memory deduplication still works with storage disabled. */
    }
    if (seen.has(key) || queued.length >= 100) return;
    seen.add(key);
    while (seen.size > 200) seen.delete(seen.values().next().value!);
    try {
      sessionStorage.setItem(storageKey, JSON.stringify([...seen]));
    } catch {}
    queued.push({ name: eventNames[event as keyof typeof eventNames], params });
    const target = window as AnalyticsWindow;
    const flush = () => {
      // Recheck privacy if the visitor opted out or navigated to a private page.
      if (!measurementAllowed()) {
        queued.length = 0;
        return;
      }
      if (
        target.__vicrezGa4Configured !== id ||
        typeof target.gtag !== "function"
      )
        return;
      for (const item of queued.splice(0))
        target.gtag("event", item.name, item.params);
    };
    target.__vicrezGa4Flush = flush;
    flush();
  } catch {
    // Analytics can never turn a successful business submission into an error.
  }
}
