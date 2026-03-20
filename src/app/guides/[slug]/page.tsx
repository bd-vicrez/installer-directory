import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Breadcrumbs from '@/components/Breadcrumbs';
import { generateArticleJsonLd, generateFaqJsonLd } from '@/lib/seo';
import BodyKitInstallationCostGuide from './body-kit-installation-cost';
import WidebodyKitInstallationGuide from './widebody-kit-installation-guide';
import HowToChooseInstallerGuide from './how-to-choose-body-kit-installer';
import WheelAndTireInstallationGuide from './wheel-and-tire-installation-guide';

interface PageProps {
  params: { slug: string };
}

const GUIDES: Record<string, {
  title: string;
  description: string;
  datePublished: string;
  dateModified: string;
  component: React.ComponentType;
}> = {
  'body-kit-installation-cost': {
    title: 'How Much Does Body Kit Installation Cost? (2026 Guide)',
    description: 'Detailed breakdown of body kit installation costs by type. Widebody kits ($2,000–$5,000+), lip kits ($200–$800), bumper kits ($500–$1,500) and more. Get accurate pricing for your project.',
    datePublished: '2026-01-15',
    dateModified: '2026-03-19',
    component: BodyKitInstallationCostGuide,
  },
  'widebody-kit-installation-guide': {
    title: 'Complete Widebody Kit Installation Guide: What to Expect',
    description: 'Step-by-step guide to widebody kit installation. Learn about preparation, fitting, painting, and what to expect from start to finish. Expert tips from professional installers.',
    datePublished: '2026-01-20',
    dateModified: '2026-03-19',
    component: WidebodyKitInstallationGuide,
  },
  'how-to-choose-body-kit-installer': {
    title: 'How to Choose a Body Kit Installer: 7 Things to Look For',
    description: 'Learn how to find the right body kit installer. 7 essential factors including experience, portfolio, pricing, warranty, and more. Avoid costly mistakes with our expert guide.',
    datePublished: '2026-02-01',
    dateModified: '2026-03-19',
    component: HowToChooseInstallerGuide,
  },
  'wheel-and-tire-installation-guide': {
    title: 'Wheel & Tire Installation Guide: Everything You Need to Know (2026)',
    description: 'Complete guide to aftermarket wheel and tire installation. Costs, fitment specs (bolt pattern, offset, hub bore), TPMS, staggered vs square setups, and how to find an installer near you.',
    datePublished: '2026-03-19',
    dateModified: '2026-03-19',
    component: WheelAndTireInstallationGuide,
  },
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const guide = GUIDES[params.slug];
  if (!guide) return { title: 'Guide Not Found' };

  return {
    title: guide.title,
    description: guide.description,
    openGraph: {
      title: guide.title,
      description: guide.description,
      type: 'article',
      url: `https://installers.vicrez.com/guides/${params.slug}`,
      publishedTime: guide.datePublished,
      modifiedTime: guide.dateModified,
    },
    alternates: {
      canonical: `https://installers.vicrez.com/guides/${params.slug}`,
    },
  };
}

export function generateStaticParams() {
  return Object.keys(GUIDES).map((slug) => ({ slug }));
}

export default function GuidePage({ params }: PageProps) {
  const guide = GUIDES[params.slug];
  if (!guide) notFound();

  const articleJsonLd = generateArticleJsonLd({
    title: guide.title,
    description: guide.description,
    url: `https://installers.vicrez.com/guides/${params.slug}`,
    datePublished: guide.datePublished,
    dateModified: guide.dateModified,
  });

  const faqJsonLd = generateFaqJsonLd();

  const GuideComponent = guide.component;

  return (
    <>
      <Header />
      <main className="flex-1">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs items={[
            { name: 'Guides', href: '/guides' },
            { name: guide.title.split(':')[0].split('(')[0].trim(), href: `/guides/${params.slug}` },
          ]} />

          <GuideComponent />

          {/* CTA Section */}
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

          {/* Related guides */}
          <section className="mt-12">
            <h2 className="text-xl font-bold text-white mb-4">Related Guides</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(GUIDES)
                .filter(([slug]) => slug !== params.slug)
                .map(([slug, g]) => (
                  <a
                    key={slug}
                    href={`/guides/${slug}`}
                    className="bg-vicrez-card border border-vicrez-border rounded-lg p-4 hover:border-vicrez-red/30 transition-colors"
                  >
                    <h3 className="font-semibold text-white text-sm">{g.title}</h3>
                    <p className="text-xs text-vicrez-muted mt-2 line-clamp-2">{g.description}</p>
                  </a>
                ))}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
