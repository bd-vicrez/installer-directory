import { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Breadcrumbs from '@/components/Breadcrumbs';
import Calculator from './Calculator';

const TITLE = 'Tire Shop Startup Cost Calculator (2026)';
const DESCRIPTION =
  'Free interactive tire shop startup cost calculator. Pick your model (mobile, single-bay, multi-bay), state, and equipment tier — get a realistic 2026 cost range in 30 seconds. Built by Vicrez.';
const URL = 'https://installers.vicrez.com/start/startup-cost-calculator';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
    url: URL,
  },
  alternates: { canonical: URL },
};

export default function StartupCostCalculatorPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs
            items={[
              { name: 'Start a Tire Shop', href: '/start' },
              { name: 'Startup Cost Calculator', href: '/start/startup-cost-calculator' },
            ]}
          />

          <div className="mt-6 mb-8">
            <span className="inline-block bg-blue-600 text-white text-xs font-bold tracking-wider uppercase px-3 py-1 rounded-full mb-4">
              Interactive Tool
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
              Tire Shop Startup Cost Calculator (2026)
            </h1>
            <p className="text-vicrez-muted text-lg mt-4 max-w-2xl">
              Pick your business model, state, and equipment tier. Get a realistic startup-cost
              range — including the working capital buffer most new owners forget.
            </p>
          </div>

          <Calculator />

          <section className="mt-12 bg-vicrez-card border border-vicrez-border rounded-xl p-6">
            <h2 className="text-white font-bold text-lg mb-3 mt-0">How this calculator works</h2>
            <p className="text-gray-300 leading-relaxed">
              Numbers are based on real 2026 pricing from operators and equipment dealers we work
              with at Vicrez. We supply tires and aftermarket parts to 16,500+ installers
              nationwide, so we see what new shops actually spend. Ranges reflect low-end
              (used equipment, lower-cost state) to high-end (new equipment, higher-cost state).
            </p>
            <p className="text-gray-300 leading-relaxed mt-3">
              The biggest line most new owners forget is <strong>working capital</strong>. We
              automatically add a 4-month operating expense reserve to the total, because that&apos;s
              what separates shops that survive year one from shops that don&apos;t.
            </p>
            <p className="text-gray-300 leading-relaxed mt-3">
              For the full step-by-step breakdown, read{' '}
              <a
                href="/start/how-to-open-a-tire-shop"
                className="text-vicrez-red underline"
              >
                How to Open a Tire Shop — The Complete 2026 Guide
              </a>
              .
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
