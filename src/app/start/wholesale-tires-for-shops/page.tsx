import { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Breadcrumbs from '@/components/Breadcrumbs';
import { generateArticleJsonLd } from '@/lib/seo';

const TITLE = 'Wholesale Tires for Tire Shops: How Pricing Actually Works (2026)';
const DESCRIPTION =
  'Dealer net pricing, Net-30 vs prepay, MOQ requirements, drop-ship vs warehouse models, and how to evaluate wholesale tire suppliers. Includes the Vicrez wholesale program breakdown for independent shops and mobile operators.';
const URL = 'https://installers.vicrez.com/start/wholesale-tires-for-shops';
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
    q: 'Where do tire shops buy wholesale tires?',
    a: 'Most independent tire shops use a combination of national distributors (American Tire Distributors, K&M Tire, USAutoForce, Tire Wholesalers Inc.), direct manufacturer dealer programs (Goodyear, Michelin, Bridgestone), and specialty wholesalers like Vicrez for performance and aftermarket sizes. National distributors typically handle 70–85% of tire volume; specialty wholesalers fill the high-margin performance and custom-fitment niches.',
  },
  {
    q: 'How much cheaper are wholesale tires?',
    a: 'Dealer-net pricing typically runs 35–55% below MSRP, with deeper discounts on volume tiers and house brands. A tire that retails for $200 commonly costs a wholesale account $90–$130 at dealer net. The spread is wider on commodity sizes (200/55R16-type fitments) and tighter on premium performance tires.',
  },
  {
    q: 'Do you need a business license to buy wholesale tires?',
    a: 'Yes. Every reputable wholesale supplier requires proof of a registered business (LLC or corporation), a state sales tax permit / resale certificate, an EIN, and either a business bank account or trade references. Some also require proof of insurance, a brick-and-mortar address (mobile-only ops sometimes get approved with documentation), and a credit application.',
  },
  {
    q: 'What is Net-30 and how do you get approved?',
    a: 'Net-30 means the supplier ships your order and you pay the full invoice within 30 days. It is effectively a 30-day interest-free line of credit. To qualify, suppliers typically want 6+ months of business history, a personal guarantor with good credit (700+ FICO is common), trade references from other suppliers, and either a business credit history or a Dun & Bradstreet number. New shops usually start on prepay or COD for 60–90 days, then transition to Net-30 after demonstrating payment reliability.',
  },
  {
    q: 'What is MOQ in tire wholesale?',
    a: 'MOQ is Minimum Order Quantity. National distributors typically have no MOQ on stocked items (you can order a single tire), but charge LTL freight fees on small orders. Direct-from-manufacturer dealer programs commonly have MOQs of 50–200 tires per order for free freight, or 500–1,500 tires per year for the deepest tier pricing. Specialty wholesalers vary widely — Vicrez has no MOQ on drop-ship orders for approved accounts.',
  },
  {
    q: 'Should I use drop-ship or warehouse my own inventory?',
    a: 'Both. Stock the top 20–40 fitments that cover 75–80% of your demand (the long tail of tire sizes is brutal to warehouse). Drop-ship or same-day will-call everything else from a regional distributor. This minimizes capital tied up in slow-moving inventory while keeping your fill rate above 90%.',
  },
];

const articleJsonLd = generateArticleJsonLd({ title: TITLE, description: DESCRIPTION, url: URL, datePublished: DATE_PUB, dateModified: DATE_MOD });
const faqJsonLd = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) };

export default function WholesaleTiresForShopsPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs items={[{ name: 'Start a Tire Shop', href: '/start' }, { name: 'Wholesale Tires for Shops', href: '/start/wholesale-tires-for-shops' }]} />

          <article className="prose prose-invert max-w-none mt-4">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">{TITLE}</h1>
            <p className="text-vicrez-muted text-sm mb-8">Updated June 2026 &middot; 14 min read &middot; By the Vicrez team</p>

            <p className="text-gray-300 text-lg leading-relaxed">
              Wholesale tire sourcing is where new shop owners lose the most money — not because
              prices are bad, but because they don&apos;t understand how the channel structure
              actually works. This guide breaks down dealer net pricing, payment terms, MOQ rules,
              drop-ship vs warehouse models, and how to build a sourcing stack that protects your
              margins. Written from the perspective of <strong>Vicrez</strong>, where we&apos;ve
              supplied tires and aftermarket parts to more than 16,500 installers across the U.S.
            </p>

            <div className="my-8 bg-vicrez-card border border-vicrez-border rounded-xl p-6">
              <h2 className="text-white font-bold text-lg mt-0 mb-3">Key Takeaways</h2>
              <ul className="text-gray-300 leading-relaxed space-y-2 mb-0">
                <li><strong>Dealer-net pricing:</strong> typically 35–55% below MSRP.</li>
                <li><strong>Use multiple suppliers:</strong> one national distributor + 1–2 specialty wholesalers covers 95% of demand.</li>
                <li><strong>Net-30 terms:</strong> usually require 6+ months of business history and a personal guarantor with 700+ FICO.</li>
                <li><strong>Drop-ship + stock combo:</strong> warehouse top 20–40 SKUs, drop-ship the rest.</li>
                <li><strong>Specialty wholesalers</strong> (like Vicrez for performance) are where the highest-margin business lives.</li>
              </ul>
            </div>

            <h2 className="text-2xl font-bold text-white mt-10 mb-4">The Three Tiers of Wholesale Tire Suppliers</h2>
            <p className="text-gray-300 leading-relaxed">
              The U.S. wholesale tire channel has three distinct tiers, and you should be working
              with at least one supplier in each:
            </p>

            <h3 className="text-xl font-bold text-white mt-6 mb-3">Tier 1 — National Distributors</h3>
            <p className="text-gray-300 leading-relaxed">
              American Tire Distributors (ATD), K&amp;M Tire, USAutoForce, NTW (National Tire
              Wholesale), and Max Finkelstein are the big national players. They stock every
              major brand in every common size, deliver daily or every-other-day in major metros,
              and offer Net-30 terms to qualified accounts. Pricing is competitive but rarely the
              best — they are paying for the logistics infrastructure that makes them convenient.
              You will use them for 70–85% of your tire volume.
            </p>

            <h3 className="text-xl font-bold text-white mt-6 mb-3">Tier 2 — Manufacturer Direct Programs</h3>
            <p className="text-gray-300 leading-relaxed">
              Goodyear, Michelin, Bridgestone, Continental, and Pirelli all have direct-dealer
              programs with deeper pricing than you can get through national distributors, but
              they come with strings: minimum annual purchase commitments (typically $50K–$250K),
              co-op marketing requirements, and brand merchandising standards. Worth pursuing once
              you&apos;re moving 200+ tires per month of a given brand.
            </p>

            <h3 className="text-xl font-bold text-white mt-6 mb-3">Tier 3 — Specialty Wholesalers</h3>
            <p className="text-gray-300 leading-relaxed">
              This is where high-margin business hides. Specialty wholesalers — including Vicrez,
              Discount Tire Direct, Tire Rack Wholesale, and several others — focus on segments
              the nationals don&apos;t prioritize: performance tires, wide-fitment aftermarket sizes,
              vintage and classic, motorsport, off-road, and custom-spec orders. Margins are 8–15
              points higher than commodity sizes, customer loyalty is sticky, and competition is
              limited. If your shop targets performance, aftermarket, or any niche segment, you
              need a specialty wholesaler relationship.
            </p>

            <h2 className="text-2xl font-bold text-white mt-10 mb-4">How Dealer Net Pricing Actually Works</h2>
            <p className="text-gray-300 leading-relaxed">
              Dealer net is the price you pay before any volume rebates, co-op credits, or
              promotional discounts. It typically runs 35–55% below the manufacturer&apos;s
              suggested retail price (MSRP). The spread depends on:
            </p>
            <ul className="text-gray-300 leading-relaxed">
              <li><strong>Brand tier:</strong> commodity brands (Westlake, Sumitomo, Cooper second-line) have wider dealer spreads; premium brands (Michelin Pilot Sport, Bridgestone Potenza) have tighter spreads.</li>
              <li><strong>Volume tier:</strong> most national distributors have 3–5 volume tiers. The jump from Tier 1 (under $50K/year) to Tier 3 ($250K+/year) is commonly 6–10 percentage points.</li>
              <li><strong>Region:</strong> shipping economics vary. Texas, Florida, and California typically get the best pricing because of warehouse density.</li>
              <li><strong>Payment terms:</strong> COD/prepay accounts often get 1–3% discounts vs Net-30 accounts.</li>
            </ul>

            <h2 className="text-2xl font-bold text-white mt-10 mb-4">Net-30, Net-60, and How to Get Approved</h2>
            <p className="text-gray-300 leading-relaxed">
              Trade credit (Net-30 terms) is functionally a 30-day interest-free loan from your
              supplier. For a shop turning $30K/month in tires at 25% gross margin, Net-30 is
              worth $22,500 of working capital that&apos;s effectively free. Get approved as fast
              as possible.
            </p>
            <p className="text-gray-300 leading-relaxed mt-4">
              What suppliers want to see for Net-30 approval:
            </p>
            <ul className="text-gray-300 leading-relaxed">
              <li>6+ months of business operating history (some require 12)</li>
              <li>3–5 trade references from other active suppliers</li>
              <li>Personal guarantee from owner (with 700+ FICO usually required)</li>
              <li>Business bank account with 90+ days of transactions</li>
              <li>Proof of insurance (general liability + garage keepers)</li>
              <li>Resale certificate / state sales tax permit</li>
              <li>Sometimes: D&amp;B (Dun &amp; Bradstreet) DUNS number and Paydex score</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              <strong>Strategy:</strong> open prepay accounts with 3–4 suppliers in your first
              90 days. Pay every invoice the day it lands. After 90 days, request Net-30
              conversions citing your payment history. Most suppliers will convert at least one
              account by day 120.
            </p>

            <h2 className="text-2xl font-bold text-white mt-10 mb-4">Drop-Ship vs Stock: The Right Mix</h2>
            <p className="text-gray-300 leading-relaxed">
              Carrying inventory has a real cost: capital tied up in tires that don&apos;t move,
              warehouse space, insurance, and shrinkage. Drop-shipping eliminates that cost but
              forces you to wait 1–3 days for delivery and pay full LTL freight per shipment.
              The right answer is a blend:
            </p>
            <ul className="text-gray-300 leading-relaxed">
              <li><strong>Stock the top 20–40 fitments</strong> in your local market (70–80% of demand). Pull these from a national distributor on regular weekly orders or buy direct from a manufacturer dealer program for the best pricing.</li>
              <li><strong>Drop-ship everything else.</strong> For performance and aftermarket sizes specifically, work with a specialty wholesaler like Vicrez that can drop-ship from regional warehouses with 1–2 day delivery.</li>
              <li><strong>Use will-call for emergency same-day.</strong> Pay the premium when a customer needs it now.</li>
            </ul>

            <h2 className="text-2xl font-bold text-white mt-10 mb-4">The Vicrez Wholesale Program</h2>
            <p className="text-gray-300 leading-relaxed">
              Vicrez supplies tires, body kits, wheels, and aftermarket parts to more than 16,500
              installers nationwide. Our wholesale program is built specifically for independent
              shops, mobile operators, and performance-focused installers.
            </p>
            <p className="text-gray-300 leading-relaxed mt-4">
              What our wholesale accounts get:
            </p>
            <ul className="text-gray-300 leading-relaxed">
              <li>Dealer-net pricing on VCORSA performance tires, body kits, wheels, and aftermarket accessories</li>
              <li>Drop-ship from regional warehouses (1–2 day delivery in most metros)</li>
              <li>Net-30 terms for qualified accounts</li>
              <li>Dedicated account rep for orders, returns, and warranty</li>
              <li>Listing in installers.vicrez.com directory (consumer traffic referral)</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              <a href="https://b2b.vicrez.com" target="_blank" rel="noopener noreferrer" className="text-vicrez-red underline font-semibold">
                Apply for the Vicrez wholesale program here.
              </a>{' '}
              Approval typically takes 2–5 business days once you submit the application.
            </p>

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
              <h2 className="text-2xl font-bold text-white mb-3 mt-0">Ready to Source Smarter?</h2>
              <p className="text-white/90 mb-6 max-w-xl mx-auto">
                Apply for Vicrez wholesale and get dealer-net pricing on performance tires, body kits, and aftermarket parts. Net-30 available for qualified shops.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a href="https://b2b.vicrez.com" target="_blank" rel="noopener noreferrer" className="bg-white text-vicrez-red font-bold px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors">Apply for Wholesale</a>
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
