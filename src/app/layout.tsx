import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Find a Vicrez Installer Near You | Installer Directory',
  description:
    'Search our nationwide network of verified body kit installers, wrap shops, and automotive customization experts. Find trusted professionals near your zip code.',
  openGraph: {
    title: 'Vicrez Installer Directory',
    description: 'Find verified body kit installers and automotive customization pros near you.',
    type: 'website',
    url: 'https://installers.vicrez.com',
  },
  robots: 'index, follow',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
