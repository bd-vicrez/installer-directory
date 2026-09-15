import { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Breadcrumbs from '@/components/Breadcrumbs';
import { generateArticleJsonLd } from '@/lib/seo';

const TITLE = 'Wholesale Tires for Shops: Quotes, Stocking Orders & the Vicrez Program';
const DESCRIPTION = 'Compare itemized tire quotes, plan stocking orders and understand Vicrez Volume and Elite order thresholds. Confirm current prices, availability and payment terms in your dealer account.';
const URL = 'https://installers.vicrez.com/start/wholesale-tires-for-shops';
export const metadata: Metadata = { title:TITLE,description:DESCRIPTION,alternates:{canonical:URL},openGraph:{title:TITLE,description:DESCRIPTION,type:'article',url:URL} };
const FAQ = [
  { q:'How do I compare wholesale tire prices?', a:'Compare current quotes for the same SKU and quantity, including freight, handling, taxes or applicable fees, delivery timing and the supplier’s return conditions. A generic percentage below retail does not establish your actual cost.' },
  { q:'What are Vicrez’s stocking-order volume thresholds?', a:'Volume begins at $5,000 and Elite at $10,000 for qualifying stocking orders shipped to the dealer’s business. The incentive is based on the qualifying order volume. Confirm the applicable products and pricing in your dealer account.' },
  { q:'What is the MAP basis?', a:'The approved MAP basis is the Vicrez.com price before discounts. A dealer’s purchase price and the public advertised-price basis are separate figures.' },
  { q:'Does a directory listing establish dealer membership or credit approval?', a:'No. Being listed in the installer directory does not establish a purchasing relationship, active dealer membership or credit approval. Confirm wholesale-account eligibility and payment terms directly with Vicrez.' },
];

export default function WholesaleTiresForShopsPage() {
  const article=generateArticleJsonLd({title:TITLE,description:DESCRIPTION,url:URL,datePublished:'2026-06-22',dateModified:'2026-09-15'});
  const faq={'@context':'https://schema.org','@type':'FAQPage',mainEntity:FAQ.map(item=>({'@type':'Question',name:item.q,acceptedAnswer:{'@type':'Answer',text:item.a}}))};
  return <><Header/><main className="flex-1"><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(article)}}/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(faq)}}/>
    <article className="max-w-4xl mx-auto px-4 sm:px-6 py-10 text-gray-700 space-y-7">
      <Breadcrumbs items={[{name:'Start a Tire Shop',href:'/start'},{name:'Wholesale Tires for Shops',href:'/start/wholesale-tires-for-shops'}]}/>
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">{TITLE}</h1>
      <p className="text-sm text-gray-600">Updated September 15, 2026 · By the Vicrez team</p>
      <p className="text-lg">A useful wholesale comparison starts with the tires you need, the quantity you can stock and the complete delivered cost. Request current, itemized quotes and confirm the terms attached to your own account.</p>
      <section className="card p-6 space-y-4"><h2 className="text-2xl font-semibold">Vicrez stocking-order incentives</h2><p>The volume incentive encourages dealers to place inventory orders for their business.</p>
        <div className="overflow-x-auto"><table className="w-full text-left border-collapse"><caption className="sr-only">Qualifying stocking-order thresholds</caption><thead><tr><th className="p-3 border-b">Order level</th><th className="p-3 border-b">Qualifying order value</th><th className="p-3 border-b">Shipping destination</th></tr></thead><tbody><tr><td className="p-3 border-b">Volume</td><td className="p-3 border-b">$5,000</td><td className="p-3 border-b">Dealer’s business</td></tr><tr><td className="p-3 border-b">Elite</td><td className="p-3 border-b">$10,000</td><td className="p-3 border-b">Dealer’s business</td></tr></tbody></table></div>
        <p>These thresholds apply to qualifying stocking orders shipped to the dealer’s business. Check your dealer account for the applicable products, order calculation and current prices before placing an order.</p>
        <p><strong>MAP basis:</strong> the Vicrez.com price before discounts. Keep the advertised-price basis separate from your dealer acquisition cost.</p>
        <a href="https://b2b.vicrez.com/" className="btn-primary inline-block">Explore the Vicrez Wholesale Dealer Program</a>
      </section>
      <section className="space-y-3"><h2 className="text-2xl font-semibold">Compare the same products and the full delivered cost</h2><p>Give each supplier the same SKU, size, load/speed specification and quantity. Ask for an itemized quote showing the product cost, freight or handling charges, available inventory and the estimated shipping or pickup date.</p><p>Confirm return conditions and any special-order restrictions. A broad “percentage below MSRP” cannot tell you what your specific order will cost or what margin your shop will achieve.</p></section>
      <section className="space-y-3"><h2 className="text-2xl font-semibold">Plan stock around your own demand</h2><p>Review the sizes and products your shop actually sells, your storage capacity and replenishment lead times. Compare a qualifying inventory order with smaller replenishment orders using real quotes. Keep slow-moving products and carrying costs visible in that comparison.</p><p>For customer-specific orders, confirm available fulfillment options directly. Do not assume an order shipped somewhere other than the dealer’s business qualifies for the stocking-order incentive.</p></section>
      <section className="space-y-3"><h2 className="text-2xl font-semibold">Confirm account and payment terms directly</h2><p>Ask which business documents the supplier requires, what payment methods are accepted, when payment is due and whether any minimum quantity applies to your products. Credit availability, approval criteria and financing terms require confirmation from the supplier.</p><p>This page does not promise Net-30 approval, a particular credit-score threshold, a universal discount percentage or a minimum-order exemption.</p></section>
      <section className="space-y-3"><h2 className="text-2xl font-semibold">Installer listing and wholesale membership</h2><p>Vicrez publishes the installer directory and offers tires and aftermarket parts through its retail and wholesale channels. A directory record is not proof that the shop has purchased from Vicrez, is a current dealer, or has had its installation work certified.</p><p>Shop owners can <a href="/apply" className="text-vicrez-red underline">apply for a directory listing</a> or <a href="/contact" className="text-vicrez-red underline">request a listing correction</a>. Explore the wholesale program separately when purchasing inventory is relevant to your business.</p></section>
      <section className="space-y-5"><h2 className="text-2xl font-semibold">Common questions</h2>{FAQ.map(item=><div key={item.q}><h3 className="font-semibold text-gray-900">{item.q}</h3><p className="mt-2">{item.a}</p></div>)}</section>
    </article>
  </main><Footer/></>;
}
