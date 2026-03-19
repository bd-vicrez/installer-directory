import type { Metadata } from 'next';
import './globals.css';
import { generateOrganizationJsonLd } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Find Body Kit & Widebody Kit Installers Near You | Vicrez',
  description:
    'Search 6,000+ body kit installers nationwide. Professional widebody kit, aero kit & body kit installation near you. Get free quotes from verified shops.',
  openGraph: {
    title: 'Find Body Kit & Widebody Kit Installers Near You | Vicrez',
    description: 'Search 6,000+ body kit installers nationwide. Professional widebody kit, aero kit & body kit installation near you. Get free quotes from verified shops.',
    type: 'website',
    url: 'https://installers.vicrez.com',
    siteName: 'Vicrez Installer Directory',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Find Body Kit & Widebody Kit Installers Near You | Vicrez',
    description: 'Search 6,000+ body kit installers nationwide. Get free quotes from verified shops.',
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
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
