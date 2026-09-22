export const STATE_NAMES: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
  DC: "District of Columbia",
};

export const STATE_ABBR_FROM_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_NAMES).map(([abbr, name]) => [name.toLowerCase(), abbr]),
);

export function stateAbbrFromSlug(slug: string): string | null {
  // Try direct abbreviation match (e.g., "tx", "ca")
  const upper = slug.toUpperCase();
  if (STATE_NAMES[upper]) return upper;

  // Try full state name (e.g., "texas", "california", "new-york")
  const normalized = slug.replace(/-/g, " ").toLowerCase();
  if (STATE_ABBR_FROM_NAME[normalized]) return STATE_ABBR_FROM_NAME[normalized];

  return null;
}

export function parseCityStateSlug(
  slug: string,
): { city: string; stateAbbr: string } | null {
  const parts = slug.split("-");
  if (parts.length < 2) return null;

  // Try 2-letter abbreviation at end: "houston-tx", "new-york-ny"
  const lastPart = parts[parts.length - 1].toUpperCase();
  if (STATE_NAMES[lastPart]) {
    const city = parts.slice(0, -1).join(" ");
    return { city, stateAbbr: lastPart };
  }

  // Try full state name at end: "miami-florida", "houston-texas", "new-york-city-new-york"
  // Check last 1, 2, or 3 parts as state name
  for (let i = 1; i <= Math.min(3, parts.length - 1); i++) {
    const stateParts = parts.slice(-i).join(" ").toLowerCase();
    const abbr = STATE_ABBR_FROM_NAME[stateParts];
    if (abbr) {
      const city = parts.slice(0, -i).join(" ");
      if (city) return { city, stateAbbr: abbr };
    }
  }

  return null;
}

function normalizeStateToAbbr(state: string): string {
  if (!state) return "";
  const upper = state.toUpperCase().trim();
  // Already an abbreviation
  if (upper.length === 2 && STATE_NAMES[upper]) return upper;
  // Full state name
  const abbr = STATE_ABBR_FROM_NAME[state.toLowerCase().trim()];
  return abbr || state.toLowerCase();
}

export function toLocationSlug(city: string, state: string): string {
  const stateAbbr = normalizeStateToAbbr(state);
  return `${city.toLowerCase().replace(/\s+/g, "-")}-${stateAbbr.toLowerCase()}`;
}

export function toStateSlug(stateAbbr: string): string {
  const name = STATE_NAMES[stateAbbr.toUpperCase()];
  if (!name) return stateAbbr.toLowerCase();
  return name.toLowerCase().replace(/\s+/g, "-");
}
