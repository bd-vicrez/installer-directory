import { ACQUISITION_SOURCES, ACQUISITION_CHANNELS } from "./acquisition";
import { UUID } from "./directory-rfq";
import { normalizeService } from "./service-taxonomy";
export const DISCOVERY_EVENTS = [
  "session_start",
  "search",
  "search_empty",
  "filter",
  "profile_view",
  "phone_click",
  "directions_click",
  "website_click",
  "dealer_click",
  "store_click",
  "application_start",
  "application_complete",
  "claim_start",
  "claim_complete",
  "comparison_open",
  "search_start",
  "search_error",
  "search_cancel",
  "search_results",
  "quote_open",
  "quote_input",
  "quote_step",
  "quote_validation",
  "quote_attempt",
  "quote_error",
  "quote_close",
  "application_attempt",
  "application_error",
  "application_validation",
  "claim_attempt",
  "claim_error",
  "claim_validation",
  "lookup_start",
  "lookup_results",
  "lookup_error",
  "lookup_new",
  "lookup_claim",
  "web_vital",
] as const;
const PAGES = [
  "home",
  "profile",
  "apply",
  "claim",
  "category",
  "location",
  "shops",
  "guide",
  "other",
];
export function discoveryInput(b: Record<string, unknown>, server = false) {
  if (!b || typeof b !== "object") throw Error("Invalid event");
  if (
    (!DISCOVERY_EVENTS.includes(b.event as any) &&
      !(server && b.event === "quote_saved")) ||
    !UUID.test(String(b.id || "")) ||
    !UUID.test(String(b.session_id || ""))
  )
    throw Error("Invalid event");
  const page = b.page === undefined ? "home" : b.page;
  if (!PAGES.includes(page as string)) throw Error("Invalid page");
  const listing = b.listing_id === undefined ? null : String(b.listing_id);
  if (listing !== null && !/^[a-zA-Z0-9_-]{1,80}$/.test(listing))
    throw Error("Invalid listing");
  const bucket = b.result_bucket === undefined ? null : b.result_bucket;
  if (
    bucket !== null &&
    !["0", "1-5", "6-24", "25+"].includes(bucket as string)
  )
    throw Error("Invalid count");
  const service = b.service ? normalizeService(String(b.service)) : null;
  if (b.service && !service) throw Error("Invalid service");
  const target = b.target === undefined ? null : b.target;
  if (target !== null && !["b2b", "storefront"].includes(target as string))
    throw Error("Invalid destination");
  const source = b.campaign_source === undefined ? null : b.campaign_source;
  if (source !== null && !ACQUISITION_SOURCES.includes(source as string))
    throw Error("Invalid source");
  const channel =
    b.acquisition_channel === undefined ? null : b.acquisition_channel;
  if (channel !== null && !ACQUISITION_CHANNELS.includes(channel as string))
    throw Error("Invalid channel");
  const device_category = b.device_category ?? null;
  if (
    device_category !== null &&
    !["mobile", "tablet", "desktop"].includes(device_category as string)
  )
    throw Error("Invalid device");
  const journey_id = b.journey_id ?? null;
  if (journey_id !== null && !UUID.test(String(journey_id)))
    throw Error("Invalid journey");
  const step = b.step ?? null;
  if (
    step !== null &&
    !["project", "contact", "review"].includes(step as string)
  )
    throw Error("Invalid step");
  const duration_ms = b.duration_ms ?? null;
  if (
    duration_ms !== null &&
    (typeof duration_ms !== "number" ||
      !Number.isInteger(duration_ms) ||
      duration_ms < 0 ||
      duration_ms > 3600000)
  )
    throw Error("Invalid duration");
  const metric = b.metric ?? null,
    metric_value = b.metric_value ?? null;
  const metric_sequence = b.metric_sequence ?? 0;
  if (
    typeof metric_sequence !== "number" ||
    !Number.isInteger(metric_sequence) ||
    metric_sequence < 0 ||
    metric_sequence > 1000000
  )
    throw Error("Invalid metric sequence");
  if (b.event === "web_vital") {
    if (
      !["LCP", "CLS", "INP"].includes(metric as string) ||
      typeof metric_value !== "number" ||
      !Number.isFinite(metric_value) ||
      metric_value < 0 ||
      metric_value > (metric === "CLS" ? 100 : 3600000)
    )
      throw Error("Invalid metric");
  } else if (metric !== null || metric_value !== null)
    throw Error("Unexpected metric");
  if (
    (String(b.event).startsWith("quote_") ||
      [
        "search_start",
        "search_results",
        "search_error",
        "search_cancel",
        "lookup_start",
        "lookup_results",
        "lookup_error",
      ].includes(String(b.event))) &&
    !journey_id
  )
    throw Error("Missing journey");
  if (["quote_step", "quote_validation"].includes(String(b.event)) && !step)
    throw Error("Missing step");
  return {
    device_category,
    journey_id,
    step,
    duration_ms,
    metric,
    metric_value,
    metric_sequence,
    acquisition_channel: channel,
    id: b.id,
    event: b.event,
    session_id: b.session_id,
    page,
    listing_id: listing,
    result_bucket: bucket,
    service,
    target,
    campaign_source: source,
  };
}
