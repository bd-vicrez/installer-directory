export const dynamic = "force-dynamic";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import InstallerCardStatic from "@/components/InstallerCardStatic";
import Breadcrumbs from "@/components/Breadcrumbs";
import CtaBanner from "@/components/CtaBanner";
import CityQuoteButton from "@/components/CityQuoteButton";
import {
  parseCityStateSlug,
  stateAbbrFromSlug,
  STATE_NAMES,
  toLocationSlug,
  toStateSlug,
  generateInstallerJsonLd,
  generateFaqJsonLd,
  generateBreadcrumbJsonLd,
  generateItemListJsonLd,
} from "@/lib/seo";
import { queryCitySeoContent } from "@/lib/db";
import { Installer } from "@/lib/types";
import { locationPage, locationCities } from "@/lib/location-query";
import { pageNumber } from "@/lib/category-query";

interface PageProps {
  params: Promise<{ location: string }>;
  searchParams: Promise<{ page?: string }>;
}

const INSTALLERS_PER_PAGE = 24;

export async function generateMetadata({
  params: pendingParams,
  searchParams: pendingSearchParams,
}: PageProps): Promise<Metadata> {
  const params = await pendingParams;
  const searchParams = await pendingSearchParams;
  const currentPage = pageNumber(searchParams?.page);
  const data = await locationPage(params.location, currentPage);
  if (!data) return { title: "Location Not Found" };

  if (currentPage > data.pages) notFound();
  const pageSuffix = currentPage > 1 ? ` - Page ${currentPage}` : "";
  const canonicalPath = `/installers/${params.location}${currentPage > 1 ? `?page=${currentPage}` : ""}`;

  if (data.type === "city" && data.city) {
    const title = `Vicrez Installer Network in ${data.city}, ${data.stateAbbr}${pageSuffix} | Body Kits, Wheels, Tires, Vinyl & PPF`;
    return {
      title,
      description: `Browse listed installation shops in ${data.city}, ${data.stateAbbr} for body kits, bumpers, wheels, tires, vinyl wrap, PPF, and aftermarket parts installation. Request quotes today.`,
      openGraph: {
        title,
        description: `Browse listed installation shops in ${data.city}, ${data.stateAbbr} for body kits, bumpers, wheels, tires, vinyl wrap, PPF, and aftermarket parts installation.`,
        type: "website",
        url: `https://installers.vicrez.com${canonicalPath}`,
      },
      alternates: {
        canonical: `https://installers.vicrez.com${canonicalPath}`,
      },
      robots: currentPage > 1 ? { index: false, follow: true } : undefined,
    };
  }

  const stateTitle = `Vicrez Installer Network in ${data.stateName}${pageSuffix} | Body Kits, Wheels, Tires, Vinyl & PPF`;
  return {
    title: stateTitle,
    description: `Browse listed installation shops across ${data.stateName} for body kits, bumpers, wheels, tires, vinyl wrap, PPF, and aftermarket parts installation. Request quotes today.`,
    openGraph: {
      title: stateTitle,
      description: `Browse listed installation shops across ${data.stateName} for body kits, bumpers, wheels, tires, vinyl wrap, PPF, and aftermarket parts installation.`,
      type: "website",
      url: `https://installers.vicrez.com${canonicalPath}`,
    },
    alternates: {
      canonical: `https://installers.vicrez.com${canonicalPath}`,
    },
    robots: currentPage > 1 ? { index: false, follow: true } : undefined,
  };
}

