import { discoveryInput } from "./discovery";
import { storeDiscoveryEvent } from "./discovery-store";
import { measurementRequestAllowed } from "./measurement-privacy";

/** Only called after the inquiry backend confirms a durable receipt. Failure never invalidates that receipt. */
export async function recordSavedQuote(
  request: Request,
  body: Record<string, any>,
) {
  if (
    !body.measurement ||
    body.acquisition?.source === "opted-out" ||
    body.acquisition?.channel === "opted-out" ||
    !measurementRequestAllowed(request)
  )
    return;
  try {
    const event = discoveryInput(
      {
        id: body.request_id,
        journey_id: body.request_id,
        session_id: body.session_id,
        event: "quote_saved",
        page: body.measurement.page,
        device_category: body.measurement.device_category,
      },
      true,
    );
    await storeDiscoveryEvent(event);
  } catch {
    console.error("Saved inquiry stage measurement unavailable");
  }
}
