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
    description: `Professional aftermarket parts installation in ${installer.city}, ${installer.state}. Services may include: ${capabilities.join(', ') || 'body kits, bumpers, aero parts, wheels, tires, vinyl wrap, PPF, window tint, and exterior upgrades'}.`,
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
        name: `How much does it cost to install a body kit in ${location}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Body kit installation costs in ${location} vary depending on the kit type and complexity. A front lip or splitter install may run $200–$800, while a full bumper replacement typically costs $500–$1,500. Widebody kit conversions with paint matching can range from $3,000 to $8,000+. We recommend requesting quotes from multiple installers to compare pricing.`,
        },
      },
      {
        '@type': 'Question',
        name: `Do installers in ${location} install Vicrez bumpers and aero parts?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Many installers in ${location} can install Vicrez OE replacement bumpers, front lips, side skirts, rear diffusers, spoilers, and fender flares. Services may include test fitting, paint matching, and hardware installation. Depending on the shop, some may also handle grilles, hoods, fenders, and lighting upgrades.`,
        },
      },
      {
        '@type': 'Question',
        name: 'Can I ship Vicrez parts directly to an installer?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Yes, many installers accept direct shipments from Vicrez. You can order your parts at vicrez.com and have them shipped straight to the installation shop. Coordinate with the installer before placing your order so they can prepare for the installation and confirm lead times.`,
        },
      },
      {
        '@type': 'Question',
        name: 'Do installers offer wheel and tire mounting?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Many installers in ${location} offer wheel and tire services including mounting, balancing, TPMS sensor programming, and hub-centric ring installation. Mounting and balancing typically costs $25–$50 per wheel, while TPMS service adds $10–$25 per wheel. Some shops also handle alignment and offer package deals when combined with other installation services.`,
        },
      },
      {
        '@type': 'Question',
        name: `Do installers in ${location} install vinyl wrap and PPF?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Some installers in ${location} offer vinyl wrap installation, window tint, and paint protection film (PPF) services. Vinyl wraps can range from partial accents to full vehicle color changes. PPF provides a clear protective layer against rock chips and road debris. Services and pricing vary by shop, so reach out to individual installers for a custom quote.`,
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
    description: 'Premium automotive aftermarket parts including OE replacement bumpers, body kits, widebody kits, aero parts, fender flares, aftermarket wheels, VCORSA tires, vinyl wrap, paint protection film, window tint, and exterior styling accessories.',
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
