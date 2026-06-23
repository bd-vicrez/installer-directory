import { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Breadcrumbs from '@/components/Breadcrumbs';
import { generateArticleJsonLd } from '@/lib/seo';

const TITLE = 'How to Open a Tire Shop — The Complete 2026 Guide';
const DESCRIPTION =
  'A 14-step roadmap to opening a profitable tire shop in 2026. Real startup costs ($95K–$420K), licensing by state, equipment checklists, wholesale tire sourcing, staffing, and break-even math. Written for first-time owners.';
const URL = 'https://installers.vicrez.com/start/how-to-open-a-tire-shop';
const DATE_PUB = '2026-06-22';
const DATE_MOD = '2026-06-22';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'article',
    url: URL,
    publishedTime: DATE_PUB,
    modifiedTime: DATE_MOD,
  },
  alternates: { canonical: URL },
};

const FAQ = [
  {
    q: 'How much does it cost to open a tire shop in 2026?',
    a: 'A single-bay brick-and-mortar tire shop typically costs $95,000 to $220,000 to launch. A multi-bay shop runs $200,000 to $420,000. A mobile tire business is the lowest-capital path at $35,000 to $85,000 all-in. Costs vary heavily by state, lease rate, and whether you buy new or used equipment.',
  },
  {
    q: 'Do you need a license to open a tire shop?',
    a: 'Yes. At minimum you need a business license, EIN, state sales tax permit, and an EPA tire disposal compliance registration (required in most states). Some states (CA, NY, FL, TX) require additional environmental permits because used tires are classified as solid waste. You do not need a special "tire shop license" in most states, but you do need a Bureau of Automotive Repair (BAR) registration in California.',
  },
  {
    q: 'How much does a tire shop owner make a year?',
    a: 'Owner take-home varies widely. A solo mobile operator typically nets $55K–$90K in year one. A single-bay shop owner-operator nets $70K–$140K once established (year 2+). A multi-bay shop with 3-4 employees can produce $150K–$300K in owner profit at scale. Service revenue (mount/balance/alignment) carries 60–75% margins versus 20–28% on tire sales — service work is where the money is.',
  },
  {
    q: 'How long does it take to break even?',
    a: 'Most new tire shops break even between 14 and 22 months. Mobile operations often break even faster (8–14 months) because of lower overhead. Brick-and-mortar shops with a strong location and steady commercial accounts can break even in 12 months; under-trafficked locations may take 24+ months.',
  },
  {
    q: 'Should I open a mobile tire shop or a brick-and-mortar?',
    a: 'Mobile is the right answer if you have under $85K to start, want to test the market with low risk, or live in a metro with heavy fleet/commercial demand. Brick-and-mortar is the right answer if you have $200K+ in capital, a proven location, and want to build a multi-bay service business that scales with employees.',
  },
  {
    q: 'Where do tire shops buy their tires wholesale?',
    a: 'Most independent tire shops buy through national distributors (ATD/American Tire Distributors, K&M Tire, USAutoForce), direct manufacturer programs (Goodyear/Michelin dealer programs), or specialty wholesalers like Vicrez for performance and aftermarket sizes. Pricing typically runs 35–55% below MSRP at dealer-net, with Net-30 terms for established shops.',
  },
];

const articleJsonLd = generateArticleJsonLd({
  title: TITLE,
  description: DESCRIPTION,
  url: URL,
  datePublished: DATE_PUB,
  dateModified: DATE_MOD,
});

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
};

