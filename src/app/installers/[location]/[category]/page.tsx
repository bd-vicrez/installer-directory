import LocationProjectBrief from "@/components/LocationProjectBrief";
import { pageNumber } from "@/lib/category-query";
export const dynamic = "force-dynamic";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import InstallerCardStatic from "@/components/InstallerCardStatic";
import Breadcrumbs from "@/components/Breadcrumbs";
import CtaBanner from "@/components/CtaBanner";
import {
  parseCityStateSlug,
  stateAbbrFromSlug,
  STATE_NAMES,
  toLocationSlug,
  toStateSlug,
  generateInstallerJsonLd,
  generateBreadcrumbJsonLd,
} from "@/lib/seo";
import { locationPage } from "@/lib/location-query";
import { Installer } from "@/lib/types";
import {
  CATEGORIES,
  CATEGORY_SLUGS,
  filterInstallersByCategory,
} from "@/lib/categories";

interface PageProps {
  params: Promise<{ location: string; category: string }>;
  searchParams: Promise<{ page?: string }>;
}

const PER_PAGE = 24;

export async function generateMetadata({
  params: pendingParams,
  searchParams,
}: PageProps): Promise<Metadata> {
  const params = await pendingParams;
  const currentPage = pageNumber((await searchParams).page);
  const data = await locationPage(
    params.location,
    currentPage,
    params.category,
  );
  if (!data) return { title: "Not Found" };
  if (currentPage > data.pages) notFound();
  const config = CATEGORIES[params.category];

  const locationLabel =
    data.type === "city" && data.city
      ? `${data.city}, ${data.stateAbbr}`
      : data.stateName;
  const title = `${config.shortLabel}s in ${locationLabel} | Vicrez Installer Directory`;
  const description = `Browse recorded ${config.shortLabel.toLowerCase()}s in ${locationLabel}. ${data.total} local shops for ${config.heading.toLowerCase()}. Compare reviews, get directions, and request quotes.`;
  const canonical = `https://installers.vicrez.com/installers/${params.location}/${params.category}${currentPage > 1 ? "?page=" + currentPage : ""}`;

  return {
    title,
    description,
    openGraph: { title, description, type: "website", url: canonical },
    alternates: { canonical },
    robots:
      currentPage > 1 || data.total === 0
        ? { index: false, follow: true }
        : undefined,
  };
}

