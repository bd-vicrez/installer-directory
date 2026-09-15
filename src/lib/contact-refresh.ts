import { revalidatePath } from "next/cache";
// All data-driven public routes also use force-dynamic; a failed invalidation
// cannot expose a stale contact or make a committed mutation appear unsuccessful.
export function refreshContactPages(slug: string) {
  try {
    if (/^[a-z0-9-]+$/i.test(slug)) revalidatePath("/installer/" + slug);
    revalidatePath("/installer/[slug]", "page");
    revalidatePath("/installers/[location]", "page");
    revalidatePath("/installers/[location]/[category]", "page");
    revalidatePath("/installers/category/[category]", "page");
    for (const p of ["/", "/directory", "/sitemap.xml"]) revalidatePath(p);
  } catch {
    console.error(
      "Directory refresh failed; dynamic public routes will read current data.",
    );
  }
}
