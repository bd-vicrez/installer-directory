import { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = { title: 'Contact the Installer Directory', description: 'Contact Vicrez about installer listing corrections, removal requests or directory questions. Contact shops directly for project quotes.', alternates: { canonical: '/contact' } };

export default function Page() { return (<><Header /><main className="flex-1"><article className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-5 text-gray-300"><a href="/" className="text-vicrez-red underline">Installer directory</a><h1 className="text-3xl font-bold text-white">Contact the Installer Directory</h1><h2 className="text-xl font-semibold">Listing corrections and removal</h2>
<p>Email <a href="mailto:support@vicrez.com?subject=Installer%20directory%20request" className="text-vicrez-red underline">support@vicrez.com</a> with the profile URL, business name, the correction or removal requested, and your relationship to the business. For a correction, include a business-controlled source or explanation that supports the change. Do not include passwords, payment details or sensitive identification documents.</p>
<p>Each installer profile also has a listing-contact link with the shop name in the email subject. This contact route does not automatically change or remove a profile.</p>
<h2 className="text-xl font-semibold mt-8">Installation quotes and appointments</h2>
<p>Contact the shop using the phone number or website on its profile. Confirm availability and the scope of work with the business; a directory listing is not a booking confirmation.</p>
<h2 className="text-xl font-semibold mt-8">Add a shop</h2>
<p>Use the <a href="/apply" className="text-vicrez-red underline">shop listing application</a> to submit business information. Read <a href="/how-verification-works" className="text-vicrez-red underline">how directory labels work</a> before relying on a badge.</p></article></main><Footer /></>); }
