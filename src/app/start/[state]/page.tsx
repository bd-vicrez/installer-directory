import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Breadcrumbs from '@/components/Breadcrumbs';
import { generateArticleJsonLd } from '@/lib/seo';
import { STATE_DATA, STATE_SLUGS } from './stateData';

interface PageProps {
  params: { state: string };
}

export function generateStaticParams() {
  return STATE_SLUGS.map((state) => ({ state }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const s = STATE_DATA[params.state];
  if (!s) return { title: 'State Guide Not Found' };
  const title = `How to Open a Tire Shop in ${s.name} (2026 Guide)`;
  const description = `Step-by-step ${s.name} tire shop startup guide: licensing, sales tax (${s.salesTaxRate}), EPA waste tire compliance, startup costs (${s.startupCostRange.singleBay} single-bay), and top metros. Built by Vicrez.`;
  const url = `https://installers.vicrez.com/start/${s.slug}`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      url,
      publishedTime: '2026-06-22',
      modifiedTime: '2026-06-22',
    },
    alternates: { canonical: url },
  };
}

export default function StateStartGuidePage({ params }: PageProps) {
  const s = STATE_DATA[params.state];
  if (!s) notFound();

  const title = `How to Open a Tire Shop in ${s.name} (2026 Guide)`;
  const description = `Step-by-step ${s.name} tire shop startup guide: licensing, sales tax, EPA waste tire compliance, startup costs, and top metros.`;
  const url = `https://installers.vicrez.com/start/${s.slug}`;

  const articleJsonLd = generateArticleJsonLd({
    title,
    description,
    url,
    datePublished: '2026-06-22',
    dateModified: '2026-06-22',
  });

  const faq = [
    {
      q: `How much does it cost to open a tire shop in ${s.name}?`,
      a: `Startup costs in ${s.name} range from ${s.startupCostRange.mobile} for a mobile operation, ${s.startupCostRange.singleBay} for a single-bay brick-and-mortar, and ${s.startupCostRange.multiBay} for a multi-bay shop. ${s.name} is rated ${s.costTier} cost-tier nationally (about ${(s.costMultiplier * 100).toFixed(0)}% of national average). Run real numbers with the interactive calculator linked below.`,
    },
    {
      q: `Do you need a license to open a tire shop in ${s.name}?`,
      a: `You need a registered ${s.name} LLC ($${s.llcFilingFee.replace(/\$/g, '').replace(/,/g, '')}), a federal EIN, a ${s.name} sales tax permit, ${s.epaWasteTireProgram ? `${s.epaProgramName ?? 'state EPA'} waste tire registration` : 'EPA waste tire compliance check'}, and a city or county business license. ${s.needsAutomotiveRepairLicense ? `You also need a ${s.automotiveRepairAgency} registration — this is mandatory before you take a paying customer.` : `${s.name} does not require a state-level automotive repair license, but verify city/county rules.`}`,
    },
    {
      q: `What is the sales tax rate in ${s.name}?`,
      a: `${s.name} sales tax is ${s.salesTaxRate}. You collect this on retail tire sales and most service work; verify exact local rates for your city/county before opening.`,
    },
    {
      q: `Where are the best metros to open a tire shop in ${s.name}?`,
      a: `The top markets by registered vehicle density and commercial fleet base are ${s.topMetros.join(', ')}. ${s.name} has approximately ${s.registeredVehicles} registered vehicles statewide.`,
    },
  ];

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <>
      <Header />
      <main className="flex-1">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs
            items={[
              { name: 'Start a Tire Shop', href: '/start' },
              { name: s.name, href: `/start/${s.slug}` },
            ]}
          />

          <article className="prose prose-invert max-w-none mt-4">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">{title}</h1>
            <p className="text-vicrez-muted text-sm mb-6">
              Updated June 2026 &middot; State licensing and compliance guide &middot; By the Vicrez team
            </p>

            <p className="text-gray-300 text-lg leading-relaxed">
              Opening a tire shop in {s.name} means navigating a specific licensing, tax, and
              environmental compliance stack — different from every other state. This guide
              covers the exact requirements for {s.name}, real 2026 cost ranges, the top metros
              to consider, and the state-specific watchouts most first-time owners miss.
            </p>

            {/* Quick facts */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-8 not-prose">
              <div className="bg-vicrez-card border border-vicrez-border rounded-lg p-4">
                <div className="text-vicrez-muted text-xs">Registered vehicles</div>
                <div className="text-white font-bold text-xl">{s.registeredVehicles}</div>
              </div>
              <div className="bg-vicrez-card border border-vicrez-border rounded-lg p-4">
                <div className="text-vicrez-muted text-xs">Cost tier</div>
                <div className="text-white font-bold text-xl capitalize">{s.costTier}</div>
              </div>
              <div className="bg-vicrez-card border border-vicrez-border rounded-lg p-4">
                <div className="text-vicrez-muted text-xs">LLC filing fee</div>
                <div className="text-white font-bold text-xl">{s.llcFilingFee.split('+')[0].trim()}</div>
              </div>
              <div className="bg-vicrez-card border border-vicrez-border rounded-lg p-4">
                <div className="text-vicrez-muted text-xs">Sales tax</div>
                <div className="text-white font-bold text-xl">{s.salesTaxRate.split('+')[0].trim()}</div>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-white mt-10 mb-4">{s.name} Market Overview</h2>
            <p className="text-gray-300 leading-relaxed">{s.marketNotes}</p>

            <h2 className="text-2xl font-bold text-white mt-10 mb-4">Why Open in {s.name}</h2>
            <ul className="text-gray-300 leading-relaxed">
              {s.whyHere.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>

            <h2 className="text-2xl font-bold text-white mt-10 mb-4">{s.name} Watch-Outs</h2>
            <ul className="text-gray-300 leading-relaxed">
              {s.watchouts.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>

            <h2 className="text-2xl font-bold text-white mt-10 mb-4">Top {s.name} Metros for a Tire Shop</h2>
            <p className="text-gray-300 leading-relaxed">
              Ranked by registered vehicle density and commercial fleet base, the most
              opportunity-rich {s.name} metros are:
            </p>
            <ol className="text-gray-300 leading-relaxed">
              {s.topMetros.map((m) => (
                <li key={m}>
                  <strong>{m}</strong>
                </li>
              ))}
            </ol>

            <h2 className="text-2xl font-bold text-white mt-10 mb-4">{s.name} Licensing Stack</h2>
            <p className="text-gray-300 leading-relaxed">
              Here are the exact registrations and permits you need before taking your first paying
              customer in {s.name}:
            </p>
            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm text-left border border-vicrez-border">
                <thead className="bg-vicrez-card text-white">
                  <tr>
                    <th className="p-3 border-b border-vicrez-border">Requirement</th>
                    <th className="p-3 border-b border-vicrez-border">Cost / Detail</th>
                    <th className="p-3 border-b border-vicrez-border">Issuing Agency</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  <tr className="border-b border-vicrez-border/50">
                    <td className="p-3">Form {s.name} LLC</td>
                    <td className="p-3">{s.llcFilingFee}, {s.llcFilingTimeDays}</td>
                    <td className="p-3">
                      <a href={s.sosUrl} target="_blank" rel="noopener noreferrer" className="text-vicrez-red underline">{s.name} SOS</a>
                    </td>
                  </tr>
                  <tr className="border-b border-vicrez-border/50">
                    <td className="p-3">Federal EIN</td>
                    <td className="p-3">Free, 10 minutes online</td>
                    <td className="p-3">IRS</td>
                  </tr>
                  <tr className="border-b border-vicrez-border/50">
                    <td className="p-3">{s.name} sales tax permit</td>
                    <td className="p-3">{s.salesTaxRate}</td>
                    <td className="p-3">
                      <a href={s.taxUrl} target="_blank" rel="noopener noreferrer" className="text-vicrez-red underline">{s.name} Tax Authority</a>
                    </td>
                  </tr>
                  {s.needsStateBusinessLicense && (
                    <tr className="border-b border-vicrez-border/50">
                      <td className="p-3">State business license</td>
                      <td className="p-3">Varies — verify with state</td>
                      <td className="p-3">{s.name} SOS</td>
                    </tr>
                  )}
                  {s.needsAutomotiveRepairLicense && (
                    <tr className="border-b border-vicrez-border/50">
                      <td className="p-3"><strong>{s.automotiveRepairAgency} registration</strong></td>
                      <td className="p-3">Required — see agency for current fees</td>
                      <td className="p-3">
                        {s.repairLicenseUrl ? (
                          <a href={s.repairLicenseUrl} target="_blank" rel="noopener noreferrer" className="text-vicrez-red underline">{s.automotiveRepairAgency}</a>
                        ) : (
                          s.automotiveRepairAgency
                        )}
                      </td>
                    </tr>
                  )}
                  {s.epaWasteTireProgram && (
                    <tr className="border-b border-vicrez-border/50">
                      <td className="p-3">{s.epaProgramName} registration</td>
                      <td className="p-3">{s.epaTireDisposalFee ?? 'Varies'}</td>
                      <td className="p-3">
                        {s.epaUrl ? (
                          <a href={s.epaUrl} target="_blank" rel="noopener noreferrer" className="text-vicrez-red underline">{s.name} EPA</a>
                        ) : (
                          `${s.name} EPA`
                        )}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td className="p-3">City / county business license</td>
                    <td className="p-3">Varies by locality ($50–$400 typical)</td>
                    <td className="p-3">Local clerk</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h2 className="text-2xl font-bold text-white mt-10 mb-4">{s.name} Startup Cost Ranges</h2>
            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm text-left border border-vicrez-border">
                <thead className="bg-vicrez-card text-white">
                  <tr>
                    <th className="p-3 border-b border-vicrez-border">Business Model</th>
                    <th className="p-3 border-b border-vicrez-border">Startup Cost</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  <tr className="border-b border-vicrez-border/50"><td className="p-3">Mobile tire business</td><td className="p-3">{s.startupCostRange.mobile}</td></tr>
                  <tr className="border-b border-vicrez-border/50"><td className="p-3">Single-bay brick-and-mortar</td><td className="p-3">{s.startupCostRange.singleBay}</td></tr>
                  <tr><td className="p-3">Multi-bay shop</td><td className="p-3">{s.startupCostRange.multiBay}</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-gray-300 leading-relaxed">
              Get a precise number using our{' '}
              <a href="/start/startup-cost-calculator" className="text-vicrez-red underline">interactive calculator</a>
              {' '}— pick {s.abbr} as your state and your specific equipment tier.
            </p>

            <h2 className="text-2xl font-bold text-white mt-10 mb-4">Wholesale Tire Sourcing in {s.name}</h2>
            <p className="text-gray-300 leading-relaxed">
              {s.name} is served by all major national tire distributors (ATD, K&amp;M Tire,
              USAutoForce). For performance and aftermarket sizes, <strong>Vicrez</strong> ships
              to shops across {s.name} with regional warehouse coverage and Net-30 terms for
              qualified accounts.{' '}
              <a href="https://b2b.vicrez.com" target="_blank" rel="noopener noreferrer" className="text-vicrez-red underline">
                Apply for wholesale here
              </a>
              .
            </p>

            <h2 className="text-2xl font-bold text-white mt-12 mb-6">{s.name} Tire Shop FAQ</h2>
            <div className="space-y-6">
              {faq.map((f) => (
                <div key={f.q}>
                  <h3 className="text-white font-bold text-lg mb-2">{f.q}</h3>
                  <p className="text-gray-300 leading-relaxed mt-0">{f.a}</p>
                </div>
              ))}
            </div>

            <section className="mt-12 bg-gradient-to-r from-vicrez-red to-red-700 rounded-xl p-8 text-center">
              <h2 className="text-2xl font-bold text-white mb-3 mt-0">Run Your {s.name} Numbers</h2>
              <p className="text-white/90 mb-6 max-w-xl mx-auto">
                Use our free interactive calculator — picks {s.abbr} as your state and gives you a realistic 2026 startup cost range in 30 seconds.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a href="/start/startup-cost-calculator" className="bg-white text-vicrez-red font-bold px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors">Run the Calculator</a>
                <a href="/start/how-to-open-a-tire-shop" className="border-2 border-white text-white font-bold px-6 py-3 rounded-lg hover:bg-white/10 transition-colors">Read the Full Startup Guide</a>
              </div>
            </section>
          </article>
        </div>
      </main>
      <Footer />
    </>
  );
}
