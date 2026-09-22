import {
  stateAbbrFromSlug,
  parseCityStateSlug,
  toLocationSlug,
  toStateSlug,
} from "./locations";

/** One spelling for each supported location. This does not claim a location has shops. */
export function canonicalLocation(slug: string): string | null {
  const state = stateAbbrFromSlug(slug);
  if (state) return toStateSlug(state);
  const city = parseCityStateSlug(slug);
  if (!city?.city.trim()) return null;
  // The stored city and historical sitemap include the period.
  const name =
    city.city.toLowerCase() === "port st lucie" ? "port st. lucie" : city.city;
  return toLocationSlug(name.trim(), city.stateAbbr);
}

export function locationRedirect(
  pathname: string,
  search: string,
): string | null {
  const match = pathname.match(/^\/installers\/([^/]+)(\/[^/]+)?$/);
  if (!match || match[1] === "category") return null;
  const location = canonicalLocation(match[1]);
  if (!location) return null;
  const query = new URLSearchParams(search);
  const pages = query.getAll("page");
  let pageChanged = false;
  if (pages.length) {
    const page = /^[1-9]\d{0,4}$/.test(pages[0]) ? Number(pages[0]) : 1;
    if (page === 1 || pages.length > 1) {
      query.delete("page");
      if (page > 1) query.set("page", String(page));
      pageChanged = true;
    }
  }
  const nextPath = `/installers/${location}${match[2] || ""}`;
  // Query order/encoding is not a canonicalization reason: Vercel may reorder it
  // while forwarding a redirect, causing a loop if we compare serialized strings.
  if (nextPath === pathname && !pageChanged) return null;
  const nextSearch = pageChanged ? (query.size ? "?" + query.toString() : "") : search;
  return nextPath + nextSearch;
}
