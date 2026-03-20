import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import InstallerCardStatic from '@/components/InstallerCardStatic';
import Breadcrumbs from '@/components/Breadcrumbs';
import {
  parseCityStateSlug,
  stateAbbrFromSlug,
  STATE_NAMES,
  toLocationSlug,
  toStateSlug,
  generateInstallerJsonLd,
  generateFaqJsonLd,
  generateBreadcrumbJsonLd,
} from '@/lib/seo';
import { queryInstallersByCity, queryInstallersByState, queryAllCitiesWithCounts, queryTopCities } from '@/lib/db';
import { Installer } from '@/lib/types';
import { getTier } from '@/lib/utils';

interface PageProps {
  params: { location: string };
}

function titleCase(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

async function getLocationData(slug: string) {
  // Try city-state first (e.g., "houston-tx")
  const cityState = parseCityStateSlug(slug);
  if (cityState) {
    const installers = await queryInstallersByCity(cityState.city, cityState.stateAbbr);
    if (installers.length > 0) {
      const stateName = STATE_NAMES[cityState.stateAbbr] || cityState.stateAbbr;
      return {
        type: 'city' as const,
        city: titleCase(cityState.city),
        stateAbbr: cityState.stateAbbr,
        stateName,
        installers,
      };
    }
  }

  // Try state (e.g., "texas" or "tx")
  const stateAbbr = stateAbbrFromSlug(slug);
  if (stateAbbr) {
    const installers = await queryInstallersByState(stateAbbr);
    if (installers.length > 0) {
      const stateName = STATE_NAMES[stateAbbr] || stateAbbr;
      return {
        type: 'state' as const,
        city: null,
        stateAbbr,
        stateName,
        installers,
      };
    }
  }

  return null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await getLocationData(params.location);
  if (!data) return { title: 'Location Not Found' };

  const count = data.installers.length;

  if (data.type === 'city' && data.city) {
    return {
      title: `Body Kit, Widebody Kit & Tire Installation in ${data.city}, ${data.stateAbbr} | Vicrez Installers`,
      description: `Find ${count} professional body kit & wheel installers in ${data.city}, ${data.stateAbbr}. Widebody kits, tire & wheel installation, aero kits, vinyl wraps & more. Get free quotes.`,
      openGraph: {
        title: `Body Kit & Wheel Installation in ${data.city}, ${data.stateAbbr}`,
        description: `${count} body kit & tire installers in ${data.city}, ${data.stateAbbr}. Widebody kits, wheel & tire installation, aero kits & more.`,
        type: 'website',
        url: `https://installers.vicrez.com/installers/${params.location}`,
      },
      alternates: {
        canonical: `https://installers.vicrez.com/installers/${params.location}`,
      },
    };
  }

  return {
    title: `Body Kit & Wheel Installers in ${data.stateName} | Vicrez Installer Directory`,
    description: `Browse ${count} professional body kit & wheel installers across ${data.stateName}. Widebody kits, tire & wheel installation, vinyl wraps & more. Get free quotes.`,
    openGraph: {
      title: `Body Kit Installers in ${data.stateName}`,
      description: `${count} body kit installers across ${data.stateName}. Professional installation for widebody kits, aero kits & more.`,
      type: 'website',
      url: `https://installers.vicrez.com/installers/${params.location}`,
    },
    alternates: {
      canonical: `https://installers.vicrez.com/installers/${params.location}`,
    },
  };
}

export async function generateStaticParams() {
  const [topCities, states] = await Promise.all([
    queryTopCities(50),
    queryAllCitiesWithCounts().then((rows) => {
      const stateSet = new Set<string>();
      rows.forEach((r: any) => {
        if (r.state) stateSet.add(r.state.toUpperCase());
      });
      return Array.from(stateSet);
    }),
  ]);

  const cityParams = topCities.map((row: any) => ({
    location: toLocationSlug(row.city, row.state),
  }));

  const stateParams = states
    .filter((abbr) => STATE_NAMES[abbr])
    .map((abbr) => ({
      location: toStateSlug(abbr),
    }));

  return [...cityParams, ...stateParams];
}

export default async function LocationPage({ params }: PageProps) {
  const data = await getLocationData(params.location);

  if (!data) {
    notFound();
  }

  const { installers, type, city, stateAbbr, stateName } = data;
  const verifiedCount = installers.filter((i: Installer) => getTier(i.source) === 'verified').length;
  const locationLabel = type === 'city' && city ? `${city}, ${stateAbbr}` : stateName;

  // Get nearby cities for cross-linking (state pages show top cities, city pages show same-state cities)
  let nearbyCities: { city: string; state: string; count: number }[] = [];
  try {
    const allCities = await queryAllCitiesWithCounts();
    if (type === 'city') {
      nearbyCities = allCities
        .filter((r: any) => r.state?.toUpperCase() === stateAbbr && r.city?.toLowerCase() !== city?.toLowerCase())
        .slice(0, 12);
    } else {
      nearbyCities = allCities
        .filter((r: any) => r.state?.toUpperCase() === stateAbbr)
        .slice(0, 20);
    }
  } catch {
    // ignore
  }

  // Build JSON-LD
  const installerSchemas = installers.slice(0, 20).map((i: Installer) => generateInstallerJsonLd(i));
  const faqSchema = generateFaqJsonLd(city || undefined, stateName);

  // Breadcrumbs
  const breadcrumbs = [
    { name: 'Directory', href: '/directory' },
    ...(type === 'city' && city
      ? [
          { name: stateName, href: `/installers/${toStateSlug(stateAbbr)}` },
          { name: `${city}, ${stateAbbr}`, href: `/installers/${params.location}` },
        ]
      : [{ name: stateName, href: `/installers/${params.location}` }]),
  ];

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* JSON-LD */}
        {installerSchemas.map((schema: any, i: number) => (
          <script
            key={i}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        ))}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs items={breadcrumbs} />

          {/* Hero section */}
          <div className="mb-10">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
              Body Kit & Wheel Installation in {locationLabel}
            </h1>
            <p className="text-lg text-gray-300 max-w-3xl leading-relaxed">
              Looking for professional <strong>widebody kit installation</strong>, <strong>tire and wheel installation</strong>, or a trusted <strong>body kit installer near me</strong> in {locationLabel}?
              Browse {installers.length} professional installation shops ready to handle everything from lip kits and aero kits
              to full widebody conversions, <strong>wheel and tire packages</strong>, and vinyl wraps. {verifiedCount > 0 && `${verifiedCount} shops are verified through the Vicrez dealer network.`}
            </p>
            <p className="text-gray-400 mt-3 max-w-3xl">
              Whether you need a professional installation for your new body kit, paint-matched bumper replacement,
              custom widebody fender flares, or <strong>aftermarket wheels and tires</strong>, these shops in {locationLabel} have the experience and equipment
              to get the job done right. Many of our installers also handle wheel fitment, tire mounting, balancing, and TPMS programming. Get free quotes and compare services below.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-vicrez-card border border-vicrez-border rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">{installers.length}</div>
              <div className="text-xs text-vicrez-muted mt-1">Total Installers</div>
            </div>
            <div className="bg-vicrez-card border border-vicrez-border rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{verifiedCount}</div>
              <div className="text-xs text-vicrez-muted mt-1">Verified Shops</div>
            </div>
            <div className="bg-vicrez-card border border-vicrez-border rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">{installers.length - verifiedCount}</div>
              <div className="text-xs text-vicrez-muted mt-1">Listed Shops</div>
            </div>
            <div className="bg-vicrez-card border border-vicrez-border rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-vicrez-red">Free</div>
              <div className="text-xs text-vicrez-muted mt-1">Quotes Available</div>
            </div>
          </div>

          {/* CTA Banner */}
          <a
            href="https://www.vicrez.com/body-kits"
            target="_blank"
            rel="noopener noreferrer"
            className="block mb-8 bg-gradient-to-r from-vicrez-red to-red-700 rounded-xl p-6 text-center hover:from-vicrez-red-dark hover:to-red-800 transition-all"
          >
            <p className="text-lg font-bold text-white">Shop Body Kits, Wheels & Tires at Vicrez.com</p>
            <p className="text-sm text-white/80 mt-1">
              Premium widebody kits, aftermarket wheels, VCorsa tires, lip kits & more — shipped to your installer
            </p>
          </a>

          {/* Installer grid */}
          <h2 className="text-xl font-bold text-white mb-6">
            {type === 'city' ? `All Installers in ${locationLabel}` : `Body Kit Installers Across ${stateName}`}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
            {installers
              .sort((a: Installer, b: Installer) => {
                const aTier = getTier(a.source) === 'verified' ? 0 : 1;
                const bTier = getTier(b.source) === 'verified' ? 0 : 1;
                return aTier - bTier;
              })
              .map((installer: Installer) => (
                <InstallerCardStatic key={installer.id} installer={installer} />
              ))}
          </div>

          {/* Nearby cities / cross-linking */}
          {nearbyCities.length > 0 && (
            <section className="mb-12">
              <h2 className="text-xl font-bold text-white mb-4">
                {type === 'city' ? `Other Cities in ${stateName}` : `Cities in ${stateName}`}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {nearbyCities.map((c: any) => (
                  <a
                    key={`${c.city}-${c.state}`}
                    href={`/installers/${toLocationSlug(c.city, c.state)}`}
                    className="bg-vicrez-card border border-vicrez-border rounded-lg p-3 hover:border-vicrez-red/30 transition-colors"
                  >
                    <span className="text-sm font-medium text-white">{c.city}, {c.state}</span>
                    <span className="text-xs text-vicrez-muted ml-2">({c.count})</span>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Internal links */}
          <section className="mb-12 bg-vicrez-card border border-vicrez-border rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-3">Helpful Resources</h2>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/guides/body-kit-installation-cost" className="text-vicrez-red hover:underline">
                  How Much Does Body Kit Installation Cost? (2026 Guide)
                </a>
              </li>
              <li>
                <a href="/guides/widebody-kit-installation-guide" className="text-vicrez-red hover:underline">
                  Complete Widebody Kit Installation Guide
                </a>
              </li>
              <li>
                <a href="/guides/how-to-choose-body-kit-installer" className="text-vicrez-red hover:underline">
                  How to Choose a Body Kit Installer: 7 Things to Look For
                </a>
              </li>
              <li>
                <a href="/guides/wheel-and-tire-installation-guide" className="text-vicrez-red hover:underline">
                  Wheel & Tire Installation Guide: What to Know Before You Buy
                </a>
              </li>
              <li>
                <a href="/directory" className="text-vicrez-red hover:underline">
                  Browse All States in the Installer Directory
                </a>
              </li>
            </ul>
          </section>

          {/* SEO content - FAQ */}
          <section className="mb-12">
            <h2 className="text-xl font-bold text-white mb-6">Frequently Asked Questions</h2>
            <div className="space-y-4">
              <div className="bg-vicrez-card border border-vicrez-border rounded-lg p-5">
                <h3 className="font-semibold text-white mb-2">How much does body kit installation cost in {locationLabel}?</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Body kit installation costs in {locationLabel} typically range from $500 to $5,000+, depending on the kit type.
                  A simple lip kit installation may cost $200–$800, while a full widebody kit conversion with paint
                  can run $3,000–$8,000+. Factors include kit complexity, paint matching, and local labor rates.
                  Always get quotes from multiple installers before deciding.
                </p>
              </div>
              <div className="bg-vicrez-card border border-vicrez-border rounded-lg p-5">
                <h3 className="font-semibold text-white mb-2">How long does body kit installation take?</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Installation time varies by kit type. A basic lip kit or splitter can be installed in 2–4 hours.
                  Full bumper replacements typically take 1–2 days. A complete widebody kit installation with prep,
                  fitting, and paint can take 1–3 weeks. Your installer will provide a more accurate timeline based
                  on your specific kit and vehicle.
                </p>
              </div>
              <div className="bg-vicrez-card border border-vicrez-border rounded-lg p-5">
                <h3 className="font-semibold text-white mb-2">Can these shops install aftermarket wheels and tires?</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Yes! Many installers in {locationLabel} handle aftermarket wheel and tire installation, including
                  wheel fitment, tire mounting, balancing, TPMS sensor programming, and hub-centric ring installation.
                  Wheel and tire installation typically costs $25–$50 per wheel for mounting and balancing, or $80–$150
                  if you need TPMS service. Many shops offer package deals when combined with body kit installation.
                  Ask your installer about wheel and tire packages from Vicrez.
                </p>
              </div>
              <div className="bg-vicrez-card border border-vicrez-border rounded-lg p-5">
                <h3 className="font-semibold text-white mb-2">How do I choose a body kit installer in {locationLabel}?</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  When choosing a body kit installer, look for experience with your specific vehicle make and model,
                  a portfolio of previous installations, positive reviews, proper insurance and certifications, a clean
                  professional shop, clear pricing with written estimates, and a warranty on their work. Verified installers
                  in the Vicrez directory have been confirmed through our dealer network.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
