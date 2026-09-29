"use client";
import { useRef } from "react";
import { discoveryEvent } from "./discovery-client";

export function useFormMeasurement(kind: "application" | "claim") {
  const journey = useRef(""),
    invalidAt = useRef(0);
  const start = () => {
    if (!journey.current) {
      journey.current = crypto.randomUUID();
      discoveryEvent(kind + "_start", { journey_id: journey.current });
    }
  };
  const event = (stage: "attempt" | "complete" | "error" | "validation") => {
    start();
    if (stage === "validation") {
      if (performance.now() - invalidAt.current < 1000) return;
      invalidAt.current = performance.now();
    }
    discoveryEvent(kind + "_" + stage, { journey_id: journey.current });
  };
  return { start, event };
}
