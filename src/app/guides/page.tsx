import { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Breadcrumbs from '@/components/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Body Kit Installation Guides & Resources | Vicrez Installers',
  description:
    'Expert guides on body kit installation costs, widebody kit installation process, and how to choose the right installer. Everything you need to know before your build.',
  openGraph: {
    title: 'Body Kit Installation Guides & Resources',
    description: 'Expert guides on body kit installation costs, widebody kit installation, and choosing the right installer.',
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
              Body Kit Installation Guides
            </h1>
            <p className="text-lg text-gray-300 max-w-2xl leading-relaxed">
              Everything you need to know about body kit and widebody kit installation.
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
