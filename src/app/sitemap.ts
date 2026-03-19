import { MetadataRoute } from 'next';
import { queryAllCitiesWithCounts, queryAllStatesWithCounts } from '@/lib/db';
import { STATE_NAMES, toLocationSlug, toStateSlug } from '@/lib/seo';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [cities, states] = await Promise.all([
    queryAllCitiesWithCounts(),
    queryAllStatesWithCounts(),
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
  ];

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

  return [...staticPages, ...statePages, ...cityPages];
}
