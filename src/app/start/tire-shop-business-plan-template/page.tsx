import { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Breadcrumbs from '@/components/Breadcrumbs';
import { generateArticleJsonLd } from '@/lib/seo';

const TITLE = 'Tire Shop Business Plan Template (Free, Lender-Ready 2026)';
const DESCRIPTION =
  'Free SBA-style business plan template built specifically for tire shops. 9 sections, lender-ready format, 3-year financial projection structure. Walks you through executive summary, market analysis, operations, marketing, and financials.';
const URL = 'https://installers.vicrez.com/start/tire-shop-business-plan-template';
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
    q: 'Do I really need a business plan if I am self-funding?',
    a: 'Yes — though for a different reason. A self-funder writes a business plan to force themselves to confront uncomfortable numbers (rent, payroll, slow months, marketing burn). The exercise itself is worth more than the document. The plan also doubles as the document you hand to a future bank, partner, or investor if you need capital down the road.',
  },
  {
    q: 'How long should a tire shop business plan be?',
    a: 'For SBA loan applications, the standard plan runs 20–35 pages including financial projections. For self-funded launches or internal use, a tighter 10–15 page version is sufficient. The financial projections section should always be detailed — 3 years monthly for year 1, quarterly for years 2–3.',
  },
  {
    q: 'What financial projections should I include?',
    a: 'A lender-ready tire shop plan needs three projections: (1) a monthly profit and loss statement for year 1 and quarterly for years 2–3, (2) a cash flow projection for the first 18 months (this is the single most important document for new tire shops), and (3) a startup cost schedule with each line item itemized. Include a break-even analysis and sensitivity tables.',
  },
  {
    q: 'What revenue assumption should I use for year 1?',
    a: 'Conservative is better than optimistic — lenders discount aggressive projections. Single-bay shop year-1 revenue typically lands $320K–$600K; multi-bay $650K–$1.4M; mobile $120K–$280K solo. Use the bottom of these ranges in your base case, the top in your upside case, and a 60% retention of base case as your downside. Show all three.',
  },
];

const articleJsonLd = generateArticleJsonLd({ title: TITLE, description: DESCRIPTION, url: URL, datePublished: DATE_PUB, dateModified: DATE_MOD });
const faqJsonLd = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) };

const SECTIONS = [
  {
    n: '1',
    title: 'Executive Summary',
    desc: 'One-page overview of the entire plan. Write this last. Cover: the opportunity, your business model, location, target market, financial highlights (year 3 revenue, gross margin, owner take), funding request and use of funds, and management team. Bankers read this section first and sometimes only.',
  },
  {
    n: '2',
    title: 'Business Description',
    desc: 'Legal structure (LLC, S-Corp), ownership breakdown, founding date, location, business model (mobile / single-bay / multi-bay / used), and what makes your shop different. Two-sentence mission statement at most. Bankers do not care about your mission, they care about your differentiation.',
  },
  {
    n: '3',
    title: 'Market Analysis',
    desc: 'Three subsections: (a) Industry overview — U.S. tire service market is roughly $40B annually, independents capture 60%+, growth steady at 3–4% per year, (b) Local market — registered vehicle count in your county, competitor density, service gap analysis, (c) Target customer — retail vs commercial mix, demographics, geographic radius.',
  },
  {
    n: '4',
    title: 'Organization and Management',
    desc: 'Org chart even if it is just you for now. Owner background and relevant experience (this is what banks weigh heaviest). Key hires planned and timing. Advisory board if you have one. Insurance carriers and key vendors as appendix items.',
  },
  {
    n: '5',
    title: 'Products and Services',
    desc: 'Service menu with pricing: tire mounting and balancing, TPMS service, alignment, rotation, flat repair, road hazard programs. Tire brand carry-list — which national distributor and specialty wholesaler relationships you have (or plan to have). Average ticket assumption and how you arrived at it.',
  },
  {
    n: '6',
    title: 'Marketing and Sales Strategy',
    desc: 'Customer acquisition plan with specific channels and budgets: Google Business Profile + reviews strategy (target 50+ reviews in 90 days), local Google Ads (typical $1,500–$4,000/month for new shops), commercial fleet outreach plan (specific target list), retention program (rotation reminders, road hazard sign-ups), and referral incentives. Include CAC and LTV assumptions.',
  },
  {
    n: '7',
    title: 'Funding Request',
    desc: 'Total capital required, broken into one-time startup costs and 4-month working capital reserve. Use of funds table. Owner equity contribution. Loan terms requested (SBA 7(a) typical: 10-year term, prime + 2.75%). Repayment plan tied to cash flow projection.',
  },
  {
    n: '8',
    title: 'Financial Projections',
    desc: 'The make-or-break section. Three financial statements: (1) monthly P&L year 1, quarterly years 2–3, (2) cash flow projection 18 months monthly, (3) startup cost schedule itemized. Include base / upside / downside cases. Include a break-even month calculation. Bankers will stress-test these — make assumptions explicit and defensible.',
  },
  {
    n: '9',
    title: 'Appendix',
    desc: 'Owner resume, copies of licenses and permits, lease draft or letter of intent, equipment quotes, insurance quotes, supplier quotes, market research sources cited. Anything that supports a claim made elsewhere in the plan goes here.',
  },
];

