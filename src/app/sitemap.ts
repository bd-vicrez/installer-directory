/**
 * Auto-generated XML sitemap — QUALITY-ONLY strategy (2026-09-01).
 *
 * Previous strategy ("index everything", ~19.6K URLs) produced near-zero
 * indexing: Google crawled the sitemap daily and declined ~100% of the thin
 * programmatic pages. New strategy: advertise only pages with unique value —
 * verified installers, cities with bespoke city_seo content, state hubs,
 * category hubs, guides, and the /start tire-shop startup hub (~1K URLs).
 * Unverified installer profiles stay live for users but are noindexed
 * (see /installer/[slug]/page.tsx) and are NOT listed here.
 */
import { MetadataRoute } from 'next';
import {
  queryVerifiedInstallerSlugs,
  queryCitySeoCities,
  queryAllStatesWithCounts,
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

  // 5. City pages — ONLY cities with unique city_seo content (~500)
  try {
    const seoCities = await queryCitySeoCities();
    for (const c of seoCities) {
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

  // 6. Installer detail pages — VERIFIED only (~380). Unverified profiles are
  //    noindexed and intentionally absent from the sitemap.
  try {
    const slugs = await queryVerifiedInstallerSlugs();
    for (const slug of slugs) {
      urls.push({
        url: `${BASE}/installer/${slug}`,
        lastModified: now,
        changeFrequency: 'monthly',
        priority: 0.6,
      });
    }
  } catch {
    // ignore
  }

  // 7. Tire-shop startup hub — 56 pages (hub + 5 pillar guides + 50 state pages)
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
