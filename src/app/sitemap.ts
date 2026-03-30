import { MetadataRoute } from 'next';
import { queryAllCitiesWithCounts, queryAllStatesWithCounts, queryAllInstallerSlugs } from '@/lib/db';
import { STATE_NAMES, toLocationSlug, toStateSlug } from '@/lib/seo';

const CATEGORY_SLUGS = [
  'wheels-and-tires',
  'body-kits',
  'vinyl-wrap',
  'ppf-installers',
  'paint-bodywork',
  'performance-mods',
  'widebody-kits',
  'custom-builds',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [cities, states, installerSlugs] = await Promise.all([
    queryAllCitiesWithCounts(),
    queryAllStatesWithCounts(),
    queryAllInstallerSlugs(10000),
  ]);

  const now = new Date().toISOString();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: 'https://installers.vicrez.com',
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: 'https://installers.vicrez.com/directory',
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: 'https://installers.vicrez.com/guides',
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: 'https://installers.vicrez.com/guides/body-kit-installation-cost',
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://installers.vicrez.com/guides/widebody-kit-installation-guide',
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://installers.vicrez.com/guides/how-to-choose-body-kit-installer',
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://installers.vicrez.com/guides/wheel-and-tire-installation-guide',
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ];

  const categoryPages: MetadataRoute.Sitemap = CATEGORY_SLUGS.map((slug) => ({
    url: `https://installers.vicrez.com/installers/category/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const statePages: MetadataRoute.Sitemap = states
    .filter((s: any) => STATE_NAMES[s.state?.toUpperCase()])
    .map((s: any) => ({
      url: `https://installers.vicrez.com/installers/${toStateSlug(s.state.toUpperCase())}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

  const cityPages: MetadataRoute.Sitemap = cities
    .filter((c: any) => c.city && c.state)
    .map((c: any) => ({
      url: `https://installers.vicrez.com/installers/${toLocationSlug(c.city, c.state)}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));

  const installerPages: MetadataRoute.Sitemap = installerSlugs
    .filter((slug: string) => slug)
    .map((slug: string) => ({
      url: `https://installers.vicrez.com/installer/${slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    }));

  return [...staticPages, ...categoryPages, ...statePages, ...cityPages, ...installerPages];
}
