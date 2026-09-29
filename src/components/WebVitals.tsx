"use client";
import { useEffect } from "react";
import { discoveryEvent, pageKind } from "@/lib/discovery-client";
import { measurementAllowed } from "@/lib/measurement-client";
import type { Metric } from "web-vitals";

let registered = false;
export default function WebVitals() {
  useEffect(() => {
    if (registered || !measurementAllowed()) return;
    registered = true;
    // Capture the initial document's page, not whichever SPA route is open when it hides.
    const page = pageKind(location.pathname);
    const ids = new Map<string, string>();
    let sequence = 0;
    const report = (metric: Metric) => {
      if (!measurementAllowed()) return;
      let id = ids.get(metric.id);
      if (!id) {
        id = crypto.randomUUID();
        ids.set(metric.id, id);
      }
      discoveryEvent("web_vital", {
        id,
        page,
        metric: metric.name,
        metric_value: metric.value,
        metric_sequence: ++sequence,
      });
    };
    // Buffered observers include earlier paint/layout entries; defer the small library until load.
    const start = () => {
      void import("web-vitals")
        .then(({ onLCP, onCLS, onINP }) => {
          onLCP(report);
          onCLS(report);
          onINP(report);
        })
        .catch(() => {});
    };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
  }, []);
  return null;
}
