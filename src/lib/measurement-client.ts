"use client";
import {
  automatedMeasurementAgent,
  privateMeasurementPath,
} from "./measurement-privacy";

export function measurementAllowed(loadAssetsForAutomation = false) {
  if (
    typeof window === "undefined" ||
    process.env.NEXT_PUBLIC_DISABLE_QUOTE_ANALYTICS === "1"
  )
    return false;
  // QA visits opt out for this tab, including subsequent navigation. Preview and local builds are excluded.
  let excluded =
    new URLSearchParams(window.location.search).get("analytics") === "off";
  try {
    if (excluded) sessionStorage.setItem("vicrez-analytics-exclude", "1");
    excluded ||= sessionStorage.getItem("vicrez-analytics-exclude") === "1";
  } catch {
    /* Privacy settings can disable storage. */
  }
  return (
    !excluded &&
    window.location.hostname === "installers.vicrez.com" &&
    navigator.doNotTrack !== "1" &&
    !(navigator as Navigator & { globalPrivacyControl?: boolean })
      .globalPrivacyControl &&
    (loadAssetsForAutomation ||
      (!navigator.webdriver &&
        !automatedMeasurementAgent(navigator.userAgent))) &&
    !privateMeasurementPath(window.location.pathname)
  );
}

export function measurementDevice(): "mobile" | "tablet" | "desktop" {
  const ua = navigator.userAgent;
  if (
    /iPad|Tablet/i.test(ua) ||
    (/Android/i.test(ua) && !/Mobi/i.test(ua)) ||
    (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)
  )
    return "tablet";
  if (/Mobi|iPhone|iPod|Android/i.test(ua)) return "mobile";
  return "desktop";
}

export function resultBucket(count: number) {
  return count === 0 ? "0" : count <= 5 ? "1-5" : count <= 24 ? "6-24" : "25+";
}
