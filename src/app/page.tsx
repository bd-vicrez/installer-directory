import { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HomeSearch from '@/components/HomeSearch';
import { queryTopCities, queryAllStatesWithCounts, queryInstallerStats, getPool } from '@/lib/db';
import { STATE_NAMES, toLocationSlug, toStateSlug } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Find Body Kit, Wheel, Tire, Wrap & PPF Installers Near You | Vicrez Installer Network',
  description:
    'Search the Vicrez Installer Network to find local shops for body kits, widebody kits, OE bumpers, wheels, tires, vinyl wrap, PPF, tint, suspension, and exterior upgrades. Browse thousands of installers across the U.S.',
  alternates: {
    canonical: 'https://installers.vicrez.com/',
  },
  openGraph: {
    title: 'Find Body Kit, Wheel, Tire, Wrap & PPF Installers Near You | Vicrez Installer Network',
    description:
      'Browse local installers for body kits, bumpers, wheels, tires, vinyl wrap, paint protection film, tint, and aftermarket upgrades.',
    url: 'https://installers.vicrez.com/',
    type: 'website',
  },
};

const CATEGORIES = [
  { slug: 'body-kits', label: 'Body Kits & Bumpers' },
  { slug: 'wheels-and-tires', label: 'Wheels & Tires' },
  { slug: 'vinyl-wrap', label: 'Vinyl Wrap & Tint' },
  { slug: 'ppf-installers', label: 'PPF / Clear Bra' },
  { slug: 'paint-bodywork', label: 'Paint & Bodywork' },
  { slug: 'widebody-kits', label: 'Widebody Kits' },
  { slug: 'aero-parts', label: 'Aero Parts & Spoilers' },
  { slug: 'custom-builds', label: 'Custom Builds' },
];

const SEO_GUIDES = [
  {
    slug: 'body-kit-installation-cost',
    title: 'How Much Does Body Kit Installation Cost? (2026 Guide)',
  },
  {
    slug: 'widebody-kit-installation-guide',
    title: 'Complete Widebody Kit Installation Guide: What to Expect',
  },
  {
    slug: 'how-to-choose-body-kit-installer',
    title: 'How to Choose a Body Kit Installer: 7 Things to Look For',
  },
  {
    slug: 'wheel-and-tire-installation-guide',
    title: 'Wheel & Tire Installation Guide: Everything You Need to Know (2026)',
  },
  {
    slug: 'vinyl-wrap-cost-guide',
    title: 'How Much Does a Vinyl Wrap Cost? Complete 2026 Guide',
  },
  {
    slug: 'ppf-installation-guide',
    title: 'PPF Installation Guide: Cost, Process & How to Find an Installer (2026)',
  },
  {
    slug: 'coilover-installation-guide',
    title: 'Coilover Installation Guide: Cost, Process & What to Expect (2026)',
  },
];

export default async function HomePage() {
  const [topCities, states, stats, ratingResult] = await Promise.all([
    queryTopCities(20),
    queryAllStatesWithCounts(),
    queryInstallerStats(),
    getPool().query("SELECT ROUND(AVG(google_rating)::numeric, 1) as avg_rating FROM installers WHERE status != 'removed' AND google_rating IS NOT NULL"),
  ]);

  const totalInstallers = parseInt(stats?.total || '13000');
  const verifiedCount = parseInt(stats?.verified || '377');
  const stateCount = Math.min(parseInt(stats?.states || '50'), 50);
  const avgRating = ratingResult.rows[0]?.avg_rating || '4.2';

  return (
    <>
      <Header />
      <main className="flex-1">
        <HomeSearch />

        {/* Stats Bar */}
        <section className="border-y border-vicrez-border bg-vicrez-card/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold text-white">{totalInstallers.toLocaleString()}+</div>
                <div className="text-sm text-vicrez-muted mt-1">Installers Nationwide</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white">{stateCount}</div>
                <div className="text-sm text-vicrez-muted mt-1">States Covered</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-400">{verifiedCount}</div>
                <div className="text-sm text-vicrez-muted mt-1">Verified Dealers</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-yellow-400">{avgRating}</div>
                <div className="text-sm text-vicrez-muted mt-1">Avg Google Rating</div>
              </div>
            </div>
          </div>
        </section>

        {/* Browse by Category */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-2xl font-bold text-white mb-6">Browse by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {CATEGORIES.map((cat) => (
              <a
                key={cat.slug}
                href={`/installers/category/${cat.slug}`}
                className="card p-5 text-center hover:border-vicrez-red/50 transition-colors group"
              >
                <div className="text-sm font-medium text-white group-hover:text-vicrez-red transition-colors">
                  {cat.label}
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* CTA Banner */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-gradient-to-r from-vicrez-red/10 to-vicrez-red/5 border border-vicrez-red/20 rounded-xl p-8 text-center">
            <h2 className="text-xl font-bold text-white mb-2">Own a Body Shop?</h2>
            <p className="text-vicrez-muted mb-4">Join 13,000+ installers in the Vicrez network. Get listed for free and connect with customers.</p>
            <a href="/apply" className="btn-primary inline-block">Apply to Join →</a>
          </div>
        </section>

        {/* Top Cities */}
        <section className="border-t border-vicrez-border bg-vicrez-card/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <h2 className="text-2xl font-bold text-white mb-6">Top Cities</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {topCities.map((city: any) => (
                <a
                  key={`${city.city}-${city.state}`}
                  href={`/installers/${toLocationSlug(city.city, city.state)}`}
                  className="flex items-center justify-between px-4 py-3 rounded-lg bg-vicrez-dark border border-vicrez-border hover:border-vicrez-red/50 transition-colors"
                >
                  <span className="text-sm text-gray-300 truncate">
                    {city.city}, {city.state}
                  </span>
                  <span className="text-xs text-vicrez-muted ml-2 flex-shrink-0">
                    {city.count}
                  </span>
                </a>
              ))}
            </div>
            <div className="text-center mt-6">
              <a href="/directory" className="text-sm text-vicrez-red hover:underline">
                View all cities and states →
              </a>
            </div>
          </div>
        </section>

        {/* Browse by State */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-2xl font-bold text-white mb-6">Browse by State</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {states
              .filter((s: any) => STATE_NAMES[s.state?.toUpperCase()])
              .map((s: any) => (
                <a
                  key={s.state}
                  href={`/installers/${toStateSlug(s.state.toUpperCase())}`}
                  className="text-center px-2 py-2 rounded-lg bg-vicrez-card border border-vicrez-border hover:border-vicrez-red/50 transition-colors"
                >
                  <div className="text-sm font-medium text-white">{s.state}</div>
                  <div className="text-xs text-vicrez-muted">{s.count}</div>
                </a>
              ))}
          </div>
        </section>

        {/* SEO Guides */}
        <section className="border-t border-vicrez-border bg-vicrez-card/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Installation Guides</h2>
                <p className="text-sm text-vicrez-muted mt-2">
                  SEO-friendly guides covering body kits, wheels, tires, suspension, wraps, and paint protection.
                </p>
              </div>
              <a href="/guides" className="text-sm text-vicrez-red hover:underline whitespace-nowrap">
                View all guides →
              </a>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {SEO_GUIDES.map((guide) => (
                <a
                  key={guide.slug}
                  href={`/guides/${guide.slug}`}
                  className="bg-vicrez-card border border-vicrez-border rounded-lg p-4 hover:border-vicrez-red/30 transition-colors"
                >
                  <h3 className="text-sm font-semibold text-white">{guide.title}</h3>
                </a>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
