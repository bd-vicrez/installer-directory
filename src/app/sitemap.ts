import { PLANNING_GUIDES } from "@/lib/planning-guides";
import { queryRecoveryServicePages } from "@/lib/db";
export const dynamic = "force-dynamic";
// Sitemap admission is shared with profile metadata; failures must not silently publish a partial sitemap.
import { MetadataRoute } from "next";
import {
  queryIndexableInstallerSlugs,
  queryCitySeoCities,
  queryAllStatesWithCounts,
} from "@/lib/db";
import { toLocationSlug, toStateSlug, STATE_NAMES } from "@/lib/seo";
import { CATEGORY_SLUGS } from "@/lib/categories";
import { STATE_SLUGS } from "@/app/start/[state]/stateData";

const BASE = "https://installers.vicrez.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const urls: MetadataRoute.Sitemap = [];

  // 1. Static pages
  const staticPages: {
    path: string;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority: number;
  }[] = [
    { path: "/how-it-works", changeFrequency: "monthly", priority: 0.6 },
    { path: "/for-shops", changeFrequency: "monthly", priority: 0.6 },
    { path: "/", changeFrequency: "daily", priority: 1.0 },
    { path: "/directory", changeFrequency: "weekly", priority: 0.9 },
    { path: "/guides", changeFrequency: "weekly", priority: 0.8 },
    { path: "/apply", changeFrequency: "monthly", priority: 0.6 },
    { path: "/about", changeFrequency: "monthly", priority: 0.5 },
    { path: "/contact", changeFrequency: "monthly", priority: 0.5 },
    {
      path: "/how-verification-works",
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
  for (const p of staticPages) {
    urls.push({
      url: `${BASE}${p.path}`,
      changeFrequency: p.changeFrequency,
      priority: p.priority,
    });
  }

  // 2. Guides (hardcoded slugs - matches src/app/guides config)
  const GUIDE_SLUGS = [
    ...Object.keys(PLANNING_GUIDES),
    "body-kit-installation-cost",
    "widebody-kit-installation-guide",
    "how-to-choose-body-kit-installer",
    "wheel-and-tire-installation-guide",
    "vinyl-wrap-cost-guide",
    "ppf-installation-guide",
    "coilover-installation-guide",
  ];
  for (const slug of GUIDE_SLUGS) {
    urls.push({
      url: `${BASE}/guides/${slug}`,

      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  // 3. Category hub pages
  for (const cat of CATEGORY_SLUGS) {
    urls.push({
      url: `${BASE}/installers/category/${cat}`,

      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  for (const path of await queryRecoveryServicePages()) {
    urls.push({
      url: `${BASE}/installers/${path}`,
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  // 4. State pages (all 50)
  {
    const states = await queryAllStatesWithCounts();
    for (const s of states) {
      const abbr = (s.state || "").toUpperCase();
      if (!STATE_NAMES[abbr]) continue;
      urls.push({
        url: `${BASE}/installers/${toStateSlug(abbr)}`,

        changeFrequency: "weekly",
        priority: 0.75,
      });
    }
  }

  // 5. City pages — ONLY cities with unique city_seo content (~500)
  {
    const seoCities = await queryCitySeoCities();
    for (const c of seoCities) {
      if (!c.city || !c.state) continue;
      urls.push({
        url: `${BASE}/installers/${toLocationSlug(c.city, c.state)}`,

        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  }

  // 6. Reviewed profiles plus the preserved pre-recovery cohort awaiting individual review.
  {
    const slugs = await queryIndexableInstallerSlugs();
    for (const slug of slugs) {
      urls.push({
        url: `${BASE}/installer/${slug}`,

        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  }

  // 7. Tire-shop startup hub — 56 pages (hub + 5 pillar guides + 50 state pages)
  //    Top-of-funnel B2B SEO content targeting "how to open a tire shop" (~14K US searches/mo)
  urls.push({
    url: `${BASE}/start`,

    changeFrequency: "weekly",
    priority: 0.9,
  });
  const START_PILLARS: { slug: string; priority: number }[] = [
    { slug: "how-to-open-a-tire-shop", priority: 0.9 },
    { slug: "startup-cost-calculator", priority: 0.85 },
    { slug: "mobile-tire-business", priority: 0.85 },
    { slug: "wholesale-tires-for-shops", priority: 0.85 },
    { slug: "tire-shop-business-plan-template", priority: 0.85 },
  ];
  for (const p of START_PILLARS) {
    urls.push({
      url: `${BASE}/start/${p.slug}`,

      changeFrequency: "monthly",
      priority: p.priority,
    });
  }
  for (const st of STATE_SLUGS) {
    urls.push({
      url: `${BASE}/start/${st}`,

      changeFrequency: "monthly",
      priority: 0.8,
    });
  }

  return [...new Map(urls.map((entry) => [entry.url, entry])).values()];
}
