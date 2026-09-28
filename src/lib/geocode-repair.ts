export function checkedAddressPoint(row: Record<string, any>, data: any) {
  if (data?.status !== "OK" || data.results?.length !== 1) return null;
  const result = data.results[0];
  const comp = (type: string) =>
    result.address_components?.find((c: any) => c.types?.includes(type))
      ?.short_name || "";
  const number = String(row.street_address || "").match(
    /^\s*(\d+[A-Za-z]?(?:-\d+)?)\b/,
  )?.[1];
  if (
    !number ||
    result.partial_match ||
    !["ROOFTOP", "RANGE_INTERPOLATED"].includes(
      result.geometry?.location_type,
    ) ||
    comp("country") !== "US" ||
    comp("administrative_area_level_1") !== row.state.toUpperCase() ||
    comp("postal_code") !== row.zip_code.slice(0, 5) ||
    comp("street_number").toLowerCase() !== number.toLowerCase()
  )
    return null;
  // Require a distinctive route token, beyond a number, city or road suffix.
  const route = comp("route")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(
      (s: string) =>
        s.length > 2 &&
        ![
          "street",
          "road",
          "avenue",
          "drive",
          "boulevard",
          "highway",
          "lane",
          "court",
          "parkway",
          "north",
          "south",
          "east",
          "west",
          "ave",
          "blvd",
          "pkwy",
          "hwy",
        ].includes(s),
    );
  const submitted = String(row.street_address)
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/);
  if (!route.length || !route.some((s: string) => submitted.includes(s)))
    return null;
  const { lat, lng } = result.geometry.location;
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  )
    return null;
  return {
    lat,
    lng,
    precision: result.geometry.location_type,
    formatted_address: result.formatted_address,
    place_id: result.place_id,
    source: "Google Geocoding address match",
    checked_at: new Date().toISOString(),
    eligible: true,
  };
}
