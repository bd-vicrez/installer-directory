"use client";
import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
declare global {
  interface Window {
    vicrezQuoteHCaptchaReady?: () => void;
    hcaptcha?: {
      render: (element: HTMLElement, options: Record<string, unknown>) => string;
      remove: (id: string) => void;
    };
  }
}
export default function QuoteVerification({ onToken }: { onToken: (token: string) => void }) {
  const element = useRef<HTMLDivElement>(null), widget = useRef<string | null>(null);
  const [config, setConfig] = useState<{sitekey: string | null; mode: string} | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    fetch("/api/quote-request/verification", {cache: "no-store"})
      .then(async r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(c => { if (active) setConfig(c); })
      .catch(() => { if (active) setError("Verification is unavailable. You can retry without losing your details."); });
    return () => { active = false; if (widget.current !== null) window.hcaptcha?.remove(widget.current); widget.current = null; onToken(""); };
  }, [onToken]);
  const render = useCallback(() => {
    if (!config?.sitekey || !element.current || !window.hcaptcha || widget.current !== null) return;
    widget.current = window.hcaptcha.render(element.current, {
      sitekey: config.sitekey,
      callback: (token: string) => { setError(""); onToken(token); },
      "expired-callback": () => onToken(""),
      "error-callback": () => { onToken(""); setError("Verification could not finish. Please retry."); },
    });
  }, [config, onToken]);
  useEffect(() => {
    window.vicrezQuoteHCaptchaReady = render;
    render();
    return () => { if (window.vicrezQuoteHCaptchaReady === render) delete window.vicrezQuoteHCaptchaReady; };
  }, [render]);
  return <div className="space-y-2">
    {config?.sitekey && <><Script src="https://js.hcaptcha.com/1/api.js?onload=vicrezQuoteHCaptchaReady&render=explicit" onReady={render} onError={() => setError("Verification could not load. Please check your connection and retry.")} /><div ref={element} /></>}
    {config?.mode === "manual_review" && <p className="text-sm text-gray-600">Your request will be saved for staff review before it is shared with a shop.</p>}
    {!config && !error && <p className="text-sm text-gray-600">Loading verificationâ€¦</p>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </div>;
}
