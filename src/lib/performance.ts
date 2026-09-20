export function performanceRows(
  sessions: any[],
  requests: any[],
  followups: any[],
) {
  const groups = new Map<string, any>(),
    states = new Map(followups.map((r) => [String(r.submission_id), r.state]));
  const group = (source: string, channel: string) => {
    const key = source + ":" + channel;
    if (!groups.has(key))
      groups.set(key, {
        source,
        channel,
        sessions: 0,
        saved: 0,
        responded: 0,
        quoted: 0,
        booked: 0,
      });
    return groups.get(key);
  };
  for (const row of sessions)
    group(row.source || "unknown", row.channel || "unknown").sessions += Number(
      row.sessions,
    );
  const seen = new Set<string>();
  for (const r of requests) {
    const id = String(r.submission_id);
    if (seen.has(id)) continue;
    seen.add(id);
    const g = group(r.source || "unknown", r.channel || "unknown");
    g.saved++;
    if (r.responded) g.responded++;
    if (states.get(id) === "quoted") g.quoted++;
    if (states.get(id) === "booked") g.booked++;
  }
  return [...groups.values()].sort(
    (a, b) =>
      b.saved - a.saved ||
      b.sessions - a.sessions ||
      a.source.localeCompare(b.source),
  );
}
