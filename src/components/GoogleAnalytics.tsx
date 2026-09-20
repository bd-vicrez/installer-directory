"use client";
import { usePathname } from "next/navigation";
import Script from "next/script";

/**
 * GA4 tag (gtag.js). Renders nothing unless NEXT_PUBLIC_GA_MEASUREMENT_ID is set,
 * so preview/dev builds stay untracked. Loaded afterInteractive so it never blocks
 * first paint or SSR (Googlebot gets the same HTML either way).
 */
export default function GoogleAnalytics() {
  const pathname = usePathname();
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (
    pathname.startsWith("/shop-response") ||
    pathname.startsWith("/request-status") ||
    pathname.startsWith("/admin") ||
    !id ||
    !/^G-[A-Z0-9]+$/.test(id)
  )
    return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${id}', { send_page_view: !location.pathname.startsWith('/shop-response') && !location.pathname.startsWith('/request-status') && !location.pathname.startsWith('/admin'), page_location: location.origin+location.pathname+location.search });`}
      </Script>
    </>
  );
}
