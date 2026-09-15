import { InputError } from "./onboarding";
export async function addressCandidate(app: Record<string, any>) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new InputError("Address lookup is unavailable.", 503);
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set(
    "address",
    [app.street_address, app.city, app.state, app.zip_code].join(", "),
  );
  url.searchParams.set("components", "country:US");
  url.searchParams.set("key", key);
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new InputError("Address lookup is unavailable.", 503);
  const data = await response.json();
  if (data.status !== "OK" || data.results.length !== 1)
    throw new InputError(
      "Address needs clarification; no single confirmed match.",
    );
  const result = data.results[0],
    component = (type: string) =>
      result.address_components?.find((c: any) => c.types.includes(type))
        ?.short_name;
  const eligible =
    !result.partial_match &&
    ["ROOFTOP", "RANGE_INTERPOLATED"].includes(
      result.geometry?.location_type,
    ) &&
    component("country") === "US" &&
    component("administrative_area_level_1") === app.state &&
    component("postal_code") === app.zip_code.slice(0, 5) &&
    !!component("street_number");
  return {
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    formatted_address: result.formatted_address,
    place_id: result.place_id,
    precision: result.geometry.location_type,
    eligible,
    source: "Google Geocoding address match",
    checked_at: new Date().toISOString(),
  };
}
