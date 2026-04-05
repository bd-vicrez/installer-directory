import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { queryInstallerBySlug, queryAllInstallerSlugs } from '@/lib/db';
import { Installer } from '@/lib/types';
import { getTier, parseCapabilities, formatPhone } from '@/lib/utils';
import { generateInstallerJsonLd, STATE_NAMES, toStateSlug, toLocationSlug } from '@/lib/seo';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Breadcrumbs from '@/components/Breadcrumbs';
import CtaBanner from '@/components/CtaBanner';
import QuoteButton from '@/components/QuoteButton';
import ShareButtons from '@/components/ShareButtons';

interface PageProps {
  params: { slug: string };
}

export async function generateStaticParams() {
  const slugs = await queryAllInstallerSlugs(500);
  return slugs.map((slug: string) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const installer: Installer | null = await queryInstallerBySlug(params.slug);
  if (!installer) return { title: 'Installer Not Found' };

  const title = `${installer.business_name} - Vicrez Installer in ${installer.city}, ${installer.state} | Body Kits, Wheels, Wraps & More`;
  const description = `${installer.business_name} in ${installer.city}, ${installer.state}. Installation services for body kits, bumpers, aero parts, wheels, tires, vinyl wrap, PPF, and aftermarket accessories. ${installer.google_rating ? `Rated ${installer.google_rating}/5 on Google.` : ''} View hours, services & get directions.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: `https://installers.vicrez.com/installer/${params.slug}`,
    },
    alternates: {
      canonical: `/installer/${params.slug}`,
    },
  };
}

function formatHours(hours: Record<string, string> | null) {
  if (!hours) return null;
  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const entries = dayOrder
    .filter((day) => hours[day] !== undefined)
    .map((day) => ({ day, hours: hours[day] }));
  if (entries.length === 0) return null;
  return entries;
}

