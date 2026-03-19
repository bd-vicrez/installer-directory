import { Installer } from './types';
import { getTier, parseRating, parseCapabilities, formatPhone } from './utils';

export const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia',
};

export const STATE_ABBR_FROM_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_NAMES).map(([abbr, name]) => [name.toLowerCase(), abbr])
);

export function stateAbbrFromSlug(slug: string): string | null {
  // Try direct abbreviation match (e.g., "tx", "ca")
  const upper = slug.toUpperCase();
  if (STATE_NAMES[upper]) return upper;

  // Try full state name (e.g., "texas", "california", "new-york")
  const normalized = slug.replace(/-/g, ' ').toLowerCase();
  if (STATE_ABBR_FROM_NAME[normalized]) return STATE_ABBR_FROM_NAME[normalized];

  return null;
}

export function parseCityStateSlug(slug: string): { city: string; stateAbbr: string } | null {
  // Format: "houston-tx", "new-york-ny", "los-angeles-ca"
  const parts = slug.split('-');
  if (parts.length < 2) return null;

  const lastPart = parts[parts.length - 1].toUpperCase();
  if (STATE_NAMES[lastPart]) {
    const city = parts.slice(0, -1).join(' ');
    return { city, stateAbbr: lastPart };
  }

  return null;
}

export function toLocationSlug(city: string, state: string): string {
  return `${city.toLowerCase().replace(/\s+/g, '-')}-${state.toLowerCase()}`;
}

export function toStateSlug(stateAbbr: string): string {
  const name = STATE_NAMES[stateAbbr.toUpperCase()];
  if (!name) return stateAbbr.toLowerCase();
  return name.toLowerCase().replace(/\s+/g, '-');
}

export function generateInstallerJsonLd(installer: Installer) {
  const tier = getTier(installer.source);
  const rating = parseRating(installer.internal_notes);
  const capabilities = parseCapabilities(installer.install_capabilities);

  const schema: any = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `https://installers.vicrez.com/installer/${installer.slug || installer.id}`,
    name: installer.business_name,
    address: {
      '@type': 'PostalAddress',
      streetAddress: installer.street_address || undefined,
      addressLocality: installer.city,
      addressRegion: installer.state,
      postalCode: installer.zip_code,
      addressCountry: 'US',
    },
    ...(installer.phone && { telephone: installer.phone }),
    ...(installer.website && {
      url: installer.website.startsWith('http')
        ? installer.website
        : `https://${installer.website}`,
    }),
    ...(installer.lat && installer.lng && {
      geo: {
        '@type': 'GeoCoordinates',
        latitude: installer.lat,
        longitude: installer.lng,
      },
    }),
    ...(rating && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: rating,
        bestRating: 5,
        ratingCount: 1,
      },
    }),
    description: `Professional body kit and automotive customization installer in ${installer.city}, ${installer.state}. Services: ${capabilities.join(', ') || 'Body kits, wraps, performance modifications'}.`,
    priceRange: '$$',
    image: 'https://www.vicrez.com/image/catalog/vicrez-logo-white-web.png',
  };

  return schema;
}

export function generateFaqJsonLd(city?: string, state?: string) {
  const location = city && state ? `${city}, ${state}` : 'your area';
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How much does body kit installation cost?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Body kit installation costs in ${location} typically range from $500 to $5,000+, depending on the kit type. A simple lip kit installation may cost $200–$800, while a full widebody kit conversion with paint can run $3,000–$8,000+. Factors include kit complexity, paint matching, and labor rates in your area. Always get quotes from multiple installers before deciding.`,
        },
      },
      {
        '@type': 'Question',
        name: 'How long does body kit installation take?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Installation time varies by kit type. A basic lip kit or splitter can be installed in 2–4 hours. Full bumper replacements typically take 1–2 days. A complete widebody kit installation with prep, fitting, and paint can take 1–3 weeks. Your installer will provide a more accurate timeline based on your specific kit and vehicle.',
        },
      },
      {
        '@type': 'Question',
        name: 'How do I choose a body kit installer?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `When choosing a body kit installer in ${location}, look for: (1) experience with your specific vehicle make and model, (2) a portfolio of previous installations, (3) positive reviews from past customers, (4) proper insurance and certifications, (5) a clean, professional shop environment, (6) clear pricing with written estimates, and (7) a warranty on their work. Verified installers in the Vicrez directory have been confirmed through our dealer network.`,
        },
      },
    ],
  };
}

export function generateBreadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function generateArticleJsonLd(opts: {
  title: string;
  description: string;
  url: string;
  datePublished: string;
  dateModified: string;
  image?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: opts.title,
    description: opts.description,
    url: opts.url,
    datePublished: opts.datePublished,
    dateModified: opts.dateModified,
    author: {
      '@type': 'Organization',
      name: 'Vicrez',
      url: 'https://www.vicrez.com',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Vicrez',
      url: 'https://www.vicrez.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.vicrez.com/image/catalog/vicrez-logo-white-web.png',
      },
    },
    image: opts.image || 'https://www.vicrez.com/image/catalog/vicrez-logo-white-web.png',
    mainEntityOfPage: opts.url,
  };
}

export function generateOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Vicrez',
    url: 'https://www.vicrez.com',
    logo: 'https://www.vicrez.com/image/catalog/vicrez-logo-white-web.png',
    description: 'Premium automotive aftermarket parts. Body kits, carbon fiber accessories, custom steering wheels, and more.',
    sameAs: [
      'https://www.facebook.com/vicrez',
      'https://www.instagram.com/vicrez',
      'https://www.youtube.com/vicrez',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      url: 'https://www.vicrez.com/contact-us',
    },
  };
}
