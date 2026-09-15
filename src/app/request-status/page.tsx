"use client";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
export default function StatusPage() {
  const [result, setResult] = useState<any>(null),
    [error, setError] = useState("");
  async function refresh() {
    setError("");
    try {
      const token = window.location.hash.slice(1);
      const r = await fetch("/api/onboarding-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setResult(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please retry.");
    }
  }
  useEffect(() => {
    refresh();
  }, []);
  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-12 w-full space-y-5">
        <h1 className="text-3xl font-bold">Your request status</h1>
        {result ? (
          <div role="status" className="space-y-3">
            <p className="text-xl capitalize">
              {result.status.replaceAll("_", " ")}
            </p>
            <p>
              {result.public_message ||
                "Your request is with the Vicrez installer review team. No completion date has been confirmed."}
            </p>
            <p className="text-sm">
              Submitted {new Date(result.submitted_at).toLocaleDateString()}
            </p>
          </div>
        ) : (
          !error && <p>Checking status…</p>
        )}
        {error && <p role="alert">{error}</p>}
        <button className="btn-secondary" onClick={refresh}>
          Refresh status
        </button>
        <p>
          <a className="underline" href="/contact">
            Contact Vicrez
          </a>{" "}
          if you need to add information. Keep this status link private.
        </p>
      </main>
      <Footer />
    </>
  );
}
