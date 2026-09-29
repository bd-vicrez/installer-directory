import type { InitialSearch } from "@/components/HomeSearch";
import { InstallerSearchError, searchInstallers } from "./installer-search";
import { readSearchOptions } from "./public-installers";

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
