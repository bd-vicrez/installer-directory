import { UUID } from "./directory-rfq";
import { normalizeService } from "./service-taxonomy";
export const DISCOVERY_EVENTS = [
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
export function discoveryInput(b: Record<string, unknown>) {
  if (
    !DISCOVERY_EVENTS.includes(b.event as any) ||
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
  if (
    source !== null &&
    ![
      "google",
      "bing",
      "youtube",
      "instagram",
      "facebook",
      "email",
      "direct",
      "other",
    ].includes(source as string)
  )
    throw Error("Invalid source");
  return {
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
