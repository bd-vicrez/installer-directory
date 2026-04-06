import type { Metadata } from 'next';
import './globals.css';
import { generateOrganizationJsonLd } from '@/lib/seo';
import SideNav from '@/components/SideNav';

export const metadata: Metadata = {
  title: 'Vicrez Installer Network | Find Body Kit, Wheel, Tire & Wrap Installers Near You',
  description:
    'Find trusted installers for Vicrez body kits, OE replacement bumpers, widebody kits, aero parts, wheels, tires, vinyl wrap, PPF, window tint, and exterior accessories. Browse 6,000+ shops nationwide and request free quotes.',
  openGraph: {
    title: 'Vicrez Installer Network | Find Body Kit, Wheel, Tire & Wrap Installers Near You',
    description: 'Find trusted installers for Vicrez body kits, bumpers, wheels, tires, vinyl wrap, PPF, and aftermarket parts. Browse 6,000+ shops nationwide.',
    type: 'website',
    url: 'https://installers.vicrez.com',
    siteName: 'Vicrez Installer Network',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vicrez Installer Network | Find Body Kit, Wheel, Tire & Wrap Installers Near You',
    description: 'Find trusted installers for Vicrez body kits, bumpers, wheels, tires, vinyl wrap, PPF, and more. 6,000+ shops nationwide.',
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
        {children}
      </body>
    </html>
  );
}
