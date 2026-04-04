import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import InstallerCardStatic from '@/components/InstallerCardStatic';
import Breadcrumbs from '@/components/Breadcrumbs';
import CtaBanner from '@/components/CtaBanner';
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
      title: `Vicrez Installer Network in ${data.city}, ${data.stateAbbr} | Body Kits, Wheels, Tires, Vinyl & PPF`,
      description: `Find trusted Vicrez installers in ${data.city}, ${data.stateAbbr} for body kits, bumpers, wheels, tires, vinyl wrap, PPF, and aftermarket parts installation. Request quotes today.`,
      openGraph: {
        title: `Vicrez Installer Network in ${data.city}, ${data.stateAbbr} | Body Kits, Wheels, Tires, Vinyl & PPF`,
        description: `Find trusted Vicrez installers in ${data.city}, ${data.stateAbbr} for body kits, bumpers, wheels, tires, vinyl wrap, PPF, and aftermarket parts installation.`,
        type: 'website',
        url: `https://installers.vicrez.com/installers/${params.location}`,
      },
      alternates: {
        canonical: `https://installers.vicrez.com/installers/${params.location}`,
      },
    };
  }

  return {
    title: `Vicrez Installer Network in ${data.stateName} | Body Kits, Wheels, Tires, Vinyl & PPF`,
    description: `Find trusted Vicrez installers across ${data.stateName} for body kits, bumpers, wheels, tires, vinyl wrap, PPF, and aftermarket parts installation. Request quotes today.`,
    openGraph: {
      title: `Vicrez Installer Network in ${data.stateName} | Body Kits, Wheels, Tires, Vinyl & PPF`,
      description: `Find trusted Vicrez installers across ${data.stateName} for body kits, bumpers, wheels, tires, vinyl wrap, PPF, and aftermarket parts installation.`,
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
              Vicrez Installer Network in {locationLabel}
            </h1>
            <p className="text-lg text-gray-300 max-w-3xl leading-relaxed">
              Find trusted installers in {locationLabel} for Vicrez aftermarket parts, OE replacement parts, body kits, aerodynamic upgrades, wheels, tires, vinyl wraps, paint protection film, and exterior styling accessories. Whether you need a bumper replacement, spoiler install, front lip install, widebody kit installation, wheel and tire package installation, or vehicle wrap service, the Vicrez Installer Network helps connect you with local shops near you.
              {verifiedCount > 0 && ` ${verifiedCount} shops are verified through the Vicrez dealer network.`}
            </p>
            <p className="text-gray-400 mt-3 max-w-3xl">
              Installers in {locationLabel} can assist with bumper installation, hood and fender replacement, widebody kits, front lips, side skirts, rear diffusers, spoilers, fender flares, wheel fitment, tire mounting, balancing, TPMS programming, vinyl wrap installation, window tint, and paint protection film. Compare installers, request quotes, and find a shop for your Vicrez parts and upgrades.
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
            href="https://www.vicrez.com"
            target="_blank"
            rel="noopener noreferrer"
            className="block mb-8 bg-gradient-to-r from-vicrez-red to-red-700 rounded-xl p-6 text-center hover:from-vicrez-red-dark hover:to-red-800 transition-all"
          >
            <p className="text-lg font-bold text-white">Shop Bumpers, Body Kits, Wheels, Tires, Vinyl Wrap & PPF at Vicrez.com</p>
            <p className="text-sm text-white/80 mt-1">
              OE replacement parts, widebody kits, aero parts, aftermarket wheels, VCORSA tires, vinyl wrap, PPF & more — shipped to your installer
            </p>
          </a>

          {/* Installer grid */}
          <h2 className="text-xl font-bold text-white mb-6">
            {type === 'city' ? `All Installers in ${locationLabel}` : `Vicrez Installers Across ${stateName}`}
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

          {/* Services section */}
          <section className="mb-12">
            <h2 className="text-xl font-bold text-white mb-4">Services Vicrez Installers May Offer in {locationLabel}</h2>
            <div className="bg-vicrez-card border border-vicrez-border rounded-xl p-6">
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-300">
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-vicrez-red flex-shrink-0" />OE replacement part installation</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-vicrez-red flex-shrink-0" />Body kit and widebody kit installation</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-vicrez-red flex-shrink-0" />Front lip, side skirt, and rear diffuser installation</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-vicrez-red flex-shrink-0" />Spoiler and aero part installation</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-vicrez-red flex-shrink-0" />Fender flare installation</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-vicrez-red flex-shrink-0" />Wheel and tire installation</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-vicrez-red flex-shrink-0" />Tire mounting and balancing</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-vicrez-red flex-shrink-0" />TPMS installation and programming</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-vicrez-red flex-shrink-0" />Vinyl wrap installation</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-vicrez-red flex-shrink-0" />Paint protection film (PPF) installation</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-vicrez-red flex-shrink-0" />Window tint installation</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-vicrez-red flex-shrink-0" />Exterior styling upgrades</li>
              </ul>
            </div>
          </section>

          {/* Popular parts section */}
          <section className="mb-12">
            <h2 className="text-xl font-bold text-white mb-4">Popular Vicrez Parts Installed in {locationLabel}</h2>
            <div className="bg-vicrez-card border border-vicrez-border rounded-xl p-6">
              <div className="flex flex-wrap gap-2">
                {['Front Bumpers', 'Rear Bumpers', 'Hoods', 'Fenders', 'Front Lips', 'Side Skirts', 'Rear Diffusers', 'Spoilers', 'Fender Flares', 'Widebody Kits', 'Wheels', 'Tires', 'Wheel & Tire Packages', 'Vinyl Wrap', 'Paint Protection Film'].map((part) => (
                  <span key={part} className="px-3 py-1.5 rounded-full text-sm bg-vicrez-dark text-gray-300 border border-vicrez-border">
                    {part}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* Shop Vicrez Parts */}
          <section className="mb-12 bg-vicrez-card border border-vicrez-border rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Shop Vicrez Parts</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {[
                { label: 'Shop OE Replacements', href: 'https://www.vicrez.com/vicrez-oe-replacements-parts-store' },
                { label: 'Shop Widebody Kits', href: 'https://www.vicrez.com/vicrez-widebody-kits' },
                { label: 'Shop Front Lips', href: 'https://www.vicrez.com/front-splitters' },
                { label: 'Shop Side Skirts', href: 'https://www.vicrez.com/front-splitters' },
                { label: 'Shop Rear Diffusers', href: 'https://www.vicrez.com/rear-diffusers' },
                { label: 'Shop Spoilers', href: 'https://www.vicrez.com/spoilers' },
                { label: 'Shop Fender Flares', href: 'https://www.vicrez.com/vicrez-widebody-kits' },
                { label: 'Shop Wheels', href: 'https://www.vicrez.com/custom-wheels' },
                { label: 'Shop Tires', href: 'https://www.vicrez.com/index.php?route=product/search&search=vcorsa' },
                { label: 'Shop Wheel & Tire Packages', href: 'https://www.vicrez.com/index.php?route=product/search&search=tire%20package' },
                { label: 'Shop Vinyl Wrap', href: 'https://www.vicrez.com/vicrez-vinyl-wrap' },
                { label: 'Shop Paint Protection Film', href: 'https://www.vicrez.com/vicrez-pre-cut-ppf' },
              ].map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-vicrez-red hover:underline"
                >
                  {link.label} &rarr;
                </a>
              ))}
            </div>
          </section>

          {/* SEO content - FAQ */}
          <section className="mb-12">
            <h2 className="text-xl font-bold text-white mb-6">Frequently Asked Questions</h2>
            <div className="space-y-4">
              <div className="bg-vicrez-card border border-vicrez-border rounded-lg p-5">
                <h3 className="font-semibold text-white mb-2">How much does it cost to install a body kit in {locationLabel}?</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Body kit installation costs in {locationLabel} vary depending on the kit type and complexity.
                  A front lip or splitter install may run $200–$800, while a full bumper replacement typically costs $500–$1,500.
                  Widebody kit conversions with paint matching can range from $3,000 to $8,000+. Factors include labor rates,
                  paint matching, and prep work. We recommend requesting quotes from multiple installers to compare pricing.
                </p>
              </div>
              <div className="bg-vicrez-card border border-vicrez-border rounded-lg p-5">
                <h3 className="font-semibold text-white mb-2">Do installers in {locationLabel} install Vicrez bumpers and aero parts?</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Many installers in {locationLabel} can install Vicrez OE replacement bumpers, front lips, side skirts,
                  rear diffusers, spoilers, and fender flares. Services may include test fitting, paint matching, and hardware
                  installation. Depending on the shop, some may also handle grilles, hoods, fenders, and lighting upgrades.
                  Contact the shop directly to confirm they can work with your specific Vicrez parts.
                </p>
              </div>
              <div className="bg-vicrez-card border border-vicrez-border rounded-lg p-5">
                <h3 className="font-semibold text-white mb-2">Can I ship Vicrez parts directly to an installer?</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Yes, many installers accept direct shipments from Vicrez. You can order your parts at vicrez.com and
                  have them shipped straight to the installation shop. It&apos;s a good idea to coordinate with the installer
                  before placing your order so they can prepare for the installation and confirm lead times.
                </p>
              </div>
              <div className="bg-vicrez-card border border-vicrez-border rounded-lg p-5">
                <h3 className="font-semibold text-white mb-2">Do installers offer wheel and tire mounting?</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Many installers in {locationLabel} offer wheel and tire services including mounting, balancing, TPMS sensor
                  programming, and hub-centric ring installation. Mounting and balancing typically costs $25–$50 per wheel,
                  while TPMS service adds $10–$25 per wheel. Some shops also handle alignment and offer package deals
                  when combined with other installation services.
                </p>
              </div>
              <div className="bg-vicrez-card border border-vicrez-border rounded-lg p-5">
                <h3 className="font-semibold text-white mb-2">Do installers in {locationLabel} install vinyl wrap and PPF?</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Some installers in {locationLabel} offer vinyl wrap installation, window tint, and paint protection film (PPF)
                  services. Vinyl wraps can range from partial accents to full vehicle color changes. PPF provides a clear
                  protective layer against rock chips and road debris. Services and pricing vary by shop, so reach out
                  to individual installers to discuss your project and get a custom quote.
                </p>
              </div>
            </div>
          </section>
        </div>

        <CtaBanner />
      </main>
      <Footer />
    </>
  );
}
