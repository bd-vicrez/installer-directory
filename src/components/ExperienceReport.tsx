"use client";
import { useEffect, useState } from "react";
const labels: Record<string, string> = {
  lookup_start: "Business lookup started",
  lookup_results: "Lookup results returned",
  lookup_error: "Lookup error",
  lookup_new: "Chose new application",
  lookup_claim: "Chose existing listing",
  application_start: "Application first input",
  application_attempt: "Application submitted",
  application_complete: "Application confirmed",
  application_error: "Application submission error",
  application_validation: "Application validation issue",
  claim_start: "Claim first input",
  claim_attempt: "Claim submitted",
  claim_complete: "Claim confirmed",
  claim_error: "Claim submission error",
  claim_validation: "Claim validation issue",
};
export default function ExperienceReport() {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState("");
  const [device, setDevice] = useState("mobile");
  useEffect(() => {
    void fetch("/api/admin/experience", { cache: "no-store" })
      .then(async (r) => {
        const value = await r.json();
        if (!r.ok) throw Error(value.error);
        setData(value);
      })
      .catch((e) => setError(e.message));
  }, []);
  const search = data?.search.find((r: any) => r.device_category === device);
  const quotes = data?.quotes.find((r: any) => r.device_category === device);
  const contacts = data?.contacts.find(
    (r: any) => r.device_category === device,
  );
  const vitals =
    data?.vitals.filter((r: any) => r.device_category === device) || [];
  const forms =
    data?.forms.filter((r: any) => r.device_category === device) || [];
  return (
    <section
      className="border rounded-xl p-5 bg-white text-gray-900 space-y-4"
      aria-label="Speed and journey measurements"
    >
      <h2 className="text-xl font-bold">Speed and journey measurements</h2>
      <p className="text-sm">
        Last 30 days of new measurements. Known automated checks, opted-out
        visitors and excluded QA tabs are omitted. Counts are recorded journeys,
        not verified people.
      </p>
      <label className="block text-sm font-medium">
        Device{" "}
        <select
          className="input-field ml-2"
          value={device}
          onChange={(e) => setDevice(e.target.value)}
        >
          <option value="mobile">Mobile</option>
          <option value="tablet">Tablet</option>
          <option value="desktop">Desktop</option>
        </select>
      </label>
      {error && <p role="alert">{error}</p>}
      {!data && !error && <p>Loading measurements…</p>}
      {data && (
        <>
          <p className="text-sm">
            {data.coverage.first_event
              ? "Recording since " +
                new Date(data.coverage.first_event).toLocaleString()
              : "Waiting for the first eligible visit. Historical mobile stages cannot be reconstructed."}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="text-left font-semibold py-2">
                Actual visitor speed, 75th percentile
              </caption>
              <thead>
                <tr>
                  {["Page", "Metric", "Value", "Samples"].map((h) => (
                    <th className="p-2 text-left border-b" key={h}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vitals.map((r: any) => (
                  <tr key={r.page + r.metric}>
                    <td className="p-2">{r.page}</td>
                    <td className="p-2">{r.metric}</td>
                    <td className="p-2">
                      {r.metric === "CLS"
                        ? Number(r.p75).toFixed(3)
                        : Math.round(r.p75) + " ms"}
                    </td>
                    <td className="p-2">
                      {r.samples}
                      {r.samples < 20 ? " · small sample" : ""}
                    </td>
                  </tr>
                ))}
                {!vitals.length && (
                  <tr>
                    <td colSpan={4} className="p-2">
                      No speed samples for this device yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs">
            Targets: LCP ≤ 2,500 ms; CLS ≤ 0.1; INP ≤ 200 ms. INP requires
            interaction and may be absent. These are this site's measurements,
            not Google's CrUX assessment; low sample counts cannot establish a
            stable trend.
          </p>
          <h3 className="font-semibold">Search</h3>
          {search ? (
            <p className="text-sm">
              {search.started} started → {search.results} rendered results.{" "}
              {search.errors} errors; {search.cancelled} superseded or
              cancelled; {search.no_result_recorded} with no recorded result
              after 30 minutes. Interactive search results at p75:{" "}
              {search.results_p75_ms === null
                ? "not available"
                : Math.round(search.results_p75_ms) + " ms"}
              .
            </p>
          ) : (
            <p className="text-sm">No search journeys for this device yet.</p>
          )}
          <h3 className="font-semibold">Quote form</h3>
          {contacts && (
            <p className="text-sm">
              Of {contacts.search_sessions} browser sessions with results,{" "}
              {contacts.contact_sessions} later recorded a phone, directions,
              website or quote-form action within 30 minutes. Profile views are
              not required to contact a shop.
            </p>
          )}
          {quotes ? (
            <>
              <p className="text-sm">
                {quotes.opened} opened → {quotes.entered} entered details →{" "}
                {quotes.contact} reached Contact → {quotes.review} reached
                Review → {quotes.attempted} attempted → {quotes.saved}{" "}
                server-confirmed saves.
              </p>
              <p className="text-sm">
                No later progress recorded for 30 minutes: Project{" "}
                {quotes.stopped_project}; Contact {quotes.stopped_contact};
                Review {quotes.stopped_review}; attempted without a confirmed
                save {quotes.attempt_unconfirmed}. Recent unfinished journeys:{" "}
                {quotes.recent_unfinished}.
              </p>
              <p className="text-sm">
                Journeys with validation issues: {quotes.validation}. Submission
                errors: {quotes.errors}.
              </p>
            </>
          ) : (
            <p className="text-sm">No quote journeys for this device yet.</p>
          )}
          <p className="text-xs">
            Missing events can look like exits. A visitor may return later.
            Steps use the furthest recorded stage for each request; repeated
            opens and retries count once per journey. These counts do not prove
            speed caused an exit.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="text-left font-semibold py-2">
                Business lookup, applications and claims
              </caption>
              <thead>
                <tr>
                  <th className="p-2 text-left border-b">Action</th>
                  <th className="p-2 text-left border-b">Journeys</th>
                </tr>
              </thead>
              <tbody>
                {forms.map((r: any) => (
                  <tr key={r.event}>
                    <td className="p-2">{labels[r.event] || r.event}</td>
                    <td className="p-2">{r.journeys}</td>
                  </tr>
                ))}
                {!forms.length && (
                  <tr>
                    <td colSpan={2} className="p-2">
                      No business-form journeys for this device yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
