"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { attributedLink } from "@/lib/attribution";
const originals = new WeakMap<
  HTMLAnchorElement,
  { original: string; tagged: string }
>();
export default function UtmLinkAppender() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname.startsWith("/owner") || pathname.startsWith("/shop-response"))
      return;
    const tag = (el: HTMLAnchorElement) => {
      const href = el.getAttribute("href") || "",
        old = originals.get(el),
        original = old?.tagged === href ? old.original : href;
      const tagged = attributedLink(
        original,
        pathname || "/",
        el.textContent || "",
      );
      if (tagged !== href) el.setAttribute("href", tagged);
      originals.set(el, { original, tagged });
    };
    // Tag only the link being used, including keyboard, middle-click and
    // context-menu actions. Delegation also covers subsequently rendered links.
    const prepareLink = (e: Event) => {
      const a =
        e.target instanceof Element
          ? e.target.closest<HTMLAnchorElement>("a[href]")
          : null;
      if (a) tag(a);
    };
    const events = ["pointerdown", "focusin", "contextmenu", "click", "auxclick"];
    for (const event of events)
      document.addEventListener(event, prepareLink, true);
    return () => {
      for (const event of events)
        document.removeEventListener(event, prepareLink, true);
    };
  }, [pathname]);
  return null;
}
