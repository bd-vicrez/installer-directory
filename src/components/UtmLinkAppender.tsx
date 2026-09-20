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
    const scan = (node: Node) => {
      if (node instanceof HTMLAnchorElement) tag(node);
      if (node instanceof Element)
        node.querySelectorAll<HTMLAnchorElement>("a[href]").forEach(tag);
    };
    scan(document.body);
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "attributes") scan(record.target);
        else record.addedNodes.forEach(scan);
      }
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["href"],
    });
    const click = (e: Event) => {
      const a =
        e.target instanceof Element
          ? e.target.closest<HTMLAnchorElement>("a[href]")
          : null;
      if (a) tag(a);
    };
    document.addEventListener("click", click, true);
    return () => {
      observer.disconnect();
      document.removeEventListener("click", click, true);
    };
  }, [pathname]);
  return null;
}