export default function HowToOpenATireShopPage() {
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
          <Breadcrumbs
            items={[
              { name: 'Start a Tire Shop', href: '/start' },
              { name: 'How to Open a Tire Shop', href: '/start/how-to-open-a-tire-shop' },
            ]}
          />

          <article className="prose prose-invert max-w-none mt-4">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">{TITLE}</h1>
            <p className="text-vicrez-muted text-sm mb-8">
              Updated June 2026 &middot; 22 min read &middot; By the Vicrez team
            </p>

            <p className="text-gray-300 text-lg leading-relaxed">
              Opening a tire shop in 2026 is one of the most resilient small-business plays in the
              automotive industry. People drive on tires whether the economy is booming or in
              recession, and the average American replaces a set every 3 to 5 years. The U.S. tire
              service market generates roughly $40 billion a year, and independent shops still
              capture more than 60% of it. This guide walks you through every step — from picking a
              business structure to your first paid customer — using real 2026 numbers from
              operators we work with at <strong>Vicrez</strong>, where we supply tires and
              aftermarket parts to more than 16,500 installers nationwide.
            </p>

            <p className="text-gray-300 leading-relaxed mt-4">
              We&apos;ll cover startup costs, licensing requirements, location choices, equipment,
              hiring, wholesale tire sourcing, marketing, and the financial math that separates
              profitable shops from the ones that close inside two years. There&apos;s also a free{' '}
              <a href="/start/startup-cost-calculator" className="text-vicrez-red underline">
                interactive cost calculator
              </a>{' '}
              that takes 30 seconds and gives you a realistic dollar figure for your specific plan.
            </p>

            {/* Key takeaways box */}
            <div className="my-8 bg-vicrez-card border border-vicrez-border rounded-xl p-6">
              <h2 className="text-white font-bold text-lg mt-0 mb-3">Key Takeaways</h2>
              <ul className="text-gray-300 leading-relaxed space-y-2 mb-0">
                <li>
                  <strong>Startup cost:</strong> $35K–$85K mobile, $95K–$220K single-bay, $200K–$420K multi-bay.
                </li>
                <li>
                  <strong>Margin reality:</strong> Tires earn 20–28% gross; service work earns 60–75%. Plan around service revenue.
                </li>
                <li>
                  <strong>Break-even:</strong> 14–22 months typical. Mobile breaks even fastest.
                </li>
                <li>
                  <strong>Biggest mistake:</strong> Underestimating working capital. Reserve 4 months of operating expenses on top of your equipment budget.
                </li>
                <li>
                  <strong>Biggest opportunity:</strong> Fleet and commercial accounts. One regional fleet contract can stabilize an entire shop.
                </li>
              </ul>
            </div>

            {/* Table of contents */}
            <h2 className="text-2xl font-bold text-white mt-10 mb-4">What This Guide Covers</h2>
            <ol className="text-gray-300 leading-relaxed">
              <li><a href="#step-1" className="text-vicrez-red">Validate the local market</a></li>
              <li><a href="#step-2" className="text-vicrez-red">Choose your business model (mobile, single-bay, multi-bay, used)</a></li>
              <li><a href="#step-3" className="text-vicrez-red">Pick a legal structure and register the business</a></li>
              <li><a href="#step-4" className="text-vicrez-red">Get licensed (state by state)</a></li>
              <li><a href="#step-5" className="text-vicrez-red">Write a real business plan</a></li>
              <li><a href="#step-6" className="text-vicrez-red">Secure financing</a></li>
              <li><a href="#step-7" className="text-vicrez-red">Pick a location (or van)</a></li>
              <li><a href="#step-8" className="text-vicrez-red">Buy equipment</a></li>
              <li><a href="#step-9" className="text-vicrez-red">Set up wholesale tire sourcing</a></li>
              <li><a href="#step-10" className="text-vicrez-red">Get insurance</a></li>
              <li><a href="#step-11" className="text-vicrez-red">Hire staff</a></li>
              <li><a href="#step-12" className="text-vicrez-red">Set up POS, inventory, and bookkeeping</a></li>
              <li><a href="#step-13" className="text-vicrez-red">Marketing and your first 90 days</a></li>
              <li><a href="#step-14" className="text-vicrez-red">Track the right metrics</a></li>
            </ol>

            {/* Step 1 */}
            <h2 id="step-1" className="text-2xl font-bold text-white mt-12 mb-4">
              Step 1 — Validate the Local Market
            </h2>
            <p className="text-gray-300 leading-relaxed">
              Before you spend a dollar, prove there&apos;s demand. The good news: tire demand is
              one of the easiest categories to validate. Pull up Google Maps for your target zip
              code and count existing tire shops within a 5-mile radius. Then look up the
              registered vehicle count in your county (most state DMVs publish this annually). A
              healthy ratio is roughly <strong>one tire shop per 4,000 registered vehicles</strong>.
              If your area has more shops than that, you need a differentiator — mobile service,
              performance tires, commercial fleet focus, or extended hours.
            </p>
            <p className="text-gray-300 leading-relaxed mt-4">
              Drive past the top three competitors at 10am on a Tuesday and again at 2pm on a
              Saturday. Are their bays full? Is there a waitlist? That&apos;s your real demand
              signal. If they&apos;re consistently busy, the market is under-served and you have
              room. If they&apos;re empty, dig deeper — maybe they&apos;re bad, or maybe the
              market is saturated. Either way, that visit tells you more than any market research
              report.
            </p>

            {/* Step 2 */}
            <h2 id="step-2" className="text-2xl font-bold text-white mt-12 mb-4">
              Step 2 — Choose Your Business Model
            </h2>
            <p className="text-gray-300 leading-relaxed">
              There are four common tire shop models in 2026, each with different capital
              requirements and growth ceilings:
            </p>

            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm text-left border border-vicrez-border">
                <thead className="bg-vicrez-card text-white">
                  <tr>
                    <th className="p-3 border-b border-vicrez-border">Model</th>
                    <th className="p-3 border-b border-vicrez-border">Startup Cost</th>
                    <th className="p-3 border-b border-vicrez-border">Year-1 Revenue</th>
                    <th className="p-3 border-b border-vicrez-border">Best For</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  <tr className="border-b border-vicrez-border/50">
                    <td className="p-3"><strong>Mobile tire</strong></td>
                    <td className="p-3">$35K–$85K</td>
                    <td className="p-3">$120K–$280K</td>
                    <td className="p-3">Solo operator, low capital, metro area</td>
                  </tr>
                  <tr className="border-b border-vicrez-border/50">
                    <td className="p-3"><strong>Single-bay shop</strong></td>
                    <td className="p-3">$95K–$220K</td>
                    <td className="p-3">$320K–$600K</td>
                    <td className="p-3">Owner-operator with 1 tech, neighborhood location</td>
                  </tr>
                  <tr className="border-b border-vicrez-border/50">
                    <td className="p-3"><strong>Multi-bay shop</strong></td>
                    <td className="p-3">$200K–$420K</td>
                    <td className="p-3">$650K–$1.4M</td>
                    <td className="p-3">3–5 employees, scalable revenue, commercial accounts</td>
                  </tr>
                  <tr>
                    <td className="p-3"><strong>Used tire shop</strong></td>
                    <td className="p-3">$25K–$60K</td>
                    <td className="p-3">$90K–$180K</td>
                    <td className="p-3">Lower-income markets, lower margins, high volume</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-gray-300 leading-relaxed">
              Mobile is the fastest-growing segment right now. COVID changed customer expectations
              about service coming to them, and mobile tire businesses with strong Google reviews
              are commanding $40–$80 premiums per service call. If you&apos;re starting with
              under $100K, mobile is almost always the right answer.
            </p>

            {/* Step 3 */}
            <h2 id="step-3" className="text-2xl font-bold text-white mt-12 mb-4">
              Step 3 — Pick a Legal Structure and Register the Business
            </h2>
            <p className="text-gray-300 leading-relaxed">
              For 95% of new tire shops, an <strong>LLC</strong> is the right legal structure. It
              gives you personal liability protection (critical in an industry where wheels can
              come off vehicles), pass-through taxation, and minimal compliance overhead.
              S-Corps make sense once you&apos;re profitable enough to justify reasonable-salary
              tax structuring (typically $80K+ in net income).
            </p>
            <p className="text-gray-300 leading-relaxed mt-4">
              You&apos;ll need to:
            </p>
            <ul className="text-gray-300 leading-relaxed">
              <li>Register the LLC with your secretary of state ($50–$500 depending on state)</li>
              <li>Get a federal EIN from the IRS (free, 10 minutes online)</li>
              <li>Open a business bank account (do this before you take any revenue — comingling kills LLC liability protection)</li>
              <li>Register for a state sales tax permit</li>
              <li>Get a state-issued business license if your state requires one (TX, FL, and some others don&apos;t at the state level)</li>
              <li>Get a city/county business license</li>
            </ul>

            {/* Step 4 */}
            <h2 id="step-4" className="text-2xl font-bold text-white mt-12 mb-4">
              Step 4 — Get Licensed (State by State)
            </h2>
            <p className="text-gray-300 leading-relaxed">
              Licensing is where most first-time owners get tripped up because requirements vary
              dramatically by state. Here are the four buckets you need to think about:
            </p>
            <ol className="text-gray-300 leading-relaxed">
              <li>
                <strong>Business license</strong> — required everywhere, but issued at city/county level in some states.
              </li>
              <li>
                <strong>Sales tax permit</strong> — required in every state with sales tax. Free or low-cost in most states.
              </li>
              <li>
                <strong>EPA waste tire registration</strong> — required in 38+ states. You&apos;ll
                also need to contract with a registered waste tire hauler. Fees range from $0
                (Texas) to $500+/year (California).
              </li>
              <li>
                <strong>Automotive repair registration</strong> — required in California (BAR
                registration), Arizona, Michigan, and a few others. Adds $200–$400/year and
                triggers consumer-protection rules.
              </li>
            </ol>
            <p className="text-gray-300 leading-relaxed mt-4">
              We&apos;re building state-specific guides for all 50 states — Texas, California,
              Florida, New York, and Ohio are publishing first. Bookmark{' '}
              <a href="/start" className="text-vicrez-red underline">the start hub</a> to catch
              your state.
            </p>

            {/* Step 5 */}
            <h2 id="step-5" className="text-2xl font-bold text-white mt-12 mb-4">
              Step 5 — Write a Real Business Plan
            </h2>
            <p className="text-gray-300 leading-relaxed">
              Even if you&apos;re self-funding, write a plan. The exercise forces you to confront
              numbers you&apos;d rather not think about. If you&apos;re seeking financing — SBA
              loan, equipment loan, or investor — you need a lender-ready plan. The SBA-standard
              structure has 9 sections: executive summary, business description, market analysis,
              organization and management, products and services, marketing and sales, funding
              request, financial projections, and appendix.
            </p>
            <p className="text-gray-300 leading-relaxed mt-4">
              We&apos;re releasing a free, lender-ready business plan template built for tire shops
              specifically (with realistic financial projections you can edit). It&apos;ll be at{' '}
              <code className="text-vicrez-red">/start/tire-shop-business-plan-template</code>.
            </p>

            {/* Step 6 */}
            <h2 id="step-6" className="text-2xl font-bold text-white mt-12 mb-4">
              Step 6 — Secure Financing
            </h2>
            <p className="text-gray-300 leading-relaxed">
              The four most common financing paths for new tire shops:
            </p>
            <ul className="text-gray-300 leading-relaxed">
              <li>
                <strong>SBA 7(a) loan</strong> — up to $5M, 10-year terms, prime + 2.75%. Hardest
                to qualify for (need 2 years industry experience or strong management team) but
                the cheapest capital.
              </li>
              <li>
                <strong>SBA Microloan</strong> — up to $50K, easier to qualify for, great for
                mobile startups.
              </li>
              <li>
                <strong>Equipment financing</strong> — Crest Capital, Balboa, Direct Capital. 5–7
                year terms, equipment is collateral. Easy to qualify, expensive (8–15% APR).
              </li>
              <li>
                <strong>Self-funding + supplier credit</strong> — start cash, then use Net-30
                terms from wholesale tire suppliers as working capital. This is how a large share
                of independents actually launch.
              </li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              <strong>The 4-month rule:</strong> whatever your equipment + buildout budget is,
              add 4 months of operating expenses on top. Most new shops fail not because the
              business is bad but because they ran out of cash before customer flow stabilized.
            </p>

            {/* Step 7 */}
            <h2 id="step-7" className="text-2xl font-bold text-white mt-12 mb-4">
              Step 7 — Pick a Location (or a Van)
            </h2>
            <p className="text-gray-300 leading-relaxed">
              For brick-and-mortar: prioritize traffic count over rent. A spot doing 18,000+ cars
              per day at $4,500/month rent will outperform a $2,000/month spot doing 4,000 cars
              per day every time. Look for corner lots, right-turn-in access, and visibility from
              both directions of travel. Avoid spots tucked into shopping center back lots.
            </p>
            <p className="text-gray-300 leading-relaxed mt-4">
              For mobile: a Ford Transit 250 or Ram ProMaster 2500 is the standard rig. Used
              models with 60K–100K miles run $22K–$35K and have plenty of life. Don&apos;t buy
              new unless you&apos;re scaling to multiple trucks — depreciation will kill you in
              year one.
            </p>

            {/* Step 8 */}
            <h2 id="step-8" className="text-2xl font-bold text-white mt-12 mb-4">
              Step 8 — Buy Equipment
            </h2>
            <p className="text-gray-300 leading-relaxed">
              The core equipment list for a single-bay brick-and-mortar:
            </p>
            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm text-left border border-vicrez-border">
                <thead className="bg-vicrez-card text-white">
                  <tr>
                    <th className="p-3 border-b border-vicrez-border">Equipment</th>
                    <th className="p-3 border-b border-vicrez-border">New</th>
                    <th className="p-3 border-b border-vicrez-border">Used</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  <tr className="border-b border-vicrez-border/50"><td className="p-3">Tire mounting machine (touchless)</td><td className="p-3">$6K–$14K</td><td className="p-3">$2K–$5K</td></tr>
                  <tr className="border-b border-vicrez-border/50"><td className="p-3">Wheel balancer (computerized)</td><td className="p-3">$3K–$8K</td><td className="p-3">$1.2K–$3K</td></tr>
                  <tr className="border-b border-vicrez-border/50"><td className="p-3">Two-post lift (10K lb capacity)</td><td className="p-3">$3.5K–$6K</td><td className="p-3">$1.5K–$3K</td></tr>
                  <tr className="border-b border-vicrez-border/50"><td className="p-3">Air compressor (5HP+, 80gal)</td><td className="p-3">$1.5K–$3K</td><td className="p-3">$600–$1.2K</td></tr>
                  <tr className="border-b border-vicrez-border/50"><td className="p-3">TPMS tool</td><td className="p-3">$800–$1.5K</td><td className="p-3">$400–$700</td></tr>
                  <tr className="border-b border-vicrez-border/50"><td className="p-3">Hand tools + impact wrenches</td><td className="p-3">$2K–$4K</td><td className="p-3">$800–$1.5K</td></tr>
                  <tr><td className="p-3"><strong>Total core kit</strong></td><td className="p-3"><strong>$17K–$36K</strong></td><td className="p-3"><strong>$6.5K–$14K</strong></td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-gray-300 leading-relaxed">
              <strong>Buy used for your first shop.</strong> Hunter, Coats, and Corghi equipment
              from the early 2010s is still excellent and will last 10+ years. You can always
              upgrade as you grow. Check auction sites, equipment dealers, and shop closures.
            </p>

            {/* Step 9 — wholesale (Vicrez funnel) */}
            <h2 id="step-9" className="text-2xl font-bold text-white mt-12 mb-4">
              Step 9 — Set Up Wholesale Tire Sourcing
            </h2>
            <p className="text-gray-300 leading-relaxed">
              You need multiple suppliers — typically one national distributor for the long tail
              of OE-replacement sizes, and one or two specialty suppliers for performance,
              aftermarket, or commercial sizes.
            </p>
            <p className="text-gray-300 leading-relaxed mt-4">
              <strong>National distributors</strong> like American Tire Distributors (ATD), K&amp;M
              Tire, and USAutoForce stock all major brands and deliver daily. Dealer-net pricing
              runs 35–55% below MSRP. Net-30 terms are standard once you&apos;re approved.
            </p>
            <p className="text-gray-300 leading-relaxed mt-4">
              <strong>Specialty wholesalers</strong> are where you go for performance,
              wide-fitment aftermarket, and custom sizes that national distributors don&apos;t
              stock. <strong>Vicrez</strong> is one of those — we supply more than 16,500
              installers across the U.S. with VCORSA performance tires, plus aftermarket body
              kits, wheels, and accessories. Our wholesale tier offers Net-30 for qualified
              shops, drop-ship from regional warehouses, and a dedicated rep for orders. If your
              business mix leans performance/aftermarket,{' '}
              <a
                href="https://b2b.vicrez.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-vicrez-red underline"
              >
                apply for the Vicrez wholesale program here
              </a>
              .
            </p>

            {/* Step 10 */}
            <h2 id="step-10" className="text-2xl font-bold text-white mt-12 mb-4">
              Step 10 — Get Insurance
            </h2>
            <p className="text-gray-300 leading-relaxed">
              Tire shops carry meaningful liability exposure. A wheel coming off after a service
              can total a vehicle or kill someone. Don&apos;t cheap out here. You need:
            </p>
            <ul className="text-gray-300 leading-relaxed">
              <li><strong>General liability:</strong> $1M/$2M, ~$800–$1,800/year</li>
              <li><strong>Garage keepers liability:</strong> covers customer vehicles in your care, ~$1,200–$2,400/year</li>
              <li><strong>Workers comp:</strong> required in 49 states once you have employees, varies by state</li>
              <li><strong>Commercial auto:</strong> required for mobile, ~$1,800–$3,500/year per van</li>
              <li><strong>Property insurance:</strong> for brick-and-mortar, varies by buildout value</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              Specialty insurers — Federated, Universal Underwriters, Hagerty Garage &amp; Service
              — understand the auto service industry better than general carriers. Get three
              quotes minimum.
            </p>

            {/* Step 11 */}
            <h2 id="step-11" className="text-2xl font-bold text-white mt-12 mb-4">
              Step 11 — Hire Staff
            </h2>
            <p className="text-gray-300 leading-relaxed">
              A good tire technician is the single biggest factor in customer satisfaction and
              repeat business. Pay above market — $22–$32/hour in most metros — and you&apos;ll
              have your pick of candidates. Pay $16/hour and you&apos;ll churn through three hires
              in your first year and fix half their mistakes yourself.
            </p>
            <p className="text-gray-300 leading-relaxed mt-4">
              For mobile: you are the technician for the first 12–18 months. Don&apos;t hire
              until your route is consistently 6+ stops/day.
            </p>
            <p className="text-gray-300 leading-relaxed mt-4">
              For brick-and-mortar: hire one experienced technician before you open. Add a
              service writer/manager once you exceed $50K/month in revenue.
            </p>

            {/* Step 12 */}
            <h2 id="step-12" className="text-2xl font-bold text-white mt-12 mb-4">
              Step 12 — Set Up POS, Inventory, and Bookkeeping
            </h2>
            <p className="text-gray-300 leading-relaxed">
              The three POS systems built specifically for tire shops are <strong>TireMaster</strong>,{' '}
              <strong>TCS Tire Power</strong>, and <strong>ASA Automotive</strong>. They handle
              tire-specific tasks like DOT date tracking, TPMS sensor logging, and TIA tire
              warranty claims. Budget $150–$400/month per location.
            </p>
            <p className="text-gray-300 leading-relaxed mt-4">
              For mobile, <strong>Tekmetric</strong>, <strong>Shopmonkey</strong>, and{' '}
              <strong>AutoLeap</strong> are good general auto-service platforms that work well for
              tire-only operations and integrate with QuickBooks.
            </p>
            <p className="text-gray-300 leading-relaxed mt-4">
              Hire a bookkeeper from day one. $250–$500/month for a part-time bookkeeper using
              QuickBooks Online is cheap insurance against tax-season chaos.
            </p>

            {/* Step 13 */}
            <h2 id="step-13" className="text-2xl font-bold text-white mt-12 mb-4">
              Step 13 — Marketing and Your First 90 Days
            </h2>
            <p className="text-gray-300 leading-relaxed">
              The first 90 days are about three things: <strong>Google reviews</strong>,{' '}
              <strong>local SEO</strong>, and <strong>commercial accounts</strong>.
            </p>
            <p className="text-gray-300 leading-relaxed mt-4">
              <strong>Google reviews:</strong> ask every single customer. Send them a review link
              via text 4 hours after service. Aim for 50+ reviews and a 4.7+ average in your first
              90 days. This single metric drives more new tire shop revenue than anything else.
            </p>
            <p className="text-gray-300 leading-relaxed mt-4">
              <strong>Local SEO:</strong> claim and optimize your Google Business Profile. Post 2x
              a week. Get listed in tire/auto-service directories like Vicrez&apos;s{' '}
              <a href="/" className="text-vicrez-red underline">
                installer directory
              </a>{' '}
              (free for verified shops).
            </p>
            <p className="text-gray-300 leading-relaxed mt-4">
              <strong>Commercial accounts:</strong> one fleet account — say, a 40-vehicle local
              delivery company — can mean $40K–$80K of stable annual revenue. Cold-walk into
              every property management, landscaping, plumbing, and HVAC company within 5 miles in
              your first 30 days.
            </p>

            {/* Step 14 */}
            <h2 id="step-14" className="text-2xl font-bold text-white mt-12 mb-4">
              Step 14 — Track the Right Metrics
            </h2>
            <p className="text-gray-300 leading-relaxed">
              Most failed tire shops failed because the owner didn&apos;t look at numbers weekly.
              The five metrics that matter:
            </p>
            <ul className="text-gray-300 leading-relaxed">
              <li><strong>Revenue per bay per day</strong> — target $900–$1,400 for a single-bay shop</li>
              <li><strong>Gross margin %</strong> — target 38–46% blended (tires + service)</li>
              <li><strong>Average ticket</strong> — target $280+ for retail, $480+ for commercial</li>
              <li><strong>Repeat customer rate</strong> — target 35%+ by year 2</li>
              <li><strong>Google review velocity</strong> — target 8+ new reviews/month</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              Track these in a simple weekly dashboard. If any one of them slides for 4+
              consecutive weeks, you have a problem that needs immediate attention.
            </p>

            {/* FAQ */}
            <h2 className="text-2xl font-bold text-white mt-12 mb-6">Frequently Asked Questions</h2>
            <div className="space-y-6">
              {FAQ.map((f) => (
                <div key={f.q}>
                  <h3 className="text-white font-bold text-lg mb-2">{f.q}</h3>
                  <p className="text-gray-300 leading-relaxed mt-0">{f.a}</p>
                </div>
              ))}
            </div>

            {/* Bottom CTA */}
            <section className="mt-12 bg-gradient-to-r from-vicrez-red to-red-700 rounded-xl p-8 text-center">
              <h2 className="text-2xl font-bold text-white mb-3 mt-0">Ready to Run Real Numbers?</h2>
              <p className="text-white/90 mb-6 max-w-xl mx-auto">
                Our free interactive cost calculator takes 30 seconds and gives you a realistic
                startup-cost range for your specific plan — mobile or brick-and-mortar, your state,
                your equipment tier.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a
                  href="/start/startup-cost-calculator"
                  className="bg-white text-vicrez-red font-bold px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Run the Calculator
                </a>
                <a
                  href="https://b2b.vicrez.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border-2 border-white text-white font-bold px-6 py-3 rounded-lg hover:bg-white/10 transition-colors"
                >
                  Apply for Wholesale
                </a>
              </div>
            </section>
          </article>
        </div>
      </main>
      <Footer />
    </>
  );
}
