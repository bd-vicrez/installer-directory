import { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = { title: 'About the Vicrez Installer Directory', description: 'Learn who operates the Vicrez Installer Network, where listing information comes from, and how to use shop profiles.', alternates: { canonical: '/about' } };

export default function Page() { return (<><Header /><main className="flex-1"><article className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-5 text-gray-300"><a href="/" className="text-vicrez-red underline">Installer directory</a><h1 className="text-3xl font-bold text-white">About the Vicrez Installer Directory</h1><p>The Vicrez Installer Network is a directory operated by Vicrez to help visitors find and contact automotive installation businesses. The directory includes business-submitted records and listings assembled from publicly available information.</p>
<h2 className="text-xl font-semibold mt-8">Use profiles as a starting point</h2>
<p>Compare each shop&apos;s recorded services, location and contact details. Contact the business directly to confirm that it accepts your vehicle and parts, and agree on the work, price, timing and warranty before booking. A listing does not mean that every service mentioned elsewhere on this website is available at that shop.</p>
<h2 className="text-xl font-semibold mt-8">Understand the labels</h2>
<p>Vicrez-recorded and Listed describe directory record sources. They are not an independent certification, an inspection of the business, or a guarantee of workmanship. <a href="/how-verification-works" className="text-vicrez-red underline">Read how the labels are assigned</a>.</p>
<h2 className="text-xl font-semibold mt-8">Keep information accurate</h2>
<p>Business details can change. Shop owners and visitors can <a href="/contact" className="text-vicrez-red underline">contact Vicrez about corrections or removal</a>. Shops not yet in the directory can use the <a href="/apply" className="text-vicrez-red underline">listing application</a>.</p></article></main><Footer /></>); }
