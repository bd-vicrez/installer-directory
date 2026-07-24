/**
 * Auto-generated XML sitemap.
 * Includes: home, directory hubs, all installers, top cities, all states, city+service combos, guides, tire-shop startup hub.
 *
 * Next.js 14 supports a single sitemap.ts up to 50K URLs. We're under that.
 */
import { MetadataRoute } from 'next';
import {
  queryAllInstallerSlugs,
  queryAllCitiesWithCounts,
  queryAllStatesWithCounts,
  queryTopCities,
} from '@/lib/db';
import { toLocationSlug, toStateSlug, STATE_NAMES } from '@/lib/seo';
import { CATEGORY_SLUGS } from '@/lib/categories';
import { STATE_SLUGS } from '@/app/start/[state]/stateData';

const BASE = 'https://installers.vicrez.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const urls: MetadataRoute.Sitemap = [];

  // 1. Static pages
  const staticPages: { path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }[] = [
    { path: '/', changeFrequency: 'daily', priority: 1.0 },
    { path: '/directory', changeFrequency: 'weekly', priority: 0.9 },
    { path: '/guides', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/apply', changeFrequency: 'monthly', priority: 0.6 },
  ];
  for (const p of staticPages) {
    urls.push({ url: `${BASE}${p.path}`, lastModified: now, changeFrequency: p.changeFrequency, priority: p.priority });
  }

  // 2. Guides (hardcoded slugs - matches src/app/guides config)
  const GUIDE_SLUGS = [
    'body-kit-installation-cost',
    'widebody-kit-installation-guide',
    'how-to-choose-body-kit-installer',
    'wheel-and-tire-installation-guide',
    'vinyl-wrap-cost-guide',
    'ppf-installation-guide',
    'coilover-installation-guide',
  ];
  for (const slug of GUIDE_SLUGS) {
    urls.push({
      url: `${BASE}/guides/${slug}`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    });
  }

  // 3. Category hub pages
  for (const cat of CATEGORY_SLUGS) {
    urls.push({
      url: `${BASE}/installers/category/${cat}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    });
  }

  // 4. State pages (all 50)
  try {
    const states = await queryAllStatesWithCounts();
    for (const s of states) {
      const abbr = (s.state || '').toUpperCase();
      if (!STATE_NAMES[abbr]) continue;
      urls.push({
        url: `${BASE}/installers/${toStateSlug(abbr)}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.75,
      });
    }
  } catch {
    // ignore
  }

  // 5. City pages (all cities with at least 1 installer)
  let topCityRows: any[] = [];
  try {
    const allCities = await queryAllCitiesWithCounts();
    topCityRows = allCities;
    for (const c of topCityRows) {
      if (!c.city || !c.state) continue;
      urls.push({
        url: `${BASE}/installers/${toLocationSlug(c.city, c.state)}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
  } catch {
    // ignore
  }

  // 6. City + service combo pages (top 50 cities × 8 categories = 400 long-tail SEO pages)
  try {
    const top50 = topCityRows.length > 0 ? topCityRows.slice(0, 50) : await queryTopCities(50);
    for (const c of top50) {
      if (!c.city || !c.state) continue;
      const loc = toLocationSlug(c.city, c.state);
      for (const cat of CATEGORY_SLUGS) {
        urls.push({
          url: `${BASE}/installers/${loc}/${cat}`,
          lastModified: now,
          changeFrequency: 'weekly',
          priority: 0.65,
        });
      }
    }
  } catch {
    // ignore
  }

  // 7. Installer detail pages (cap at 45,000 to stay under 50K sitemap limit safely)
  try {
    const slugs = await queryAllInstallerSlugs(45000);
    for (const slug of slugs) {
      urls.push({
        url: `${BASE}/installer/${slug}`,
        lastModified: now,
        changeFrequency: 'monthly',
        priority: 0.5,
      });
    }
  } catch {
    // ignore
  }

  // 8. Tire-shop startup hub — 56 pages (hub + 5 pillar guides + 50 state pages)
  //    Top-of-funnel B2B SEO content targeting "how to open a tire shop" (~14K US searches/mo)
  urls.push({
    url: `${BASE}/start`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.9,
  });
  const START_PILLARS: { slug: string; priority: number }[] = [
    { slug: 'how-to-open-a-tire-shop', priority: 0.9 },
    { slug: 'startup-cost-calculator', priority: 0.85 },
    { slug: 'mobile-tire-business', priority: 0.85 },
    { slug: 'wholesale-tires-for-shops', priority: 0.85 },
    { slug: 'tire-shop-business-plan-template', priority: 0.85 },
  ];
  for (const p of START_PILLARS) {
    urls.push({
      url: `${BASE}/start/${p.slug}`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: p.priority,
    });
  }
  for (const st of STATE_SLUGS) {
    urls.push({
      url: `${BASE}/start/${st}`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    });
  }

  return urls;
}
