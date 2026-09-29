import type { InitialSearch } from "@/components/HomeSearch";
import { InstallerSearchError, searchInstallers } from "./installer-search";
import { readSearchOptions } from "./public-installers";
import { INITIAL_SEARCH_LIMIT } from "./search-limits";

export async function initialSearch(
  query: Record<string, string | string[] | undefined>,
): Promise<InitialSearch | undefined> {
  const params = new URLSearchParams();
  for (const key of ["q", "service", "tier", "radius", "sort", "inquiry"]) {
    const value = query[key];
    if (value !== undefined)
      params.set(key, Array.isArray(value) ? value[0] : value);
  }
  if (!params.size) return undefined;
  params.set("limit", String(INITIAL_SEARCH_LIMIT));
  let state: InitialSearch["state"] = {
    q: "",
    service: "",
    tier: "",
    radius: 50,
    sort: "recommended",
    inquiry: "",
  };
  try {
    const options = readSearchOptions(params);
    state = {
      q: options.q,
      service: options.service,
      tier: options.tier,
      radius: options.radius,
      sort: options.sort,
      inquiry: options.inquiry ? "1" : "",
    };
    return { state, results: await searchInstallers(params), error: "" };
  } catch (error) {
    return {
      state,
      results: null,
      error:
        error instanceof InstallerSearchError
          ? error.message
          : "Search is temporarily unavailable. Check your location and filters, then try again.",
    };
  }
}
