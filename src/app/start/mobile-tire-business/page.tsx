import { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Breadcrumbs from '@/components/Breadcrumbs';
import { generateArticleJsonLd } from '@/lib/seo';

const TITLE = 'Mobile Tire Business: The Lower-Capital Path In (2026 Guide)';
const DESCRIPTION =
  'Why mobile is the fastest-growing tire segment, what you actually need ($35K–$85K all-in), van + equipment setup, route planning, pricing models, and how to land your first commercial fleet account. Built by Vicrez.';
const URL = 'https://installers.vicrez.com/start/mobile-tire-business';
const DATE_PUB = '2026-06-22';
const DATE_MOD = '2026-06-22';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION, type: 'article', url: URL, publishedTime: DATE_PUB, modifiedTime: DATE_MOD },
  alternates: { canonical: URL },
};

const FAQ = [
  {
    q: 'How much does it cost to start a mobile tire business in 2026?',
    a: 'A bootstrapped mobile tire business costs $35,000 to $85,000 all-in. That includes a used service van ($22K–$35K), mobile mount/balance equipment ($5K–$14K), generator and air compressor ($1.8K–$3.5K), initial tire inventory ($4K–$8K), insurance, licensing, and 3–4 months of operating reserves. A new-equipment, fully outfitted setup can push past $120K.',
  },
  {
    q: 'Is a mobile tire business profitable?',
    a: 'Yes — mobile tire businesses are typically more profitable per-dollar-invested than brick-and-mortar shops because overhead is so much lower. Solo operators commonly net $55K–$90K in year one and $90K–$160K once they have a route stable enough to justify hiring a second tech. Margin on tires is 20–28%, but mobile service calls earn $40–$80 premiums over in-shop pricing.',
  },
  {
    q: 'What equipment do I need for a mobile tire business?',
    a: 'The core equipment kit: a cargo van (Ford Transit 250 or Ram ProMaster 2500 is standard), a mobile tire mounting machine, a wheel balancer (off-vehicle), a portable air compressor with onboard generator, a TPMS tool, a torque wrench rated to 200+ ft-lbs, a hydraulic floor jack rated for 3-ton-plus, jack stands, and a basic hand-tool set. All-in, that gear runs $30K–$55K used or $55K–$90K new.',
  },
  {
    q: 'Do I need a special license for a mobile tire business?',
    a: 'You need the same licensing stack as a brick-and-mortar shop: business license, EIN, state sales tax permit, and EPA waste tire registration in 38+ states. You also need commercial auto insurance on every vehicle, and in California you need a Bureau of Automotive Repair (BAR) registration. Most other states do not require a special "mobile tire" license.',
  },
  {
    q: 'How do mobile tire businesses get customers?',
    a: 'The three highest-ROI channels are Google Business Profile (free, drives 50%+ of first-year leads), commercial fleet outreach (one good fleet account is $40K–$80K/year), and partnering with auto repair shops that do not do tire work (they refer customers in exchange for a kickback or reciprocal referrals).',
  },
];

const articleJsonLd = generateArticleJsonLd({ title: TITLE, description: DESCRIPTION, url: URL, datePublished: DATE_PUB, dateModified: DATE_MOD });
const faqJsonLd = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) };

