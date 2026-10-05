"use client";
import { sessionAcquisition } from "./acquisition-client";
import { measurementAllowed, measurementDevice } from "./measurement-client";
import { ga4JourneyEvent } from "./ga4-journeys";
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
  if (!measurementAllowed()) return;
  const attribution = sessionAcquisition();
  const payload = {
    ...data,
    id:
      event === "session_start"
        ? attribution.session_id
        : data.id || crypto.randomUUID(),
    session_id: attribution.session_id,
    event,
    page: data.page || pageKind(window.location.pathname),
    device_category: measurementDevice(),
    campaign_source: attribution.source,
    acquisition_channel: attribution.channel,
  };
  ga4JourneyEvent(event, payload);
  void fetch("/api/discovery-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {});
}