export default async function LocationPage({
  params: pendingParams,
  searchParams: pendingSearchParams,
}: PageProps) {
  const params = await pendingParams;
  const searchParams = await pendingSearchParams;
  const currentPage = pageNumber(searchParams?.page);
  const data = await locationPage(params.location, currentPage);

  if (!data) {
    notFound();
  }

  if (currentPage > data.pages) notFound();
  const {
    type,
    city,
    stateAbbr,
    stateName,
    total: totalCount,
    recorded: verifiedCount,
    pages: totalPages,
    rows: pagedInstallers,
  } = data;
  const startIdx = (currentPage - 1) * INSTALLERS_PER_PAGE;
  const locationLabel =
    type === "city" && city ? `${city}, ${stateAbbr}` : stateName;
  const nearbyCities = await locationCities(
    stateAbbr,
    city,
    type === "city" ? 12 : 20,
  );

  // Pull unique AI-generated SEO content for this city (top ~450 cities pre-generated in city_seo table)
  let citySeo: {
    intro: string | null;
    local_scene: string | null;
    what_to_ask: string | null;
    cost_context: string | null;
  } | null = null;
  if (type === "city" && city) {
    try {
      citySeo = await queryCitySeoContent(city, stateAbbr);
    } catch {
      // ignore
    }
  }

  // Breadcrumbs
  const breadcrumbs = [
    { name: "Directory", href: "/directory" },
    ...(type === "city" && city
      ? [
          { name: stateName, href: `/installers/${toStateSlug(stateAbbr)}` },
          {
            name: `${city}, ${stateAbbr}`,
            href: `/installers/${params.location}`,
          },
        ]
      : [{ name: stateName, href: `/installers/${params.location}` }]),
  ];

  // Build JSON-LD (limit per-page to keep response small)
  const schemaSource = pagedInstallers.slice(0, 20);
  const installerSchemas = schemaSource.map((i: Installer) =>
    generateInstallerJsonLd(i),
  );
  const faqSchema = generateFaqJsonLd(city || undefined, stateName);
  const itemListSchema = generateItemListJsonLd(
    schemaSource.map((i: Installer) => ({
      name: i.business_name,
      url: `https://installers.vicrez.com/installer/${i.slug || i.id}`,
    })),
    type === "city"
      ? `Body Kit, Wheel, Tire & Wrap Installers in ${locationLabel}`
      : `Vicrez Installers in ${stateName}`,
  );
  const breadcrumbSchema = generateBreadcrumbJsonLd(
    breadcrumbs.map((b) => ({
      name: b.name,
      url: `https://installers.vicrez.com${b.href}`,
    })),
  );

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* JSON-LD */}
        {installerSchemas.map((schema: any, i: number) => (
          <script
            key={i}
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
            }}
          />
        ))}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(faqSchema).replace(/</g, "\\u003c"),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(itemListSchema).replace(/</g, "\\u003c"),
          }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs items={breadcrumbs} />

          {/* Hero section */}
          <div className="mb-10">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
              Body Kit, Wheel, Tire &amp; Wrap Installers in {locationLabel}
            </h1>
            <p className="text-sm text-vicrez-muted mb-3">
              {totalCount} {totalCount === 1 ? "shop" : "shops"} in the Vicrez
              Installer Network
              {verifiedCount > 0 ? ` · ${verifiedCount} Vicrez-recorded` : ""}
            </p>
            {citySeo?.intro && (
              <p className="text-base text-gray-300 max-w-3xl leading-relaxed mb-4">
                {citySeo.intro}
              </p>
            )}
            <p className="text-lg text-gray-300 max-w-3xl leading-relaxed">
              Browse listed shops in {locationLabel} for Vicrez aftermarket
              parts, OE replacement parts, body kits, aerodynamic upgrades,
              wheels, tires, vinyl wraps, paint protection film, and exterior
              styling accessories. Whether you need a bumper replacement,
              spoiler install, front lip install, widebody kit installation,
              wheel and tire package installation, or vehicle wrap service, the
              Vicrez Installer Network helps connect you with local shops near
              you.
              {verifiedCount > 0 &&
                ` ${verifiedCount} shops have business records held by Vicrez; this is not a workmanship certification.`}
            </p>
            <p className="text-gray-400 mt-3 max-w-3xl">
              Installers in {locationLabel} can assist with bumper installation,
              hood and fender replacement, widebody kits, front lips, side
              skirts, rear diffusers, spoilers, fender flares, wheel fitment,
              tire mounting, balancing, TPMS programming, vinyl wrap
              installation, window tint, and paint protection film. Compare
              installers, request quotes, and find a shop for your Vicrez parts
              and upgrades.
            </p>
          </div>

          {/* Local scene (AI-generated unique content for top cities) */}
          {citySeo?.local_scene && (
            <section className="mb-8 bg-vicrez-card border border-vicrez-border rounded-xl p-6">
              <h2 className="text-lg font-bold text-white mb-3">
                The {locationLabel} Aftermarket Scene
              </h2>
              <p className="text-sm text-gray-300 leading-relaxed">
                {citySeo.local_scene}
              </p>
            </section>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-vicrez-card border border-vicrez-border rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">{totalCount}</div>
              <div className="text-xs text-vicrez-muted mt-1">
                Total Installers
              </div>
            </div>
            <div className="bg-vicrez-card border border-vicrez-border rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-400">
                {verifiedCount}
              </div>
              <div className="text-xs text-vicrez-muted mt-1">
                Vicrez-recorded shops
              </div>
            </div>
            <div className="bg-vicrez-card border border-vicrez-border rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">
                {totalCount - verifiedCount}
              </div>
              <div className="text-xs text-vicrez-muted mt-1">Listed Shops</div>
            </div>
            <div className="bg-vicrez-card border border-vicrez-border rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-vicrez-red">Free</div>
              <div className="text-xs text-vicrez-muted mt-1">
                Quotes Available
              </div>
            </div>
          </div>

          {/* RFQ Quote CTA - city-page lead capture (Jun 25 2026) */}
          <CityQuoteButton locationLabel={locationLabel} variant="banner" />

          {/* CTA Banner */}
          <a
            href="https://www.vicrez.com"
            target="_blank"
            rel="noopener noreferrer"
            className="block mb-8 bg-gradient-to-r from-vicrez-red to-red-700 rounded-xl p-6 text-center hover:from-vicrez-red-dark hover:to-red-800 transition-all"
          >
            <p className="text-lg font-bold text-white">
              Shop Bumpers, Body Kits, Wheels, Tires, Vinyl Wrap & PPF at
              Vicrez.com
            </p>
            <p className="text-sm text-white/80 mt-1">
              OE replacement parts, widebody kits, aero parts, aftermarket
              wheels, VCORSA tires, vinyl wrap, PPF & more — shipped to your
              installer
            </p>
          </a>

          {/* Installer grid */}
          <h2 className="text-xl font-bold text-white mb-6">
            {type === "city"
              ? `All Installers in ${locationLabel}`
              : `Vicrez Installers Across ${stateName}`}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {pagedInstallers.map((installer: Installer) => (
              <InstallerCardStatic key={installer.id} installer={installer} />
            ))}
          </div>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <nav
              className="flex items-center justify-between mb-12 flex-wrap gap-3"
              aria-label="Pagination"
            >
              <div className="text-sm text-vicrez-muted">
                Showing {startIdx + 1}–
                {Math.min(startIdx + INSTALLERS_PER_PAGE, totalCount)} of{" "}
                {totalCount} installers
              </div>
              <div className="flex items-center gap-2">
                {currentPage > 1 && (
                  <a
                    href={`/installers/${params.location}${currentPage - 1 > 1 ? `?page=${currentPage - 1}` : ""}`}
                    className="px-3 py-2 rounded-lg bg-vicrez-card border border-vicrez-border text-sm text-white hover:border-vicrez-red/50 transition-colors"
                    rel="prev"
                  >
                    ← Previous
                  </a>
                )}
                <span className="px-3 py-2 text-sm text-vicrez-muted">
                  Page {currentPage} of {totalPages}
                </span>
                {currentPage < totalPages && (
                  <a
                    href={`/installers/${params.location}?page=${currentPage + 1}`}
                    className="px-3 py-2 rounded-lg bg-vicrez-red text-white text-sm font-medium hover:bg-red-700 transition-colors"
                    rel="next"
                  >
                    Next →
                  </a>
                )}
              </div>
            </nav>
          )}

          {/* Nearby cities / cross-linking */}
          {nearbyCities.length > 0 && (
            <section className="mb-12">
              <h2 className="text-xl font-bold text-white mb-4">
                {type === "city"
                  ? `Other Cities in ${stateName}`
                  : `Cities in ${stateName}`}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {nearbyCities.map((c: any) => (
                  <a
                    key={`${c.city}-${c.state}`}
                    href={`/installers/${toLocationSlug(c.city, c.state)}`}
                    className="bg-vicrez-card border border-vicrez-border rounded-lg p-3 hover:border-vicrez-red/30 transition-colors"
                  >
                    <span className="text-sm font-medium text-white">
                      {c.city}, {c.state}
                    </span>
                    <span className="text-xs text-vicrez-muted ml-2">
                      ({c.count})
                    </span>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Internal links */}
          <section className="mb-12 bg-vicrez-card border border-vicrez-border rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-3">
              Helpful Resources
            </h2>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="/guides/body-kit-installation-cost"
                  className="text-vicrez-red hover:underline"
                >
                  How Much Does Body Kit Installation Cost? (2026 Guide)
                </a>
              </li>
              <li>
                <a
                  href="/guides/widebody-kit-installation-guide"
                  className="text-vicrez-red hover:underline"
                >
                  Complete Widebody Kit Installation Guide
                </a>
              </li>
              <li>
                <a
                  href="/guides/how-to-choose-body-kit-installer"
                  className="text-vicrez-red hover:underline"
                >
                  How to Choose a Body Kit Installer: 7 Things to Look For
                </a>
              </li>
              <li>
                <a
                  href="/guides/wheel-and-tire-installation-guide"
                  className="text-vicrez-red hover:underline"
                >
                  Wheel & Tire Installation Guide: What to Know Before You Buy
                </a>
              </li>
              <li>
                <a
                  href="/directory"
                  className="text-vicrez-red hover:underline"
                >
                  Browse All States in the Installer Directory
                </a>
              </li>
            </ul>
          </section>

          {/* Services section */}
          <section className="mb-12">
            <h2 className="text-xl font-bold text-white mb-4">
              Services Vicrez Installers May Offer in {locationLabel}
            </h2>
            <div className="bg-vicrez-card border border-vicrez-border rounded-xl p-6">
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-300">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-vicrez-red flex-shrink-0" />
                  OE replacement part installation
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-vicrez-red flex-shrink-0" />
                  Body kit and widebody kit installation
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-vicrez-red flex-shrink-0" />
                  Front lip, side skirt, and rear diffuser installation
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-vicrez-red flex-shrink-0" />
                  Spoiler and aero part installation
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-vicrez-red flex-shrink-0" />
                  Fender flare installation
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-vicrez-red flex-shrink-0" />
                  Wheel and tire installation
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-vicrez-red flex-shrink-0" />
                  Tire mounting and balancing
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-vicrez-red flex-shrink-0" />
                  TPMS installation and programming
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-vicrez-red flex-shrink-0" />
                  Vinyl wrap installation
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-vicrez-red flex-shrink-0" />
                  Paint protection film (PPF) installation
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-vicrez-red flex-shrink-0" />
                  Window tint installation
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-vicrez-red flex-shrink-0" />
                  Exterior styling upgrades
                </li>
              </ul>
            </div>
          </section>

          {/* Popular parts section */}
          <section className="mb-12">
            <h2 className="text-xl font-bold text-white mb-4">
              Popular Vicrez Parts Installed in {locationLabel}
            </h2>
            <div className="bg-vicrez-card border border-vicrez-border rounded-xl p-6">
              <div className="flex flex-wrap gap-2">
                {[
                  "Front Bumpers",
                  "Rear Bumpers",
                  "Hoods",
                  "Fenders",
                  "Front Lips",
                  "Side Skirts",
                  "Rear Diffusers",
                  "Spoilers",
                  "Fender Flares",
                  "Widebody Kits",
                  "Wheels",
                  "Tires",
                  "Wheel & Tire Packages",
                  "Vinyl Wrap",
                  "Paint Protection Film",
                ].map((part) => (
                  <span
                    key={part}
                    className="px-3 py-1.5 rounded-full text-sm bg-vicrez-dark text-gray-300 border border-vicrez-border"
                  >
                    {part}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* Shop Vicrez Parts */}
          <section className="mb-12 bg-vicrez-card border border-vicrez-border rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">
              Shop Vicrez Parts
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {[
                {
                  label: "Shop OE Replacements",
                  href: "https://www.vicrez.com/vicrez-oe-replacements-parts-store",
                },
                {
                  label: "Shop Widebody Kits",
                  href: "https://www.vicrez.com/vicrez-widebody-kits",
                },
                {
                  label: "Shop Front Lips",
                  href: "https://www.vicrez.com/front-splitters",
                },
                {
                  label: "Shop Side Skirts",
                  href: "https://www.vicrez.com/front-splitters",
                },
                {
                  label: "Shop Rear Diffusers",
                  href: "https://www.vicrez.com/rear-diffusers",
                },
                {
                  label: "Shop Spoilers",
                  href: "https://www.vicrez.com/spoilers",
                },
                {
                  label: "Shop Fender Flares",
                  href: "https://www.vicrez.com/vicrez-widebody-kits",
                },
                {
                  label: "Shop Wheels",
                  href: "https://www.vicrez.com/custom-wheels",
                },
                {
                  label: "Shop Tires",
                  href: "https://www.vicrez.com/index.php?route=product/search&search=vcorsa",
                },
                {
                  label: "Shop Wheel & Tire Packages",
                  href: "https://www.vicrez.com/index.php?route=product/search&search=tire%20package",
                },
                {
                  label: "Shop Vinyl Wrap",
                  href: "https://www.vicrez.com/vicrez-vinyl-wrap",
                },
                {
                  label: "Shop Paint Protection Film",
                  href: "https://www.vicrez.com/vicrez-pre-cut-ppf",
                },
              ].map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-vicrez-red hover:underline"
                >
                  {link.label} &rarr;
                </a>
              ))}
            </div>
          </section>

          {/* What to ask (AI-generated) */}
          {citySeo?.what_to_ask && (
            <section className="mb-12 bg-vicrez-card border border-vicrez-border rounded-xl p-6">
              <h2 className="text-lg font-bold text-white mb-3">
                What to Ask an Installer in {locationLabel}
              </h2>
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
                {citySeo.what_to_ask}
              </p>
            </section>
          )}

          {/* Cost context (AI-generated) */}
          {citySeo?.cost_context && (
            <section className="mb-12 bg-vicrez-card border border-vicrez-border rounded-xl p-6">
              <h2 className="text-lg font-bold text-white mb-3">
                Installation Cost in {locationLabel}
              </h2>
              <p className="text-sm text-gray-300 leading-relaxed">
                {citySeo.cost_context}
              </p>
            </section>
          )}

          <section className="mb-12">
            <h2 className="text-xl font-bold text-white mb-6">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {faqSchema.mainEntity.map((item) => (
                <div
                  className="bg-vicrez-card border border-vicrez-border rounded-lg p-5"
                  key={item.name}
                >
                  <h3 className="font-semibold text-white mb-2">{item.name}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    {item.acceptedAnswer.text}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <CtaBanner />
      </main>
      <Footer />
    </>
  );
}