export default async function LocationCategoryPage({
  params: pendingParams,
  searchParams,
}: PageProps) {
  const params = await pendingParams;
  const currentPage = pageNumber((await searchParams).page);
  const data = await locationPage(
    params.location,
    currentPage,
    params.category,
  );
  if (!data) notFound();

  const {
    type,
    city,
    stateAbbr,
    stateName,
    totalInLocation,
    total: totalCount,
    recorded: verifiedCount,
    pages,
    rows: paged,
  } = data;
  const config = CATEGORIES[params.category];
  const locationLabel =
    type === "city" && city ? `${city}, ${stateAbbr}` : stateName;
  if (currentPage > pages) notFound();

  // Build JSON-LD: top 10 + breadcrumb
  const installerSchemas = paged
    .slice(0, 10)
    .map((i) => generateInstallerJsonLd(i));
  const breadcrumbSchema = generateBreadcrumbJsonLd([
    { name: "Directory", url: "https://installers.vicrez.com/directory" },
    {
      name: stateName,
      url: `https://installers.vicrez.com/installers/${toStateSlug(stateAbbr)}`,
    },
    ...(type === "city" && city
      ? [
          {
            name: `${city}, ${stateAbbr}`,
            url: `https://installers.vicrez.com/installers/${params.location}`,
          },
        ]
      : []),
    {
      name: config.shortLabel,
      url: `https://installers.vicrez.com/installers/${params.location}/${params.category}`,
    },
  ]);

  const breadcrumbItems = [
    { name: "Directory", href: "/directory" },
    { name: stateName, href: `/installers/${toStateSlug(stateAbbr)}` },
    ...(type === "city" && city
      ? [
          {
            name: `${city}, ${stateAbbr}`,
            href: `/installers/${params.location}`,
          },
        ]
      : []),
    {
      name: config.shortLabel,
      href: `/installers/${params.location}/${params.category}`,
    },
  ];

  return (
    <>
      <Header />
      <main className="flex-1">
        {installerSchemas.map((schema, i) => (
          <script
            key={i}
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
            }}
          />
        ))}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs items={breadcrumbItems} />

          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
              {config.shortLabel}s in {locationLabel}
            </h1>
            <p className="text-lg text-gray-300 max-w-3xl leading-relaxed">
              {config.intro} Below are {totalCount}{" "}
              {config.shortLabel.toLowerCase()}s serving {locationLabel}
              {verifiedCount > 0 &&
                ` — including ${verifiedCount} with Vicrez business records`}
              .
            </p>
          </div>

          {currentPage === 1 && (
            <LocationProjectBrief
              location={params.location}
              category={params.category}
            />
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-vicrez-card border border-vicrez-border rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">{totalCount}</div>
              <div className="text-xs text-vicrez-muted mt-1">
                {config.shortLabel}s
              </div>
            </div>
            <div className="bg-vicrez-card border border-vicrez-border rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-400">
                {verifiedCount}
              </div>
              <div className="text-xs text-vicrez-muted mt-1">
                Vicrez-recorded
              </div>
            </div>
            <div className="bg-vicrez-card border border-vicrez-border rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">
                {totalInLocation}
              </div>
              <div className="text-xs text-vicrez-muted mt-1">
                Total Local Shops
              </div>
            </div>
            <div className="bg-vicrez-card border border-vicrez-border rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-vicrez-red">Free</div>
              <div className="text-xs text-vicrez-muted mt-1">
                Quotes Available
              </div>
            </div>
          </div>

          {/* CTA Banner */}
          <a
            href={`https://www.vicrez.com?utm_source=installers&utm_medium=combo_page&utm_campaign=${params.location}_${params.category}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block mb-8 bg-gradient-to-r from-vicrez-red to-red-700 rounded-xl p-6 text-center hover:from-vicrez-red-dark hover:to-red-800 transition-all"
          >
            <p className="text-lg font-bold text-white">
              Order Vicrez Parts → Ship Direct to Your Installer
            </p>
            <p className="text-sm text-white/80 mt-1">
              Body kits, wheels, tires, vinyl wrap, PPF & more delivered
              straight to a local {config.shortLabel.toLowerCase()} in{" "}
              {locationLabel}
            </p>
          </a>

          {totalCount === 0 ? (
            <div className="bg-vicrez-card border border-vicrez-border rounded-xl p-8 text-center mb-12">
              <h2 className="text-xl font-bold text-white mb-2">
                No {config.shortLabel}s indexed in {locationLabel} yet
              </h2>
              <p className="text-vicrez-muted mb-4">
                We're still growing our directory. Try browsing all installers
                in {locationLabel} or check a nearby city.
              </p>
              <a
                href={`/installers/${params.location}`}
                className="btn-primary inline-block"
              >
                View all installers in {locationLabel}
              </a>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-white mb-6">
                Listed {config.shortLabel}s in {locationLabel}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
                {paged.map((installer) => (
                  <InstallerCardStatic
                    key={installer.id}
                    installer={installer}
                  />
                ))}
              </div>
              {totalCount > PER_PAGE && (
                <div className="mb-12 text-center">
                  <a
                    href={`/installers/${params.location}`}
                    className="text-sm text-vicrez-red hover:underline"
                  >
                    Browse all services in {locationLabel} →
                  </a>
                </div>
              )}
            </>
          )}

          {/* Cross-link to other services in this city */}
          <section className="mb-12">
            <h2 className="text-xl font-bold text-white mb-4">
              Other Services in {locationLabel}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {CATEGORY_SLUGS.filter((s) => s !== params.category).map(
                (slug) => (
                  <a
                    key={slug}
                    href={`/installers/${params.location}/${slug}`}
                    className="bg-vicrez-card border border-vicrez-border rounded-lg p-3 hover:border-vicrez-red/30 transition-colors block"
                  >
                    <span className="text-sm font-medium text-white">
                      {CATEGORIES[slug].shortLabel}s
                    </span>
                    <span className="block text-xs text-vicrez-muted mt-1">
                      in {locationLabel}
                    </span>
                  </a>
                ),
              )}
            </div>
          </section>

          {/* Vicrez parts CTA */}
          <section className="mb-12 bg-vicrez-card border border-vicrez-border rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">
              Shop Vicrez Parts
            </h2>
            <p className="text-sm text-vicrez-muted mb-4">
              Order online and have your parts shipped directly to a{" "}
              {config.shortLabel.toLowerCase()} in {locationLabel}.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {[
                {
                  label: "OE Replacements",
                  href: "https://www.vicrez.com/vicrez-oe-replacements-parts-store",
                },
                {
                  label: "Widebody Kits",
                  href: "https://www.vicrez.com/vicrez-widebody-kits",
                },
                {
                  label: "Front Lips",
                  href: "https://www.vicrez.com/front-splitters",
                },
                {
                  label: "Rear Diffusers",
                  href: "https://www.vicrez.com/rear-diffusers",
                },
                { label: "Spoilers", href: "https://www.vicrez.com/spoilers" },
                {
                  label: "Wheels",
                  href: "https://www.vicrez.com/custom-wheels",
                },
                {
                  label: "Vinyl Wrap",
                  href: "https://www.vicrez.com/vicrez-vinyl-wrap",
                },
                {
                  label: "PPF",
                  href: "https://www.vicrez.com/vicrez-pre-cut-ppf",
                },
              ].map((link) => (
                <a
                  key={link.label}
                  href={`${link.href}?utm_source=installers&utm_medium=combo_page&utm_campaign=${params.location}_${params.category}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-vicrez-red hover:underline"
                >
                  Shop {link.label} →
                </a>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section className="mb-12">
            <h2 className="text-xl font-bold text-white mb-6">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              <div className="bg-vicrez-card border border-vicrez-border rounded-lg p-5">
                <h3 className="font-semibold text-white mb-2">
                  How do I find a {config.shortLabel.toLowerCase()} in{" "}
                  {locationLabel}?
                </h3>
                <p className="text-sm text-gray-400">
                  Browse recorded services in the Vicrez Installer Network for{" "}
                  {locationLabel}. Each shop listing includes contact info,
                  hours, recorded Google ratings, and directions. Confirm
                  current services, parts acceptance and availability with the
                  shop.
                </p>
              </div>
              <div className="bg-vicrez-card border border-vicrez-border rounded-lg p-5">
                <h3 className="font-semibold text-white mb-2">
                  Can I send Vicrez parts directly to an installer in{" "}
                  {locationLabel}?
                </h3>
                <p className="text-sm text-gray-400">
                  Yes. Place your order at vicrez.com and ship straight to the
                  installation shop. Coordinate with the shop first to confirm
                  they can receive your parts and schedule your install.
                </p>
              </div>
              <div className="bg-vicrez-card border border-vicrez-border rounded-lg p-5">
                <h3 className="font-semibold text-white mb-2">
                  What does &quot;Vicrez-recorded shop&quot; mean?
                </h3>
                <p className="text-sm text-gray-400">
                  The badge identifies a business source record held by Vicrez.
                  It does not certify workmanship, insurance, current dealer
                  membership or experience with your parts. Other listings use
                  publicly available information.
                </p>
              </div>
            </div>
          </section>
        </div>

        <nav
          aria-label="Service pages"
          className="flex justify-center items-center gap-4 py-8"
        >
          {currentPage > 1 && (
            <a className="btn-secondary" href={"?page=" + (currentPage - 1)}>
              Previous
            </a>
          )}
          <span>
            Page {currentPage} of {pages}
          </span>
          {currentPage < pages && (
            <a className="btn-secondary" href={"?page=" + (currentPage + 1)}>
              Next
            </a>
          )}
        </nav>
        <CtaBanner />
      </main>
      <Footer />
    </>
  );
}
