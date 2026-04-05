import { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Breadcrumbs from '@/components/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Body Kit & Wheel Installation Guides | Vicrez Installers',
  description:
    'Expert guides on body kit installation costs, widebody kit installation, wheel & tire installation, and how to choose the right installer. Everything you need to know.',
  openGraph: {
    title: 'Body Kit & Wheel Installation Guides',
    description: 'Expert guides on body kit installation, wheel & tire installation, and choosing the right installer.',
    type: 'website',
    url: 'https://installers.vicrez.com/guides',
  },
  alternates: {
    canonical: 'https://installers.vicrez.com/guides',
  },
};

const GUIDES = [
  {
    slug: 'body-kit-installation-cost',
    title: 'How Much Does Body Kit Installation Cost? (2026 Guide)',
    description:
      'Detailed breakdown of body kit installation costs by type. Lip kits, full body kits, widebody conversions, and more. Learn what affects pricing and how to save.',
    readTime: '8 min read',
  },
  {
    slug: 'widebody-kit-installation-guide',
    title: 'Complete Widebody Kit Installation Guide: What to Expect',
    description:
      'Step-by-step walkthrough of the widebody kit installation process. From preparation and test fitting to painting and final assembly. Know what to expect at every stage.',
    readTime: '10 min read',
  },
  {
    slug: 'how-to-choose-body-kit-installer',
    title: 'How to Choose a Body Kit Installer: 7 Things to Look For',
    description:
      'Find the right body kit installer with our expert checklist. Experience, portfolio, reviews, insurance, pricing transparency, and more. Avoid costly mistakes.',
    readTime: '7 min read',
  },
  {
    slug: 'wheel-and-tire-installation-guide',
    title: 'Wheel & Tire Installation Guide: Everything You Need to Know (2026)',
    description:
      'Complete guide to aftermarket wheel and tire installation. Costs, fitment specs, TPMS, staggered vs square setups, and how to find an installer near you.',
    readTime: '10 min read',
  },
  {
    slug: 'vinyl-wrap-cost-guide',
    title: 'How Much Does a Vinyl Wrap Cost? Complete 2026 Guide',
    description:
      'Comprehensive vinyl wrap cost breakdown by vehicle size and type. Full wraps ($2,500-$7,000), partial wraps, material quality, DIY vs professional installation, and choosing the right wrap shop.',
    readTime: '12 min read',
  },
  {
    slug: 'ppf-installation-guide',
    title: 'PPF Installation Guide: Cost, Process & How to Find an Installer (2026)',
    description:
      'Complete paint protection film guide covering partial front coverage ($1,500-$3,000) vs full vehicle protection, installation process, material quality, and finding certified installers.',
    readTime: '10 min read',
  },
  {
    slug: 'coilover-installation-guide',
    title: 'Coilover Installation Guide: Cost, Process & What to Expect (2026)',
    description:
      'Comprehensive coilover installation guide including costs ($550-$1,800), installation process, alignment requirements, DIY considerations, and finding qualified suspension shops.',
    readTime: '9 min read',
  },
];

export default function GuidesIndexPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs items={[{ name: 'Guides', href: '/guides' }]} />

          <div className="mb-10">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
              Automotive Installation Guides
            </h1>
            <p className="text-lg text-gray-300 max-w-2xl leading-relaxed">
              Everything you need to know about body kit, suspension, vinyl wrap, PPF, and wheel installation.
              From understanding costs to choosing the right installer, our expert guides
              help you make informed decisions for your build.
            </p>
          </div>

          <div className="space-y-6">
            {GUIDES.map((guide) => (
              <a
                key={guide.slug}
                href={`/guides/${guide.slug}`}
                className="block bg-vicrez-card border border-vicrez-border rounded-xl p-6 hover:border-vicrez-red/30 transition-colors group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-white group-hover:text-vicrez-red transition-colors mb-2">
                      {guide.title}
                    </h2>
                    <p className="text-gray-400 leading-relaxed mb-3">
                      {guide.description}
                    </p>
                    <span className="text-xs text-vicrez-muted">{guide.readTime}</span>
                  </div>
                  <svg
                    className="w-6 h-6 text-vicrez-muted group-hover:text-vicrez-red transition-colors flex-shrink-0 mt-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </a>
            ))}
          </div>

          {/* CTA */}
          <section className="mt-12 bg-gradient-to-r from-vicrez-red to-red-700 rounded-xl p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-3">Ready to Find an Installer?</h2>
            <p className="text-white/90 mb-6 max-w-xl mx-auto">
              Search our directory of 6,000+ body kit installers nationwide. Get free quotes from verified shops near you.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="/"
                className="bg-white text-vicrez-red font-bold px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Search Installers Near Me
              </a>
              <a
                href="https://www.vicrez.com/body-kits"
                target="_blank"
                rel="noopener noreferrer"
                className="border-2 border-white text-white font-bold px-6 py-3 rounded-lg hover:bg-white/10 transition-colors"
              >
                Shop Body Kits at Vicrez.com
              </a>
            </div>
          </section>

          {/* Directory link */}
          <section className="mt-10 bg-vicrez-card border border-vicrez-border rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-3">Browse the Directory</h2>
            <p className="text-gray-400 text-sm mb-3">
              Find body kit installers in your state or city.
            </p>
            <a href="/directory" className="text-vicrez-red hover:underline text-sm font-medium">
              View All States &rarr;
            </a>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
