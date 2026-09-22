import { Installer } from "./types";
import { getTier, parseRating, parseCapabilities, formatPhone } from "./utils";
import { getProfileDescription } from "./profile-content";

export {
  STATE_NAMES,
  stateAbbrFromSlug,
  parseCityStateSlug,
  toLocationSlug,
  toStateSlug,
} from "./locations";

export function generateInstallerJsonLd(installer: Installer) {
  const phone = installer.phone || installer.google_phone;
  const website = installer.website || installer.google_website;
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `https://installers.vicrez.com/installer/${installer.slug || installer.id}`,
    name: installer.business_name,
    address: {
      "@type": "PostalAddress",
      streetAddress: installer.street_address || undefined,
      addressLocality: installer.city,
      addressRegion: installer.state,
      postalCode: installer.zip_code,
      addressCountry: "US",
    },
    ...(phone && { telephone: phone }),
    ...(website && {
      url: website.startsWith("http") ? website : `https://${website}`,
    }),
    ...(installer.lat &&
      installer.lng && {
        geo: {
          "@type": "GeoCoordinates",
          latitude: installer.lat,
          longitude: installer.lng,
        },
      }),
    // Google-sourced ratings remain visible but are not our own collected reviews.
    // Do not republish them as review rich-result markup.
    description: getProfileDescription(installer),
  };
}

export function generateFaqJsonLd(city?: string, state?: string) {
  const location = [city, state].filter(Boolean).join(", ") || "your area";
  const questions = [
    {
      question: `How do I get an installation quote in ${location}?`,
      answer:
        "Send the shop your vehicle year, make, model and trim, exact part numbers and photos of the current condition. Ask for a written scope that separates preparation, fitting, finishing and any excluded work. This directory does not publish a verified local labor-rate average.",
    },
    {
      question: "Does a listing prove experience with my Vicrez parts?",
      answer:
        "No. Recorded services are a starting point for finding shops. Ask whether the shop accepts your exact vehicle and parts, and request an example of comparable completed work. A Vicrez business record does not certify workmanship or kit-specific experience.",
    },
    {
      question: "Can I ship parts directly to a shop?",
      answer:
        "Obtain the shop’s agreement before sending parts. Confirm the receiving address, contact person, delivery hours, storage arrangements and how damaged or missing items will be handled. A directory listing is not permission to ship a package.",
    },
    {
      question: "How should I compare shops?",
      answer:
        "Give each shop the same vehicle and parts brief. Compare the included work, exclusions, materials, supplied-parts policy, schedule and written terms. Confirm current services and availability directly with the shop.",
    },
  ];
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map((q) => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: { "@type": "Answer", text: q.answer },
    })),
  };
}

export function generateBreadcrumbJsonLd(
  items: { name: string; url: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function generateItemListJsonLd(
  items: { name: string; url: string }[],
  listName?: string,
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    ...(listName && { name: listName }),
    numberOfItems: items.length,
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      url: item.url,
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
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.title,
    description: opts.description,
    url: opts.url,
    datePublished: opts.datePublished,
    dateModified: opts.dateModified,
    author: {
      "@type": "Organization",
      name: "Vicrez",
      url: "https://www.vicrez.com",
    },
    publisher: {
      "@type": "Organization",
      name: "Vicrez",
      url: "https://www.vicrez.com",
      logo: {
        "@type": "ImageObject",
        url: "https://d19eqr9piwa4et.cloudfront.net/catalog/vicrez-logo-white-web.png",
      },
    },
    image:
      opts.image ||
      "https://d19eqr9piwa4et.cloudfront.net/catalog/vicrez-logo-white-web.png",
    mainEntityOfPage: opts.url,
  };
}

export function generateOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Vicrez",
    url: "https://www.vicrez.com",
    logo: "https://d19eqr9piwa4et.cloudfront.net/catalog/vicrez-logo-white-web.png",
    description:
      "Premium automotive aftermarket parts including OE replacement bumpers, body kits, widebody kits, aero parts, fender flares, aftermarket wheels, VCORSA tires, vinyl wrap, paint protection film, window tint, and exterior styling accessories.",
    sameAs: [
      "https://www.facebook.com/vicrez",
      "https://www.instagram.com/vicrez",
      "https://www.youtube.com/vicrez",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      url: "https://www.vicrez.com/contact-us",
    },
  };
}
