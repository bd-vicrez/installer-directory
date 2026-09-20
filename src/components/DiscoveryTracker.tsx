"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { discoveryEvent } from "@/lib/discovery-client";
export default function DiscoveryTracker() {
  const path = usePathname();
  useEffect(() => {
    if (
      path.startsWith("/owner") ||
      path.startsWith("/shop-response") ||
      path.startsWith("/admin") ||
      path.startsWith("/request-status")
    )
      return;
    discoveryEvent("session_start");
    if (path.startsWith("/installer/")) {
      const listing = document.querySelector<HTMLElement>(
        "main[data-installer-id]",
      )?.dataset.installerId;
      if (listing) discoveryEvent("profile_view", { listing_id: listing });
    }
    let started = false;
    const input = (e: Event) => {
      if (
        !started &&
        (e.target as Element)?.closest("main form") &&
        (path === "/apply" || path === "/claim")
      ) {
        started = true;
        discoveryEvent(path === "/apply" ? "application_start" : "claim_start");
      }
    };
    const click = (e: MouseEvent) => {
      const a = (e.target as Element)?.closest<HTMLAnchorElement>("a[href]");
      if (!a) return;
      const listing = a.closest<HTMLElement>("[data-installer-id]")?.dataset
        .installerId;
      const url = new URL(a.href, location.origin);
      if (url.hostname === "b2b.vicrez.com")
        discoveryEvent("dealer_click", { target: "b2b" });
      else if (["vicrez.com", "www.vicrez.com"].includes(url.hostname))
        discoveryEvent("store_click", { target: "storefront" });
      else if (listing) {
        if (url.protocol === "tel:")
          discoveryEvent("phone_click", { listing_id: listing });
        else if (
          ["google.com", "www.google.com"].includes(url.hostname) &&
          url.pathname.startsWith("/maps/dir")
        )
          discoveryEvent("directions_click", { listing_id: listing });
        else if (
          url.protocol === "https:" &&
          url.origin !== location.origin &&
          !/^(www\.)?google\.com$/.test(url.hostname)
        )
          discoveryEvent("website_click", { listing_id: listing });
      }
    };
    document.addEventListener("input", input, true);
    document.addEventListener("click", click, true);
    return () => {
      document.removeEventListener("input", input, true);
      document.removeEventListener("click", click, true);
    };
  }, [path]);
  return null;
}
