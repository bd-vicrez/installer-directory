"use client";
import { measurementAllowed } from "./measurement-client";
let session = "";
export function quoteSession() {
  if (session) return session;
  try {
    const stored = sessionStorage.getItem("vicrez-quote-session");
    session =
      stored && /^[0-9a-f-]{36}$/i.test(stored) ? stored : crypto.randomUUID();
    sessionStorage.setItem("vicrez-quote-session", session);
  } catch {
    session = crypto.randomUUID();
  }
  return session;
}
export function quoteEvent(
  event: "quote_open" | "quote_attempt" | "quote_error",
  flow: "selected" | "network",
  service?: string,
) {
  if (!measurementAllowed()) return;
  const payload = {
    id: crypto.randomUUID(),
    session_id: quoteSession(),
    event,
    flow,
    service: service || undefined,
  };
  void fetch("/api/quote-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {});
}
