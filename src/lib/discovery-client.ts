"use client";
import { quoteSession } from "./quote-telemetry";
export function pageKind(path: string) {
  if (path === "/") return "home";
  if (path.startsWith("/installer/")) return "profile";
  if (path === "/apply") return "apply";
  if (path === "/claim") return "claim";
  if (path.startsWith("/installers/category/")) return "category";
  if (path.startsWith("/installers/")) return "location";
  if (path === "/for-shops") return "shops";
  if (path.startsWith("/guides") || path.startsWith("/start")) return "guide";
  return "other";
}
export function discoveryEvent(
  event: string,
  data: Record<string, unknown> = {},
) {
  if (
    process.env.NEXT_PUBLIC_DISABLE_QUOTE_ANALYTICS === "1" ||
    navigator.doNotTrack === "1" ||
    window.location.pathname.startsWith("/admin") ||
    window.location.pathname.startsWith("/request-status")
  )
    return;
  const raw =
    new URLSearchParams(window.location.search)
      .get("utm_source")
      ?.toLowerCase() || "direct";
  const source = [
    "google",
    "bing",
    "youtube",
    "instagram",
    "facebook",
    "email",
    "direct",
  ].includes(raw)
    ? raw
    : "other";
  const payload = {
    id: crypto.randomUUID(),
    session_id: quoteSession(),
    event,
    page: pageKind(window.location.pathname),
    campaign_source: source,
    ...data,
  };
  void fetch("/api/discovery-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {});
}
