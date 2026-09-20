export const ACQUISITION_SOURCES = [
  "google",
  "bing",
  "youtube",
  "instagram",
  "facebook",
  "email",
  "vicrez",
  "b2b",
  "referral",
  "direct",
  "other",
  "unknown",
  "opted-out",
];
export const ACQUISITION_CHANNELS = [
  "organic",
  "paid",
  "social",
  "email",
  "referral",
  "direct",
  "unknown",
  "opted-out",
];
export function acquisitionInput(value: any) {
  const source = ACQUISITION_SOURCES.includes(value?.source)
    ? value.source
    : "unknown";
  const channel = ACQUISITION_CHANNELS.includes(value?.channel)
    ? value.channel
    : "unknown";
  const session_id =
    typeof value?.session_id === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value.session_id,
    )
      ? value.session_id.toLowerCase()
      : null;
  if (source === "opted-out" || channel === "opted-out")
    return { source: "opted-out", channel: "opted-out", session_id: null };
  return { source, channel, session_id };
}
export function classifyAcquisition(url: string, referrer: string) {
  const current = new URL(url),
    raw = (current.searchParams.get("utm_source") || "").toLowerCase(),
    medium = (current.searchParams.get("utm_medium") || "").toLowerCase();
  const paid = [
    "cpc",
    "ppc",
    "paid",
    "paid_search",
    "paid_social",
    "display",
  ].includes(medium);
  if (raw) {
    const source = ACQUISITION_SOURCES.filter(
      (x) => !["unknown", "opted-out"].includes(x),
    ).includes(raw)
      ? raw
      : "other";
    const channel = paid
      ? "paid"
      : medium === "email"
        ? "email"
        : medium === "organic"
          ? "organic"
          : ["social", "organic_social"].includes(medium)
            ? "social"
            : medium === "referral"
              ? "referral"
              : source === "email"
                ? "email"
                : "unknown";
    return { source, channel };
  }
  let host = "";
  try {
    const r = new URL(referrer);
    if (r.origin !== current.origin) host = r.hostname.toLowerCase();
  } catch {}
  const domain = (base: string) => host === base || host.endsWith("." + base);
  if (!host) return { source: "direct", channel: "direct" };
  if (domain("google.com")) return { source: "google", channel: "organic" };
  if (domain("bing.com")) return { source: "bing", channel: "organic" };
  for (const source of ["youtube", "instagram", "facebook"])
    if (domain(source + ".com")) return { source, channel: "social" };
  if (domain("b2b.vicrez.com")) return { source: "b2b", channel: "referral" };
  if (domain("vicrez.com")) return { source: "vicrez", channel: "referral" };
  return { source: "referral", channel: "referral" };
}
