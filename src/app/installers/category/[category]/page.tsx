import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { queryInstallersByCapability } from '@/lib/db';
import { Installer } from '@/lib/types';
import { generateBreadcrumbJsonLd } from '@/lib/seo';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Breadcrumbs from '@/components/Breadcrumbs';
import InstallerCardStatic from '@/components/InstallerCardStatic';

interface CategoryConfig {
  title: string;
  description: string;
  keywords: string[];
  heading: string;
  intro: string;
}

const CATEGORIES: Record<string, CategoryConfig> = {
  'wheels-and-tires': {
    title: 'Wheel & Tire Installers Near You',
    description: 'Find professional wheel and tire installation shops. Aftermarket wheel fitment, tire mounting, balancing, TPMS service & alignment.',
    keywords: ['wheel', 'tire', 'rim', 'alignment', 'balancing'],
    heading: 'Wheel & Tire Installation Shops',
    intro: 'Find shops that specialize in aftermarket wheel and tire installation, including fitment, mounting, balancing, and TPMS programming.',
  },
  'body-kits': {
    title: 'Body Kit Installers Near You',
    description: 'Find expert body kit installation shops. Front bumpers, rear bumpers, side skirts, splitters, diffusers & full widebody kit installation.',
    keywords: ['body kit', 'bumper', 'splitter', 'diffuser', 'spoiler', 'lip', 'side skirt', 'fender', 'aero'],
    heading: 'Body Kit Installation Shops',
    intro: 'Professional shops that install bumpers, splitters, diffusers, spoilers, side skirts, and full body kit conversions.',
  },
  'vinyl-wrap': {
    title: 'Vinyl Wrap & Tint Installers Near You',
    description: 'Find professional vinyl wrap, window tint, and ceramic coating shops. Full vehicle wraps, color change wraps, PPF & detail services.',
    keywords: ['vinyl', 'wrap', 'tint', 'window tint', 'ceramic coat', 'detail'],
    heading: 'Vinyl Wrap & Tint Shops',
    intro: 'Shops specializing in vinyl wrapping, window tinting, ceramic coating, and automotive detailing services.',
  },
  'ppf-installers': {
    title: 'PPF (Paint Protection Film) Installers Near You',
    description: 'Find PPF installation experts. Paint protection film, clear bra, self-healing film & ceramic coating services.',
    keywords: ['ppf', 'paint protection', 'clear bra'],
    heading: 'Paint Protection Film (PPF) Installers',
    intro: 'Expert installers of paint protection film (PPF), clear bra, and self-healing protective coatings for your vehicle.',
  },
  'paint-bodywork': {
    title: 'Paint & Bodywork Shops Near You',
    description: 'Find professional auto body and paint shops. Custom paint, body repair, collision repair, refinishing & paint correction.',
    keywords: ['paint', 'body work', 'bodywork', 'collision', 'auto body', 'autobody', 'refinish'],
    heading: 'Paint & Body Work Shops',
    intro: 'Professional auto body shops offering custom paint, bodywork repairs, collision repair, and refinishing services.',
  },
  'performance-mods': {
    title: 'Performance Modification Shops Near You',
    description: 'Find performance tuning and modification shops. Exhaust, turbo, supercharger, suspension, ECU tuning & engine builds.',
    keywords: ['performance', 'exhaust', 'turbo', 'supercharger', 'tune', 'tuning', 'suspension', 'intake', 'engine'],
    heading: 'Performance Modification Shops',
    intro: 'Shops that install performance parts including exhaust systems, turbos, superchargers, suspension upgrades, and ECU tuning.',
  },
  'widebody-kits': {
    title: 'Widebody Kit Installers Near You',
    description: 'Find shops that specialize in widebody kit installation. Rocket Bunny, Liberty Walk, Pandem & custom wide fender conversions.',
    keywords: ['widebody', 'wide body', 'fender flare', 'overfender'],
    heading: 'Widebody Kit Installation Shops',
    intro: 'Shops experienced in installing widebody conversion kits, including wide fender flares, bolt-on and molded widebody setups.',
  },
  'custom-builds': {
    title: 'Custom Build Shops Near You',
    description: 'Find shops for full custom vehicle builds. Restomod, show car, custom fabrication, complete vehicle transformation.',
    keywords: ['custom', 'build', 'fabricat', 'restomod', 'show car'],
    heading: 'Custom Build & Fabrication Shops',
    intro: 'Full-service custom shops for complete vehicle builds, custom fabrication, restomods, and show car preparation.',
  },
};

interface PageProps {
  params: { category: string };
}

export async function generateStaticParams() {
  return Object.keys(CATEGORIES).map((category) => ({ category }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const config = CATEGORIES[params.category];
  if (!config) return { title: 'Category Not Found' };

  return {
    title: `${config.title} | Vicrez Installer Directory`,
    description: config.description,
    openGraph: {
      title: `${config.title} | Vicrez Installer Directory`,
      description: config.description,
      type: 'website',
      url: `https://installers.vicrez.com/installers/category/${params.category}`,
    },
    alternates: {
      canonical: `/installers/category/${params.category}`,
    },
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const config = CATEGORIES[params.category];
  if (!config) notFound();

  // Query installers matching any of the category keywords
  const allResults: Installer[] = [];
  const seenIds = new Set<string | number>();

  for (const keyword of config.keywords) {
    const results = await queryInstallersByCapability(keyword, 200);
    for (const r of results) {
      if (!seenIds.has(r.id)) {
        seenIds.add(r.id);
        allResults.push(r);
      }
    }
  }

  // Sort: rated first, then by review count
  allResults.sort((a, b) => {
    if (a.google_rating && !b.google_rating) return -1;
    if (!a.google_rating && b.google_rating) return 1;
    return (b.google_review_count || 0) - (a.google_review_count || 0);
  });

  const displayedInstallers = allResults.slice(0, 120);

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: config.title,
    description: config.description,
    url: `https://installers.vicrez.com/installers/category/${params.category}`,
    numberOfItems: allResults.length,
    provider: {
      '@type': 'Organization',
      name: 'Vicrez',
      url: 'https://www.vicrez.com',
    },
  };

  const breadcrumbItems = [
    { name: 'Directory', href: '/directory' },
    { name: config.heading, href: `/installers/category/${params.category}` },
  ];

  return (
    <>
      <Header />
      <main className="flex-1">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs items={breadcrumbItems} />

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-3">{config.heading}</h1>
            <p className="text-gray-400 max-w-3xl">{config.intro}</p>
            <p className="text-sm text-vicrez-muted mt-2">
              Showing <span className="text-white font-semibold">{displayedInstallers.length}</span> of{' '}
              <span className="text-white font-semibold">{allResults.length}</span> shops
            </p>
          </div>

          {/* Browse other categories */}
          <div className="flex flex-wrap gap-2 mb-8">
            {Object.entries(CATEGORIES).map(([slug, cat]) => (
              <a
                key={slug}
                href={`/installers/category/${slug}`}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  slug === params.category
                    ? 'bg-vicrez-red text-white border-vicrez-red'
                    : 'bg-vicrez-card text-gray-400 border-vicrez-border hover:border-vicrez-red hover:text-white'
                }`}
              >
                {cat.heading.replace(' Shops', '').replace(' Installation', '')}
              </a>
            ))}
          </div>

          {displayedInstallers.length === 0 ? (
            <div className="text-center py-16">
              <h3 className="text-xl font-semibold mb-2 text-white">No installers found</h3>
              <p className="text-vicrez-muted">No shops match this category yet. Try browsing other categories.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedInstallers.map((installer) => (
                <InstallerCardStatic key={installer.id} installer={installer} />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
