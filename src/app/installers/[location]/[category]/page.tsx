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
  generateBreadcrumbJsonLd,
} from '@/lib/seo';
import {
  queryInstallersByCity,
  queryInstallersByState,
  queryTopCities,
} from '@/lib/db';
import { Installer } from '@/lib/types';
import { getTier } from '@/lib/utils';
import { CATEGORIES, CATEGORY_SLUGS, filterInstallersByCategory } from '@/lib/categories';

interface PageProps {
  params: { location: string; category: string };
}

const PER_PAGE = 60;

function titleCase(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

async function getData(locationSlug: string, categorySlug: string) {
  const config = CATEGORIES[categorySlug];
  if (!config) return null;

  // City+state first
  const cs = parseCityStateSlug(locationSlug);
  if (cs) {
    const all = await queryInstallersByCity(cs.city, cs.stateAbbr);
    const filtered = filterInstallersByCategory(all, categorySlug);
    if (all.length === 0) return null;
    return {
      type: 'city' as const,
      city: titleCase(cs.city),
      stateAbbr: cs.stateAbbr,
      stateName: STATE_NAMES[cs.stateAbbr] || cs.stateAbbr,
      installers: filtered,
      totalInLocation: all.length,
      config,
    };
  }

  // State fallback (e.g., /installers/texas/body-kits)
  const stateAbbr = stateAbbrFromSlug(locationSlug);
  if (stateAbbr) {
    const all = await queryInstallersByState(stateAbbr);
    const filtered = filterInstallersByCategory(all, categorySlug);
    if (all.length === 0) return null;
    return {
      type: 'state' as const,
      city: null,
      stateAbbr,
      stateName: STATE_NAMES[stateAbbr] || stateAbbr,
      installers: filtered,
      totalInLocation: all.length,
      config,
    };
  }

  return null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await getData(params.location, params.category);
  if (!data) return { title: 'Not Found' };

  const locationLabel = data.type === 'city' && data.city ? `${data.city}, ${data.stateAbbr}` : data.stateName;
  const title = `Best ${data.config.shortLabel}s in ${locationLabel} | Vicrez Installer Directory`;
  const description = `Find top-rated ${data.config.shortLabel.toLowerCase()}s in ${locationLabel}. ${data.installers.length} local shops for ${data.config.heading.toLowerCase()}. Compare reviews, get directions, and request quotes.`;
  const canonical = `https://installers.vicrez.com/installers/${params.location}/${params.category}`;

  return {
    title,
    description,
    openGraph: { title, description, type: 'website', url: canonical },
    alternates: { canonical },
  };
}

/**
 * Pre-build top 50 cities × 8 categories = 400 long-tail SEO pages.
 * Beyond that, on-demand ISR handles rest.
 */
export async function generateStaticParams() {
  const top = await queryTopCities(50);
  const params: { location: string; category: string }[] = [];
  for (const city of top) {
    const loc = toLocationSlug(city.city, city.state);
    for (const cat of CATEGORY_SLUGS) {
      params.push({ location: loc, category: cat });
    }
  }
  return params;
}

export default async function LocationCategoryPage({ params }: PageProps) {
  const data = await getData(params.location, params.category);
  if (!data) notFound();

  const { installers, type, city, stateAbbr, stateName, config, totalInLocation } = data;
  const locationLabel = type === 'city' && city ? `${city}, ${stateAbbr}` : stateName;
  const verifiedCount = installers.filter((i: Installer) => getTier(i.source) === 'verified').length;

  // Sort: verified first, then by rating, then by review count
  const sorted = [...installers].sort((a: Installer, b: Installer) => {
    const aTier = getTier(a.source) === 'verified' ? 0 : 1;
    const bTier = getTier(b.source) === 'verified' ? 0 : 1;
    if (aTier !== bTier) return aTier - bTier;
    const aRating = a.google_rating || 0;
    const bRating = b.google_rating || 0;
    if (bRating !== aRating) return bRating - aRating;
    return (b.google_review_count || 0) - (a.google_review_count || 0);
  });
  const paged = sorted.slice(0, PER_PAGE);

  // Build JSON-LD: top 10 + breadcrumb
  const installerSchemas = paged.slice(0, 10).map((i) => generateInstallerJsonLd(i));
  const breadcrumbSchema = generateBreadcrumbJsonLd([
    { name: 'Directory', url: 'https://installers.vicrez.com/directory' },
    { name: stateName, url: `https://installers.vicrez.com/installers/${toStateSlug(stateAbbr)}` },
    ...(type === 'city' && city
      ? [{ name: `${city}, ${stateAbbr}`, url: `https://installers.vicrez.com/installers/${params.location}` }]
      : []),
    { name: config.shortLabel, url: `https://installers.vicrez.com/installers/${params.location}/${params.category}` },
  ]);

  const breadcrumbItems = [
    { name: 'Directory', href: '/directory' },
    { name: stateName, href: `/installers/${toStateSlug(stateAbbr)}` },
    ...(type === 'city' && city
      ? [{ name: `${city}, ${stateAbbr}`, href: `/installers/${params.location}` }]
      : []),
    { name: config.shortLabel, href: `/installers/${params.location}/${params.category}` },
  ];

  return (
    <>
      <Header />
      <main className="flex-1">
        {installerSchemas.map((schema, i) => (
          <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
        ))}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs items={breadcrumbItems} />

          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
              Best {config.shortLabel}s in {locationLabel}
            </h1>
            <p className="text-lg text-gray-300 max-w-3xl leading-relaxed">
              {config.intro} Below are {installers.length} {config.shortLabel.toLowerCase()}s serving {locationLabel}
              {verifiedCount > 0 && ` — including ${verifiedCount} verified through the Vicrez dealer network`}.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-vicrez-card border border-vicrez-border rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">{installers.length}</div>
              <div className="text-xs text-vicrez-muted mt-1">{config.shortLabel}s</div>
            </div>
            <div className="bg-vicrez-card border border-vicrez-border rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{verifiedCount}</div>
              <div className="text-xs text-vicrez-muted mt-1">Verified</div>
            </div>
            <div className="bg-vicrez-card border border-vicrez-border rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">{totalInLocation}</div>
              <div className="text-xs text-vicrez-muted mt-1">Total Local Shops</div>
            </div>
            <div className="bg-vicrez-card border border-vicrez-border rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-vicrez-red">Free</div>
              <div className="text-xs text-vicrez-muted mt-1">Quotes Available</div>
            </div>
          </div>

          {/* CTA Banner */}
          <a
            href={`https://www.vicrez.com?utm_source=installers&utm_medium=combo_page&utm_campaign=${params.location}_${params.category}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block mb-8 bg-gradient-to-r from-vicrez-red to-red-700 rounded-xl p-6 text-center hover:from-vicrez-red-dark hover:to-red-800 transition-all"
          >
            <p className="text-lg font-bold text-white">Order Vicrez Parts → Ship Direct to Your Installer</p>
            <p className="text-sm text-white/80 mt-1">
              Body kits, wheels, tires, vinyl wrap, PPF & more delivered straight to a local {config.shortLabel.toLowerCase()} in {locationLabel}
            </p>
          </a>

          {installers.length === 0 ? (
            <div className="bg-vicrez-card border border-vicrez-border rounded-xl p-8 text-center mb-12">
              <h2 className="text-xl font-bold text-white mb-2">No {config.shortLabel}s indexed in {locationLabel} yet</h2>
              <p className="text-vicrez-muted mb-4">
                We're still growing our directory. Try browsing all installers in {locationLabel} or check a nearby city.
              </p>
              <a
                href={`/installers/${params.location}`}
                className="btn-primary inline-block"
              >
                View all installers in {locationLabel}
              </a>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-white mb-6">
                Top {config.shortLabel}s in {locationLabel}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
                {paged.map((installer) => (
                  <InstallerCardStatic key={installer.id} installer={installer} />
                ))}
              </div>
              {installers.length > PER_PAGE && (
                <div className="mb-12 text-center">
                  <a href={`/installers/${params.location}`} className="text-sm text-vicrez-red hover:underline">
                    View all {installers.length} {config.shortLabel.toLowerCase()}s in {locationLabel} →
                  </a>
                </div>
              )}
            </>
          )}

          {/* Cross-link to other services in this city */}
          <section className="mb-12">
            <h2 className="text-xl font-bold text-white mb-4">Other Services in {locationLabel}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {CATEGORY_SLUGS.filter((s) => s !== params.category).map((slug) => (
                <a
                  key={slug}
                  href={`/installers/${params.location}/${slug}`}
                  className="bg-vicrez-card border border-vicrez-border rounded-lg p-3 hover:border-vicrez-red/30 transition-colors block"
                >
                  <span className="text-sm font-medium text-white">{CATEGORIES[slug].shortLabel}s</span>
                  <span className="block text-xs text-vicrez-muted mt-1">in {locationLabel}</span>
                </a>
              ))}
            </div>
          </section>

          {/* Vicrez parts CTA */}
          <section className="mb-12 bg-vicrez-card border border-vicrez-border rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Shop Vicrez Parts</h2>
            <p className="text-sm text-vicrez-muted mb-4">
              Order online and have your parts shipped directly to a {config.shortLabel.toLowerCase()} in {locationLabel}.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {[
                { label: 'OE Replacements', href: 'https://www.vicrez.com/vicrez-oe-replacements-parts-store' },
                { label: 'Widebody Kits', href: 'https://www.vicrez.com/vicrez-widebody-kits' },
                { label: 'Front Lips', href: 'https://www.vicrez.com/front-splitters' },
                { label: 'Rear Diffusers', href: 'https://www.vicrez.com/rear-diffusers' },
                { label: 'Spoilers', href: 'https://www.vicrez.com/spoilers' },
                { label: 'Wheels', href: 'https://www.vicrez.com/custom-wheels' },
                { label: 'Vinyl Wrap', href: 'https://www.vicrez.com/vicrez-vinyl-wrap' },
                { label: 'PPF', href: 'https://www.vicrez.com/vicrez-pre-cut-ppf' },
              ].map((link) => (
                <a
                  key={link.label}
                  href={`${link.href}?utm_source=installers&utm_medium=combo_page&utm_campaign=${params.location}_${params.category}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-vicrez-red hover:underline"
                >
                  Shop {link.label} →
                </a>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section className="mb-12">
            <h2 className="text-xl font-bold text-white mb-6">Frequently Asked Questions</h2>
            <div className="space-y-4">
              <div className="bg-vicrez-card border border-vicrez-border rounded-lg p-5">
                <h3 className="font-semibold text-white mb-2">How do I find a {config.shortLabel.toLowerCase()} in {locationLabel}?</h3>
                <p className="text-sm text-gray-400">
                  Browse the verified Vicrez Installer Network for {locationLabel}. Each shop listing includes contact info,
                  hours, Google ratings, and directions. Look for shops marked &quot;Verified&quot; for partners that work directly with Vicrez.
                </p>
              </div>
              <div className="bg-vicrez-card border border-vicrez-border rounded-lg p-5">
                <h3 className="font-semibold text-white mb-2">Can I send Vicrez parts directly to an installer in {locationLabel}?</h3>
                <p className="text-sm text-gray-400">
                  Yes. Place your order at vicrez.com and ship straight to the installation shop. Coordinate with the shop first to confirm
                  they can receive your parts and schedule your install.
                </p>
              </div>
              <div className="bg-vicrez-card border border-vicrez-border rounded-lg p-5">
                <h3 className="font-semibold text-white mb-2">What does &quot;Verified&quot; mean?</h3>
                <p className="text-sm text-gray-400">
                  Verified installers have been confirmed through the Vicrez dealer network. They are familiar with Vicrez products and have
                  agreed to work with our customers. Other listings are aggregated from public sources for convenience.
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
