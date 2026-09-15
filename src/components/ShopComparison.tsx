"use client";
import { quoteSession } from "@/lib/quote-telemetry";
import { useState } from "react";
import AccessibleDialog from "./AccessibleDialog";
import type { PublicInstaller } from "@/lib/public-installers";
export default function ShopComparison({
  shops,
  onRemove,
}: {
  shops: PublicInstaller[];
  onRemove: (id: string | number) => void;
}) {
  const [open, setOpen] = useState(false);
  if (!shops.length) return null;
  return (
    <>
      <div className="sticky bottom-0 z-30 bg-white border-t shadow-lg p-3 flex items-center justify-center gap-4">
        <span className="text-sm">{shops.length} of 3 shops selected</span>
        <button
          disabled={shops.length < 2}
          className="btn-primary"
          onClick={() => {
            setOpen(true);
            if (process.env.NEXT_PUBLIC_DISABLE_QUOTE_ANALYTICS !== "1")
              void fetch("/api/discovery-events", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  event: "comparison_open",
                  id: crypto.randomUUID(),
                  session_id: quoteSession(),
                }),
                keepalive: true,
              }).catch(() => {});
          }}
        >
          Compare shops
        </button>
      </div>
      <AccessibleDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Compare selected shops"
      >
        <p className="text-sm mb-4">
          Compare recorded information. Confirm services, parts acceptance and
          availability directly with each shop.
        </p>
        <div className="overflow-x-auto">
          <table className="text-sm w-full border-collapse">
            <caption className="sr-only">
              Side-by-side comparison of selected shops
            </caption>
            <thead>
              <tr>
                <th scope="col" className="p-2 text-left">
                  Detail
                </th>
                {shops.map((s) => (
                  <th scope="col" className="p-2 min-w-40 text-left" key={s.id}>
                    <a className="underline" href={"/installer/" + s.slug}>
                      {s.business_name}
                    </a>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                "Location",
                "Distance",
                "Services",
                "Google rating",
                "Online inquiry",
              ].map((key) => (
                <tr className="border-t" key={key}>
                  <th className="p-2 text-left" scope="row">
                    {key}
                  </th>
                  {shops.map((s) => (
                    <td className="p-2 align-top" key={s.id}>
                      {key === "Location"
                        ? s.city + ", " + s.state
                        : key === "Distance"
                          ? s.distance == null
                            ? "Not available"
                            : s.distance + " miles (straight-line)"
                          : key === "Services"
                            ? s.capabilities.join(", ") || "Not confirmed"
                            : key === "Google rating"
                              ? s.rating
                                ? s.rating +
                                  "/5 · " +
                                  (s.google_review_count || 0) +
                                  " reviews"
                                : "Not available"
                              : s.quote_available
                                ? "Available; response not guaranteed"
                                : "Use the shop’s public contact options"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {shops.map((s) => (
            <button
              className="underline text-sm"
              key={s.id}
              onClick={() => {
                if (shops.length <= 2) setOpen(false);
                onRemove(s.id);
              }}
            >
              Remove {s.business_name}
            </button>
          ))}
        </div>
      </AccessibleDialog>
    </>
  );
}
