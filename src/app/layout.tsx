import type { Metadata } from 'next';
import './globals.css';
import { generateOrganizationJsonLd } from '@/lib/seo';
import SideNav from '@/components/SideNav';
import UtmLinkAppender from '@/components/UtmLinkAppender';
import GoogleAnalytics from '@/components/GoogleAnalytics';

export const metadata: Metadata = {
  title: 'Vicrez Installer Network | Find Body Kit, Wheel, Tire & Wrap Installers Near You',
  description:
    'Find local shops for Vicrez body kits, OE replacement bumpers, widebody kits, aero parts, wheels, tires, vinyl wrap, PPF, window tint, and exterior accessories. Browse recorded shop services nationwide and request free quotes.',
  openGraph: {
    title: 'Vicrez Installer Network | Find Body Kit, Wheel, Tire & Wrap Installers Near You',
    description: 'Find local shops for Vicrez body kits, bumpers, wheels, tires, vinyl wrap, PPF, and aftermarket parts. Browse recorded shop services nationwide.',
    type: 'website',
    url: 'https://installers.vicrez.com',
    siteName: 'Vicrez Installer Network',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vicrez Installer Network | Find Body Kit, Wheel, Tire & Wrap Installers Near You',
    description: 'Find local shops for Vicrez body kits, bumpers, wheels, tires, vinyl wrap, PPF, and more. Browse recorded shop services nationwide.',
  },
  robots: 'index, follow',
  metadataBase: new URL('https://installers.vicrez.com'),
  alternates: {
    canonical: '/',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const orgJsonLd = generateOrganizationJsonLd();

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
      </head>
      <body className="min-h-screen flex flex-col">
        <SideNav />
        <UtmLinkAppender />
        <GoogleAnalytics />
        {children}
      </body>
    </html>
  );
}