export default async function InstallerPage({ params }: PageProps) {
  const installer: Installer | null = await queryInstallerBySlug(params.slug);
  if (!installer) notFound();

  const tier = getTier(installer.source);
  const isVerified = tier === 'verified';
  const capabilities = parseCapabilities(installer.install_capabilities);
  const phone = installer.google_phone || installer.phone;
  const website = installer.google_website || installer.website;
  const rating = installer.google_rating;
  const reviewCount = installer.google_review_count;
  const hours = formatHours(installer.google_hours);
  const jsonLd = generateInstallerJsonLd(installer);

  // Build enhanced JSON-LD with Google data
  if (rating && reviewCount) {
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: rating,
      bestRating: 5,
      ratingCount: reviewCount,
    };
  }
  if (hours) {
    jsonLd.openingHoursSpecification = hours.map((h: { day: string; hours: string }) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: h.day,
      opens: h.hours === 'Closed' ? undefined : h.hours.split('–')[0]?.trim(),
      closes: h.hours === 'Closed' ? undefined : h.hours.split('–')[1]?.trim(),
    }));
  }

  const stateSlug = toStateSlug(installer.state);
  const citySlug = toLocationSlug(installer.city, installer.state);
  const stateName = STATE_NAMES[installer.state?.toUpperCase()] || installer.state;

  const breadcrumbItems = [
    { name: 'Directory', href: '/directory' },
    { name: stateName, href: `/installers/${stateSlug}` },
    { name: installer.city, href: `/installers/${citySlug}` },
    { name: installer.business_name, href: `/installer/${params.slug}` },
  ];

  return (
    <>
      <Header />
      <main className="flex-1">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs items={breadcrumbItems} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Header */}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  {isVerified ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                        <path d="M12 1L14.7 3.3H18.4L19 7L22 9.5L20.7 13L22 16.5L19 19L18.4 22.7H14.7L12 25L9.3 22.7H5.6L5 19L2 16.5L3.3 13L2 9.5L5 7L5.6 3.3H9.3L12 1Z" fill="#1DA1F2" transform="scale(0.88) translate(1.5, 1.5)"/>
                        <path d="M9.55 18.5L3.85 12.8L5.275 11.375L9.55 15.65L18.725 6.475L20.15 7.9L9.55 18.5Z" fill="white" transform="scale(0.7) translate(5, 4.5)"/>
                      </svg>
                      Verified Vicrez Installer
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-vicrez-card text-vicrez-muted border border-vicrez-border">
                      Listed Installer
                    </span>
                  )}
                </div>
                <h1 className="text-3xl font-bold text-white mb-3">{installer.business_name}</h1>

                {/* Google rating */}
                {rating && (
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <svg key={i} className={`w-5 h-5 ${i < Math.round(rating) ? 'text-yellow-400' : 'text-gray-600'}`} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <span className="text-white font-semibold">{rating.toFixed(1)}</span>
                    {reviewCount && (
                      <span className="text-vicrez-muted">({reviewCount.toLocaleString()} reviews)</span>
                    )}
                  </div>
                )}
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap gap-3">
                {installer.lat && installer.lng && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${installer.lat},${installer.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary flex items-center gap-2 !px-6 !py-3"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    Get Directions
                  </a>
                )}
                {website && (
                  <a
                    href={website.startsWith('http') ? website : `https://${website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary flex items-center gap-2 !px-6 !py-3"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Visit Website
                  </a>
                )}
              </div>

              {/* Details */}
              <div className="card p-6 space-y-4">
                <h2 className="text-lg font-semibold text-white">Contact & Location</h2>

                {/* Address */}
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-vicrez-muted mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div className="text-gray-300">
                    {installer.street_address && <div>{installer.street_address}</div>}
                    <div>{installer.city}, {installer.state} {installer.zip_code}</div>
                  </div>
                </div>

                {/* Phone */}
                {phone && (
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-vicrez-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <a href={`tel:${phone}`} className="text-vicrez-red hover:underline text-lg">
                      {formatPhone(phone)}
                    </a>
                  </div>
                )}

                {/* Email */}
                {installer.email && (
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-vicrez-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <a href={`mailto:${installer.email}`} className="text-vicrez-red hover:underline">
                      {installer.email}
                    </a>
                  </div>
                )}
              </div>

              {/* Quote Request */}
              <QuoteButton 
                installer={{
                  id: installer.id.toString(),
                  business_name: installer.business_name,
                  city: installer.city,
                  state: installer.state,
                  email: installer.email || '',
                  phone: phone || installer.phone || ''
                }}
              />

              {/* Capabilities */}
              {capabilities.length > 0 && (
                <div className="card p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Installation Services</h2>
                  <div className="flex flex-wrap gap-2">
                    {capabilities.map((cap, i) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 rounded-full text-sm bg-vicrez-red/10 text-vicrez-red border border-vicrez-red/20"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Specialties */}
              {installer.specialize_in && (
                <div className="card p-6">
                  <h2 className="text-lg font-semibold text-white mb-3">Specializes In</h2>
                  <p className="text-gray-300">{installer.specialize_in}</p>
                </div>
              )}

              {/* Google Map */}
              {installer.lat && installer.lng && (
                <div className="card overflow-hidden">
                  <iframe
                    title={`Map of ${installer.business_name}`}
                    width="100%"
                    height="350"
                    style={{ border: 0 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${installer.lat},${installer.lng}&zoom=14`}
                  />
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Business Hours */}
              {hours && (
                <div className="card p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Business Hours</h2>
                  <div className="space-y-2">
                    {hours.map((h) => (
                      <div key={h.day} className="flex justify-between text-sm">
                        <span className="text-gray-400">{h.day}</span>
                        <span className={h.hours === 'Closed' ? 'text-red-400' : 'text-gray-300'}>
                          {h.hours}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Shop type */}
              {installer.shop_type && (
                <div className="card p-6">
                  <h2 className="text-lg font-semibold text-white mb-3">Shop Type</h2>
                  <p className="text-gray-300">{installer.shop_type}</p>
                </div>
              )}

              {/* Share Buttons */}
              <ShareButtons 
                url={`https://installers.vicrez.com/installer/${params.slug}`}
                businessName={installer.business_name}
              />

              {/* Quick links */}
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Browse More</h2>
                <div className="space-y-2">
                  <a
                    href={`/installers/${citySlug}`}
                    className="block text-sm text-vicrez-red hover:underline"
                  >
                    More installers in {installer.city}, {installer.state}
                  </a>
                  <a
                    href={`/installers/${stateSlug}`}
                    className="block text-sm text-vicrez-red hover:underline"
                  >
                    All installers in {stateName}
                  </a>
                  <a
                    href="/directory"
                    className="block text-sm text-vicrez-red hover:underline"
                  >
                    Browse full directory
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <CtaBanner />
      </main>
      <Footer />
    </>
  );
}
