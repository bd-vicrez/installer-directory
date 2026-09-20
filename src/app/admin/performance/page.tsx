"use client";
import { useEffect, useState } from "react";
export default function Performance() {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState("");
  useEffect(() => {
    void fetch("/api/admin/performance", { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error(d.error);
        setData(d);
      })
      .catch((e) => setError(e.message));
  }, []);
  return (
    <div className="max-w-6xl space-y-5 text-gray-100">
      <h1 className="text-2xl font-bold">Traffic and inquiry outcomes</h1>
      <p>
        Last 30 days. The source from the first public page in a browser tab’s
        session is retained through navigation and saved with the inquiry.
        Counts describe activity; they do not prove which channel caused a
        booking.
      </p>
      {error && <p role="alert">{error}</p>}
      {!data && !error && <p>Loading saved outcomes…</p>}
      {data && (
        <>
          <p className="text-sm">
            {new Date(data.since).toLocaleString()} –{" "}
            {new Date(data.until).toLocaleString()}
          </p>
          {data.limited && (
            <p role="alert">
              This period exceeds the 10,000-inquiry report limit. Saved inquiry
              totals below cover the newest 10,000 only.
            </p>
          )}
          <div className="overflow-x-auto border rounded-xl bg-white text-gray-900">
            <table className="min-w-full text-sm">
              <caption className="p-3 text-left font-semibold">
                Sessions, saved inquiries and recorded outcomes by source
              </caption>
              <thead>
                <tr>
                  {[
                    "Source",
                    "Channel",
                    "Sessions",
                    "Saved inquiries",
                    "Inquiries with a shop reply",
                    "Currently quoted",
                    "Currently booked",
                  ].map((h) => (
                    <th key={h} className="text-left p-3 border-b">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r: any) => (
                  <tr key={r.source + ":" + r.channel}>
                    {[
                      "source",
                      "channel",
                      "sessions",
                      "saved",
                      "responded",
                      "quoted",
                      "booked",
                    ].map((k) => (
                      <td className="p-3 border-b" key={k}>
                        {r[k]}
                      </td>
                    ))}
                  </tr>
                ))}
                {!data.rows.length && (
                  <tr>
                    <td colSpan={7} className="p-4">
                      No activity recorded in this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li>
              Sessions are anonymous browser-tab sessions, not unique people.
              Blocked or failed tracking can reduce session counts.
            </li>
            <li>
              Saved inquiries count once per request. A shop reply includes
              interested, needs details or declined; several shop replies still
              count as one responding inquiry.
            </li>
            <li>
              Quoted and booked are current staff-recorded states for inquiries
              saved in this period. They are not payment or revenue records, and
              a booking is not also counted as currently quoted.
            </li>
            <li>
              Unknown includes older inquiries saved before source tracking.
              Opted-out requests have no tracking session. No historical source
              is inferred.
            </li>
            <li>
              Source labels use bounded UTM/referrer categories; raw referring
              URLs, search terms and campaign text are not retained in this
              report.
            </li>
          </ul>
        </>
      )}
    </div>
  );
}
