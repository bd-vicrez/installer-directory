import { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Breadcrumbs from '@/components/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Start a Tire Shop — The Complete 2026 Resource | Vicrez',
  description:
    'Everything you need to start a tire shop in 2026 — startup costs, licensing by state, mobile vs brick-and-mortar, wholesale tire sourcing, equipment, financing, and a free interactive cost calculator. Built by Vicrez, supplier to 16,500+ installers.',
  openGraph: {
    title: 'Start a Tire Shop — Complete 2026 Resource',
    description:
      'Startup costs, licensing, equipment, wholesale sourcing, and a free interactive calculator. The definitive guide for new tire shop owners.',
    type: 'website',
    url: 'https://installers.vicrez.com/start',
  },
  alternates: {
    canonical: 'https://installers.vicrez.com/start',
  },
};

const PILLAR_GUIDES = [
  {
    slug: 'how-to-open-a-tire-shop',
    title: 'How to Open a Tire Shop — The Complete 2026 Guide',
    description:
      'A 14-step roadmap covering business structure, licensing, location, equipment, staffing, inventory, insurance, and marketing. Written for first-time owners.',
    readTime: '22 min read',
    badge: 'PILLAR',
  },
  {
    slug: 'startup-cost-calculator',
    title: 'Tire Shop Startup Cost Calculator (2026)',
    description:
      'Interactive calculator. Pick your model (mobile, single-bay, multi-bay), state, and equipment tier — get a realistic cost range in 30 seconds.',
    readTime: 'Interactive tool',
    badge: 'TOOL',
  },
  {
    slug: 'mobile-tire-business',
    title: 'Mobile Tire Business: The Lower-Capital Path In',
    description:
      'Why mobile is the fastest-growing segment, what you actually need ($35K–$85K all-in), van + equipment setup, route planning, and pricing models.',
    readTime: '18 min read',
    badge: 'COMING SOON',
  },
  {
    slug: 'wholesale-tires-for-shops',
    title: 'Wholesale Tires for Tire Shops: How Pricing Actually Works',
    description:
      'Dealer net pricing, Net-30 vs prepay, MOQ, drop-ship vs warehouse, and how to evaluate suppliers. Includes the Vicrez wholesale tier breakdown.',
    readTime: '12 min read',
    badge: 'COMING SOON',
  },
  {
    slug: 'tire-shop-business-plan-template',
    title: 'Tire Shop Business Plan Template (Free Download)',
    description:
      'A real, lender-ready business plan template built around the SBA structure. Editable Google Doc + financial projection spreadsheet.',
    readTime: 'Download',
    badge: 'COMING SOON',
  },
];

const STATES_FEATURED = [
  { slug: 'texas', name: 'Texas' },
  { slug: 'california', name: 'California' },
  { slug: 'florida', name: 'Florida' },
  { slug: 'new-york', name: 'New York' },
  { slug: 'ohio', name: 'Ohio' },
];

const QUICK_FACTS = [
  { label: 'Avg. brick-and-mortar startup', value: '$95K–$420K' },
  { label: 'Mobile tire startup', value: '$35K–$85K' },
  { label: 'Gross margin on tires', value: '20–28%' },
  { label: 'Service margin (mount/balance)', value: '60–75%' },
  { label: 'Avg. break-even', value: '14–22 months' },
];

export default function StartHubPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs items={[{ name: 'Start a Tire Shop', href: '/start' }]} />

          {/* Hero */}
          <section className="mt-6 mb-12">
            <span className="inline-block bg-vicrez-red/15 text-vicrez-red text-xs font-bold tracking-wider uppercase px-3 py-1 rounded-full mb-4">
              New Resource Hub
            </span>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight">
              Start a Tire Shop — The Complete 2026 Resource
            </h1>
            <p className="text-vicrez-muted text-lg mt-4 max-w-3xl">
              Built by Vicrez — supplier to 16,500+ aftermarket installers across the U.S. Real
              numbers, real operator advice, no fluff. Whether you&apos;re opening a single-bay
              shop, scaling a mobile route, or buying an existing location, start here.
            </p>
          </section>

          {/* Quick Facts strip */}
          <section className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-12">
            {QUICK_FACTS.map((f) => (
              <div
                key={f.label}
                className="bg-vicrez-card border border-vicrez-border rounded-lg p-4 text-center"
              >
                <div className="text-vicrez-red font-bold text-lg">{f.value}</div>
                <div className="text-vicrez-muted text-xs mt-1">{f.label}</div>
              </div>
            ))}
          </section>

          {/* Pillar guides */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">Start Here</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {PILLAR_GUIDES.map((g) => {
                const isLive = g.badge === 'PILLAR' || g.badge === 'TOOL';
                const Card = (
                  <div
                    className={`h-full bg-vicrez-card border rounded-xl p-6 transition-colors ${
                      isLive
                        ? 'border-vicrez-border hover:border-vicrez-red/40'
                        : 'border-vicrez-border/60 opacity-70'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className={`text-[10px] font-bold tracking-wider uppercase px-2 py-1 rounded ${
                          g.badge === 'PILLAR'
                            ? 'bg-vicrez-red text-white'
                            : g.badge === 'TOOL'
                            ? 'bg-blue-600 text-white'
                            : 'bg-vicrez-border text-vicrez-muted'
                        }`}
                      >
                        {g.badge}
                      </span>
                      <span className="text-xs text-vicrez-muted">{g.readTime}</span>
                    </div>
                    <h3 className="font-bold text-white text-lg leading-snug">{g.title}</h3>
                    <p className="text-sm text-vicrez-muted mt-3 leading-relaxed">
                      {g.description}
                    </p>
                  </div>
                );

                return isLive ? (
                  <a key={g.slug} href={`/start/${g.slug}`} className="block">
                    {Card}
                  </a>
                ) : (
                  <div key={g.slug}>{Card}</div>
                );
              })}
            </div>
          </section>

          {/* State pages preview */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-3">By State</h2>
            <p className="text-vicrez-muted mb-6">
              Licensing rules, sales tax, EPA tire disposal requirements, and average market data
              vary by state. Featured guides below — all 50 states rolling out through 2026.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {STATES_FEATURED.map((s) => (
                <a
                  key={s.slug}
                  href={`/start/${s.slug}`}
                  className="bg-vicrez-card border border-vicrez-border rounded-lg p-4 text-center hover:border-vicrez-red/30 transition-colors"
                >
                  <div className="text-white font-semibold">{s.name}</div>
                  <div className="text-xs text-vicrez-muted mt-1">Coming soon</div>
                </a>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="bg-gradient-to-r from-vicrez-red to-red-700 rounded-xl p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-3">
              Already running a shop? Get wholesale tire pricing.
            </h2>
            <p className="text-white/90 mb-6 max-w-xl mx-auto">
              Vicrez supplies tires and aftermarket parts to thousands of installers nationwide.
              Net-30 terms available for qualified shops.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="https://b2b.vicrez.com"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white text-vicrez-red font-bold px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Apply for Wholesale
              </a>
              <a
                href="/start/startup-cost-calculator"
                className="border-2 border-white text-white font-bold px-6 py-3 rounded-lg hover:bg-white/10 transition-colors"
              >
                Run the Cost Calculator
              </a>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
