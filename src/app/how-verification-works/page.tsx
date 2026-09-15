import { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = { title: 'How Directory Verification Works', description: 'What Vicrez-recorded and Listed mean in the Vicrez Installer Network, the limits of these designations, and how to report errors.', alternates: { canonical: '/how-verification-works' } };

export default function Page() { return (<><Header /><main className="flex-1"><article className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-5 text-gray-300"><a href="/" className="text-vicrez-red underline">Installer directory</a><h1 className="text-3xl font-bold text-white">How Directory Verification Works</h1><h2 className="text-xl font-semibold">What does Vicrez-recorded mean here?</h2>
<p>The directory uses the Vicrez-recorded label (previously shown as Verified) when its source record identifies a dealer form, a Vicrez Business Network submission, customer-service records, recorded outreach, or a manual entry. The label describes the record&apos;s source; it does not establish that the shop&apos;s skills, licenses, insurance or completed work have been independently checked.</p>
<h2 className="text-xl font-semibold mt-8">What does Listed mean?</h2>
<p>A Listed profile does not have one of those source designations. Listings may use publicly available business information. Neither inclusion nor the absence of a Vicrez-recorded label is a rating of workmanship.</p>
<h2 className="text-xl font-semibold mt-8">Where do profile details come from?</h2>
<p>Profiles show available services, specialties and contact details from directory records. Some profiles also include Google-sourced ratings, hours or contact information. These fields can become outdated. Where a profile identifies its dealer-form source, its preparation questions help you discuss a project with the shop; they are not claims about completed jobs.</p>
<h2 className="text-xl font-semibold mt-8">What should I check before booking?</h2>
<ul className="list-disc pl-6 space-y-2"><li>Confirm the exact vehicle, part numbers and installation scope with the shop.</li><li>Ask the shop for relevant examples of its own work and any credentials important to your project.</li><li>Get pricing, timing, parts-delivery arrangements and warranty terms directly from the shop.</li></ul>
<p><a href="/contact" className="text-vicrez-red underline">Report incorrect information or request removal</a>. <a href="/directory" className="text-vicrez-red underline">Browse the directory</a>.</p></article></main><Footer /></>); }