export default function BusinessPlanTemplatePage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs items={[{ name: 'Start a Tire Shop', href: '/start' }, { name: 'Business Plan Template', href: '/start/tire-shop-business-plan-template' }]} />

          <article className="prose prose-invert max-w-none mt-4">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">{TITLE}</h1>
            <p className="text-vicrez-muted text-sm mb-8">Updated June 2026 &middot; 12 min read &middot; By the Vicrez team</p>

            <p className="text-gray-300 text-lg leading-relaxed">
              A business plan is not a marketing document. It is a financial stress test you do
              with yourself before you spend $150,000 on a buildout. This template walks you
              through the SBA-standard 9-section structure, applied specifically to a tire shop —
              with the assumptions, ranges, and reference points new tire shop owners actually
              need. It works for SBA loan applications, equipment financing, conventional bank
              loans, and self-funded launches.
            </p>

            <div className="my-8 bg-vicrez-card border border-vicrez-border rounded-xl p-6">
              <h2 className="text-white font-bold text-lg mt-0 mb-3">How to Use This Template</h2>
              <ul className="text-gray-300 leading-relaxed space-y-2 mb-0">
                <li>Open a blank Google Doc. Title it &quot;[Your Shop Name] Business Plan 2026.&quot;</li>
                <li>Copy each section heading below into your doc.</li>
                <li>Work through them in order — except the Executive Summary, which you write last.</li>
                <li>Budget 15–25 hours of focused work. Most owners take 2–3 weekends.</li>
                <li>Have a second set of eyes review your financials before you submit anywhere. SCORE mentors are free and excellent.</li>
              </ul>
            </div>

            <h2 className="text-2xl font-bold text-white mt-10 mb-6">The 9 Sections</h2>

            {SECTIONS.map((s) => (
              <div key={s.n} className="mb-8">
                <h3 className="text-xl font-bold text-white mb-3">
                  <span className="text-vicrez-red">Section {s.n}.</span> {s.title}
                </h3>
                <p className="text-gray-300 leading-relaxed">{s.desc}</p>
              </div>
            ))}

            <h2 className="text-2xl font-bold text-white mt-10 mb-4">Reference Numbers to Use</h2>
            <p className="text-gray-300 leading-relaxed">
              For your financial projections, anchor your assumptions to these industry-tested
              ranges:
            </p>
            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm text-left border border-vicrez-border">
                <thead className="bg-vicrez-card text-white">
                  <tr>
                    <th className="p-3 border-b border-vicrez-border">Metric</th>
                    <th className="p-3 border-b border-vicrez-border">Mobile</th>
                    <th className="p-3 border-b border-vicrez-border">Single-Bay</th>
                    <th className="p-3 border-b border-vicrez-border">Multi-Bay</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  <tr className="border-b border-vicrez-border/50"><td className="p-3">Year-1 revenue</td><td className="p-3">$120K–$280K</td><td className="p-3">$320K–$600K</td><td className="p-3">$650K–$1.4M</td></tr>
                  <tr className="border-b border-vicrez-border/50"><td className="p-3">Year-3 revenue</td><td className="p-3">$220K–$450K</td><td className="p-3">$550K–$900K</td><td className="p-3">$1.1M–$2.4M</td></tr>
                  <tr className="border-b border-vicrez-border/50"><td className="p-3">Blended gross margin</td><td className="p-3">38–44%</td><td className="p-3">38–46%</td><td className="p-3">36–44%</td></tr>
                  <tr className="border-b border-vicrez-border/50"><td className="p-3">Average ticket (retail)</td><td className="p-3">$280–$420</td><td className="p-3">$240–$380</td><td className="p-3">$260–$400</td></tr>
                  <tr className="border-b border-vicrez-border/50"><td className="p-3">Average ticket (commercial)</td><td className="p-3">$420–$680</td><td className="p-3">$480–$760</td><td className="p-3">$520–$880</td></tr>
                  <tr className="border-b border-vicrez-border/50"><td className="p-3">Break-even month</td><td className="p-3">Month 8–14</td><td className="p-3">Month 14–22</td><td className="p-3">Month 16–26</td></tr>
                  <tr><td className="p-3">Year-3 owner take</td><td className="p-3">$90K–$160K</td><td className="p-3">$140K–$240K</td><td className="p-3">$180K–$340K</td></tr>
                </tbody>
              </table>
            </div>

            <h2 className="text-2xl font-bold text-white mt-10 mb-4">Operating Expense Assumptions</h2>
            <p className="text-gray-300 leading-relaxed">
              Use these monthly opex ranges as starting points (adjust for your state and local
              cost of living):
            </p>
            <ul className="text-gray-300 leading-relaxed">
              <li><strong>Rent + utilities:</strong> $2,500–$8,000 (single-bay); $6,000–$18,000 (multi-bay); $0–$600 (mobile garage / storage)</li>
              <li><strong>Payroll + payroll taxes:</strong> $4,500–$10,000 (single-bay with 1 tech); $14,000–$32,000 (multi-bay with 3–5 staff)</li>
              <li><strong>Insurance:</strong> $400–$900/month all-in</li>
              <li><strong>Tire inventory replenishment:</strong> ~55–65% of tire revenue</li>
              <li><strong>Marketing:</strong> $1,500–$4,000/month first year, declining to $800–$2,000 as organic and referral kick in</li>
              <li><strong>POS, software, banking, bookkeeping:</strong> $400–$900/month</li>
              <li><strong>Misc (consumables, uniforms, supplies):</strong> $400–$1,200/month</li>
            </ul>

            <h2 className="text-2xl font-bold text-white mt-10 mb-4">The Cash Flow Trap</h2>
            <p className="text-gray-300 leading-relaxed">
              The single most common reason new tire shops fail is not because the business is
              bad — it&apos;s because the owner ran out of cash before customer flow stabilized.
              Your cash flow projection must show, month by month, how much cash you have in the
              bank at end of month. If any month shows negative cash, your plan is broken before
              you start.
            </p>
            <p className="text-gray-300 leading-relaxed mt-4">
              Plan for at least 4 months of full operating expenses in working capital reserve on
              top of your equipment and buildout budget. Five months is safer. Lenders will check
              this — and a plan that shows tight cash in months 3–6 will get rejected even if the
              business itself is sound.
            </p>

            <h2 className="text-2xl font-bold text-white mt-10 mb-4">Where to Get Free Help</h2>
            <ul className="text-gray-300 leading-relaxed">
              <li><strong>SCORE mentors</strong> (score.org) — free 1-on-1 mentorship from retired execs, including many auto industry veterans</li>
              <li><strong>SBA Small Business Development Centers</strong> (sba.gov/local-assistance) — free business plan review</li>
              <li><strong>Your local Chamber of Commerce</strong> — connections to bankers, lawyers, accountants who specialize in small business launches</li>
              <li><strong>Vicrez wholesale rep</strong> — once you&apos;re approved, our reps can pressure-test your tire revenue and inventory assumptions for free</li>
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
              <h2 className="text-2xl font-bold text-white mb-3 mt-0">Next Step: Run Your Numbers</h2>
              <p className="text-white/90 mb-6 max-w-xl mx-auto">
                Before you start writing, use our free interactive calculator to lock in your startup-cost range. That number becomes the anchor for your funding request and cash flow projections.
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
