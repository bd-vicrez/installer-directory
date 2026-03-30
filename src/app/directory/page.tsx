import { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Breadcrumbs from '@/components/Breadcrumbs';
import { queryAllStatesWithCounts, queryTopCities } from '@/lib/db';
import { STATE_NAMES, toLocationSlug, toStateSlug } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Vicrez Installer Directory — All States | Body Kits, Wheels, Tires, Wrap & PPF',
  description: 'Browse Vicrez installers by state. Find shops for body kits, OE bumpers, aero parts, wheels, tires, vinyl wrap, PPF, window tint, and exterior accessories. 6,000+ shops across all 50 states.',
  openGraph: {
    title: 'Vicrez Installer Directory — All States',
    description: 'Find trusted Vicrez installers in every state. Body kits, bumpers, wheels, tires, wrap, PPF & more. 6,000+ shops nationwide.',
    type: 'website',
    url: 'https://installers.vicrez.com/directory',
  },
  alternates: {
    canonical: 'https://installers.vicrez.com/directory',
  },
};

export default async function DirectoryPage() {
  const [states, topCities] = await Promise.all([
    queryAllStatesWithCounts(),
    queryTopCities(24),
  ]);

  const totalInstallers = states.reduce((sum: number, s: any) => sum + parseInt(s.count), 0);

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs items={[{ name: 'Directory', href: '/directory' }]} />

          <div className="mb-10">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
              Vicrez Installer Directory
            </h1>
            <p className="text-lg text-gray-300 max-w-3xl leading-relaxed">
              Browse our nationwide directory of <strong>{totalInstallers.toLocaleString()}+ professional installers</strong> across
              every state. Find shops for OE replacement bumpers, body kits, widebody kits, front lips, side skirts, diffusers,
              spoilers, fender flares, aftermarket wheels, tires, wheel and tire packages, vinyl wrap, paint protection film (PPF),
              window tint, and exterior styling accessories. Verified shops have been confirmed through the Vicrez dealer network.
            </p>
          </div>

          {/* CTA Banner */}
          <a
            href="https://www.vicrez.com"
            target="_blank"
            rel="noopener noreferrer"
            className="block mb-10 bg-gradient-to-r from-vicrez-red to-red-700 rounded-xl p-6 text-center hover:from-vicrez-red-dark hover:to-red-800 transition-all"
          >
            <p className="text-lg font-bold text-white">Shop Bumpers, Body Kits, Wheels, Tires, Wrap & PPF at Vicrez.com</p>
            <p className="text-sm text-white/80 mt-1">
              OE replacement parts, widebody kits, aero upgrades, aftermarket wheels, VCORSA tires, vinyl wrap, PPF & more — shipped nationwide
            </p>
          </a>

          {/* All States */}
          <section className="mb-12">
            <h2 className="text-xl font-bold text-white mb-6">Browse by State</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {states
                .filter((s: any) => STATE_NAMES[s.state?.toUpperCase()])
                .sort((a: any, b: any) => (STATE_NAMES[a.state?.toUpperCase()] || '').localeCompare(STATE_NAMES[b.state?.toUpperCase()] || ''))
                .map((s: any) => {
                  const abbr = s.state.toUpperCase();
                  const name = STATE_NAMES[abbr];
                  return (
                    <a
                      key={abbr}
                      href={`/installers/${toStateSlug(abbr)}`}
                      className="bg-vicrez-card border border-vicrez-border rounded-lg p-4 hover:border-vicrez-red/30 transition-colors group"
                    >
                      <span className="font-medium text-white group-hover:text-vicrez-red transition-colors">{name}</span>
                      <span className="block text-xs text-vicrez-muted mt-1">{s.count} installers</span>
                    </a>
                  );
                })}
            </div>
          </section>

          {/* Top Cities */}
          <section className="mb-12">
            <h2 className="text-xl font-bold text-white mb-6">Top Cities</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {topCities.map((c: any) => (
                <a
                  key={`${c.city}-${c.state}`}
                  href={`/installers/${toLocationSlug(c.city, c.state)}`}
                  className="bg-vicrez-card border border-vicrez-border rounded-lg p-3 hover:border-vicrez-red/30 transition-colors group"
                >
                  <span className="text-sm font-medium text-white group-hover:text-vicrez-red transition-colors">
                    {c.city}, {c.state}
                  </span>
                  <span className="text-xs text-vicrez-muted ml-2">({c.count})</span>
                </a>
              ))}
            </div>
          </section>

          {/* Guide links */}
          <section className="bg-vicrez-card border border-vicrez-border rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-3">Installation Guides</h2>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/guides/body-kit-installation-cost" className="text-vicrez-red hover:underline">
                  How Much Does Body Kit Installation Cost? (2026 Guide)
                </a>
              </li>
              <li>
                <a href="/guides/widebody-kit-installation-guide" className="text-vicrez-red hover:underline">
                  Complete Widebody Kit Installation Guide: What to Expect
                </a>
              </li>
              <li>
                <a href="/guides/how-to-choose-body-kit-installer" className="text-vicrez-red hover:underline">
                  How to Choose a Body Kit Installer: 7 Things to Look For
                </a>
              </li>
            </ul>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
