"use client";
import { acquisitionInput, classifyAcquisition } from "./acquisition";
import { quoteSession } from "./quote-telemetry";
let current: ReturnType<typeof acquisitionInput> | undefined;
export function sessionAcquisition() {
  if (
    process.env.NEXT_PUBLIC_DISABLE_QUOTE_ANALYTICS === "1" ||
    navigator.doNotTrack === "1"
  )
    return acquisitionInput({ source: "opted-out", channel: "opted-out" });
  if (current) return current;
  const session_id = quoteSession();
  try {
    const stored = JSON.parse(
      sessionStorage.getItem("vicrez-acquisition-v1") || "null",
    );
    if (stored?.session_id === session_id) current = acquisitionInput(stored);
  } catch {}
  if (!current) {
    current = acquisitionInput({
      ...classifyAcquisition(location.href, document.referrer),
      session_id,
    });
    try {
      sessionStorage.setItem("vicrez-acquisition-v1", JSON.stringify(current));
    } catch {}
  }
  return current;
}
