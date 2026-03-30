import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HomeSearch from '@/components/HomeSearch';
import { queryTopCities, queryAllStatesWithCounts, queryInstallerStats } from '@/lib/db';
import { STATE_NAMES, toLocationSlug, toStateSlug } from '@/lib/seo';

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

export default async function HomePage() {
  const [topCities, states, stats] = await Promise.all([
    queryTopCities(20),
    queryAllStatesWithCounts(),
    queryInstallerStats(),
  ]);

  const totalInstallers = parseInt(stats?.total || '13000');
  const verifiedCount = parseInt(stats?.verified || '377');
  const stateCount = parseInt(stats?.states || '50');

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
                <div className="text-3xl font-bold text-yellow-400">4.2</div>
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
      </main>
      <Footer />
    </>
  );
}
