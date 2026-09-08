import type { Metadata } from 'next';

// /apply/page.tsx is a client component and cannot export metadata; without this
// layout it inherited the homepage title (duplicate <title> across two indexed URLs).
export const metadata: Metadata = {
  title: 'Join the Vicrez Installer Network | Apply for Free Installer Listing',
  description:
    'Apply to join the Vicrez Installer Network. Get a free verified listing, customer referrals for body kit, wheel, tire, vinyl wrap and PPF installs, and priority placement in your city.',
  alternates: { canonical: '/apply' },
  openGraph: {
    title: 'Join the Vicrez Installer Network',
    description: 'Free verified listing + customer referrals for auto body, wheel, tire, wrap and PPF shops.',
    url: 'https://installers.vicrez.com/apply',
    type: 'website',
  },
};

export default function ApplyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