export default function MobileTireBusinessPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs items={[{ name: 'Start a Tire Shop', href: '/start' }, { name: 'Mobile Tire Business', href: '/start/mobile-tire-business' }]} />

          <article className="prose prose-invert max-w-none mt-4">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">{TITLE}</h1>
            <p className="text-vicrez-muted text-sm mb-8">Updated June 2026 &middot; 18 min read &middot; By the Vicrez team</p>

            <p className="text-gray-300 text-lg leading-relaxed">
              Mobile tire services are the fastest-growing segment of the U.S. tire industry. COVID
              normalized at-home service, fleet operators now expect it, and the lower capital
              required to launch — under $85K in most markets — makes it the most accessible path
              into the tire business in 2026. This guide covers everything you need to know:
              startup math, van and equipment setup, route planning, pricing models, how to land
              your first commercial fleet account, and the operational mistakes that sink first-year
              mobile operators.
            </p>

            <div className="my-8 bg-vicrez-card border border-vicrez-border rounded-xl p-6">
              <h2 className="text-white font-bold text-lg mt-0 mb-3">Key Takeaways</h2>
              <ul className="text-gray-300 leading-relaxed space-y-2 mb-0">
                <li><strong>Startup cost:</strong> $35K–$85K all-in for a bootstrapped solo operator.</li>
                <li><strong>Year-1 revenue target:</strong> $120K–$280K with one operator and a stabilized route.</li>
                <li><strong>Break-even:</strong> 8–14 months — faster than brick-and-mortar because overhead is so low.</li>
                <li><strong>Pricing premium:</strong> $40–$80 per service call over in-shop rates because the customer is paying for convenience.</li>
                <li><strong>Biggest growth lever:</strong> commercial fleet accounts. One 40-vehicle fleet = $40K–$80K/year of stable revenue.</li>
              </ul>
            </div>

            <h2 className="text-2xl font-bold text-white mt-10 mb-4">Why Mobile Is Winning Right Now</h2>
            <p className="text-gray-300 leading-relaxed">
              Three structural shifts created the modern mobile tire opportunity: pandemic-era
              normalization of at-home service, the rise of last-mile delivery fleets that
              can&apos;t afford to send vehicles off-route for a shop visit, and the broader labor
              shortage at traditional brick-and-mortar tire shops that&apos;s pushing wait times
              from hours to days in many metros. Mobile operators with good Google reviews and
              responsive scheduling can charge premium pricing and still close at 60%+ booking
              rates from inbound calls.
            </p>

            <h2 className="text-2xl font-bold text-white mt-10 mb-4">Startup Cost Breakdown</h2>
            <p className="text-gray-300 leading-relaxed">Here&apos;s a realistic 2026 budget for a bootstrapped solo mobile operator:</p>
            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm text-left border border-vicrez-border">
                <thead className="bg-vicrez-card text-white">
                  <tr>
                    <th className="p-3 border-b border-vicrez-border">Line Item</th>
                    <th className="p-3 border-b border-vicrez-border">Lean</th>
                    <th className="p-3 border-b border-vicrez-border">Comfortable</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  <tr className="border-b border-vicrez-border/50"><td className="p-3">Service van (Transit 250 / ProMaster 2500, 60K–100K mi)</td><td className="p-3">$22,000</td><td className="p-3">$35,000</td></tr>
                  <tr className="border-b border-vicrez-border/50"><td className="p-3">Mobile tire mount machine</td><td className="p-3">$5,000</td><td className="p-3">$14,000</td></tr>
                  <tr className="border-b border-vicrez-border/50"><td className="p-3">Wheel balancer (portable)</td><td className="p-3">$1,500</td><td className="p-3">$5,500</td></tr>
                  <tr className="border-b border-vicrez-border/50"><td className="p-3">Generator + air compressor</td><td className="p-3">$1,800</td><td className="p-3">$3,500</td></tr>
                  <tr className="border-b border-vicrez-border/50"><td className="p-3">TPMS tool + hand tools</td><td className="p-3">$1,500</td><td className="p-3">$3,500</td></tr>
                  <tr className="border-b border-vicrez-border/50"><td className="p-3">Initial tire inventory (20–40 units)</td><td className="p-3">$4,000</td><td className="p-3">$8,000</td></tr>
                  <tr className="border-b border-vicrez-border/50"><td className="p-3">LLC + licensing + EPA reg</td><td className="p-3">$600</td><td className="p-3">$1,800</td></tr>
                  <tr className="border-b border-vicrez-border/50"><td className="p-3">Insurance (year 1)</td><td className="p-3">$3,000</td><td className="p-3">$5,500</td></tr>
                  <tr className="border-b border-vicrez-border/50"><td className="p-3">Marketing + website + Google Ads (3 mo)</td><td className="p-3">$2,000</td><td className="p-3">$5,000</td></tr>
                  <tr className="border-b border-vicrez-border/50"><td className="p-3">POS / scheduling software (year 1)</td><td className="p-3">$600</td><td className="p-3">$1,800</td></tr>
                  <tr className="border-b border-vicrez-border/50"><td className="p-3">Working capital reserve (3–4 mo opex)</td><td className="p-3">$10,500</td><td className="p-3">$26,000</td></tr>
                  <tr className="text-white font-bold"><td className="p-3">Total all-in</td><td className="p-3">$52,500</td><td className="p-3">$109,600</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-gray-300 leading-relaxed">
              Want to run these numbers against your own state and equipment preferences? Use our{' '}
              <a href="/start/startup-cost-calculator" className="text-vicrez-red underline">free interactive cost calculator</a>.
            </p>

            <h2 className="text-2xl font-bold text-white mt-10 mb-4">Van Setup: What Actually Works</h2>
            <p className="text-gray-300 leading-relaxed">
              The two cargo van platforms that dominate mobile tire ops are the <strong>Ford Transit 250</strong>{' '}
              (high-roof, medium-length) and the <strong>Ram ProMaster 2500</strong>. Both give you
              standing room, a wide cargo door for tire loading, and enough length to mount the
              tire machine perpendicular to the wall. Sprinters are nicer but cost 35–50% more for
              marginal real-world advantages.
            </p>
            <p className="text-gray-300 leading-relaxed mt-4">
              Inside the van you need a mounted tire machine, secured tire racks (4–6 mounted
              tires plus 8–12 stacked), a workbench, an onboard generator, an air compressor
              tank, and a power inverter setup. Plan on $4,000–$8,000 for upfit racking, electrical,
              and cabinetry on top of the equipment cost.
            </p>

            <h2 className="text-2xl font-bold text-white mt-10 mb-4">Route Planning and Pricing</h2>
            <p className="text-gray-300 leading-relaxed">
              The economics of mobile tire work depend on how many stops you do per day and how
              tight your route is. The math:
            </p>
            <ul className="text-gray-300 leading-relaxed">
              <li>A single tire replacement takes 25–40 minutes on-site.</li>
              <li>A set of 4 takes 75–110 minutes on-site.</li>
              <li>Drive time between stops in a metro: 15–25 minutes average.</li>
              <li>Daily working window: 8–9 hours.</li>
              <li>Realistic max: 6–8 stops/day solo, ~$1,600–$2,400 in daily revenue.</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              Mobile pricing should run $40–$80 above in-shop rates for the equivalent service.
              A retail mount-and-balance set of 4 at a shop is $120–$200; mobile rates run
              $180–$280. Commercial fleet pricing is typically tighter ($25–$50 above shop rate)
              but volume makes up the margin.
            </p>

            <h2 className="text-2xl font-bold text-white mt-10 mb-4">Landing Your First Commercial Fleet Account</h2>
            <p className="text-gray-300 leading-relaxed">
              This is the single biggest lever in mobile tire economics. A 40-vehicle fleet doing
              monthly safety inspections, quarterly rotations, and seasonal tire changes generates
              $40,000–$80,000 of stable, predictable annual revenue and dramatically smooths the
              feast-or-famine retail booking pattern.
            </p>
            <p className="text-gray-300 leading-relaxed mt-4">
              The targets to pursue in your first 60 days:
            </p>
            <ul className="text-gray-300 leading-relaxed">
              <li><strong>Property management companies</strong> (multi-property rental portfolios with maintenance vans)</li>
              <li><strong>Landscaping companies</strong> (truck + trailer fleets, seasonal pattern)</li>
              <li><strong>Plumbing, HVAC, and electrical contractors</strong> (5–25 service vehicles each)</li>
              <li><strong>Last-mile delivery contractors</strong> (Amazon DSP, FedEx ISP, USPS HCR)</li>
              <li><strong>Local government / school district transportation</strong> (slower sales cycle but very sticky once won)</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              Cold-walk in person. Bring a one-page proposal with your service menu and example
              pricing. Follow up weekly. Mobile tire service is a "I&apos;ll look into it" sale
              that takes 3–6 touchpoints to close.
            </p>

            <h2 className="text-2xl font-bold text-white mt-10 mb-4">Wholesale Tire Sourcing for Mobile Operators</h2>
            <p className="text-gray-300 leading-relaxed">
              Mobile operators have a sourcing problem brick-and-mortar shops don&apos;t: you can&apos;t
              warehouse 800 SKUs. You need to either drop-ship from a regional warehouse or use a
              local will-call distributor for same-day pickup.
            </p>
            <p className="text-gray-300 leading-relaxed mt-4">
              Most successful mobile ops stock 20–40 high-velocity sizes on the van (the top 80%
              of demand) and order everything else for next-day or same-day pickup from a
              distributor. <strong>Vicrez</strong> works with mobile operators across the U.S. as
              both a stocking supplier (VCORSA performance tires, aftermarket sizes) and a drop-ship
              partner.{' '}
              <a href="https://b2b.vicrez.com" target="_blank" rel="noopener noreferrer" className="text-vicrez-red underline">
                Apply for wholesale here
              </a>
              .
            </p>

            <h2 className="text-2xl font-bold text-white mt-10 mb-4">Common Mistakes That Sink First-Year Mobile Ops</h2>
            <ul className="text-gray-300 leading-relaxed">
              <li><strong>Buying a new van.</strong> Depreciation will kill year-one cash flow. Buy a 2–3 year-old van with 60K–100K miles.</li>
              <li><strong>Skimping on the mounting machine.</strong> A $2K Chinese-import machine will fail in 12 months and damage wheels along the way. Spend $8K–$12K on a real Hunter, Coats, or Corghi mobile unit.</li>
              <li><strong>Not getting EPA registered.</strong> $500 fines in some states, business license suspension in others.</li>
              <li><strong>Pricing like a brick-and-mortar.</strong> You&apos;re selling convenience. Charge for it.</li>
              <li><strong>Ignoring commercial fleet sales for the first 90 days.</strong> Retail will keep you busy. Commercial will make you profitable.</li>
            </ul>

            <h2 className="text-2xl font-bold text-white mt-12 mb-6">Frequently Asked Questions</h2>
            <div className="space-y-6">
              {FAQ.map((f) => (
                <div key={f.q}>
                  <h3 className="text-white font-bold text-lg mb-2">{f.q}</h3>
                  <p className="text-gray-300 leading-relaxed mt-0">{f.a}</p>
                </div>
              ))}
            </div>

            <section className="mt-12 bg-gradient-to-r from-vicrez-red to-red-700 rounded-xl p-8 text-center">
              <h2 className="text-2xl font-bold text-white mb-3 mt-0">Run Your Mobile Startup Numbers</h2>
              <p className="text-white/90 mb-6 max-w-xl mx-auto">
                Free interactive calculator: pick mobile, your state, and your equipment tier — get a realistic 2026 cost range in 30 seconds.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a href="/start/startup-cost-calculator" className="bg-white text-vicrez-red font-bold px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors">Run the Calculator</a>
                <a href="https://b2b.vicrez.com" target="_blank" rel="noopener noreferrer" className="border-2 border-white text-white font-bold px-6 py-3 rounded-lg hover:bg-white/10 transition-colors">Apply for Wholesale</a>
              </div>
            </section>
          </article>
        </div>
      </main>
      <Footer />
    </>
  );
}
