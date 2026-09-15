import { Metadata } from "next";
import { notFound } from "next/navigation";
import { CATEGORIES } from "@/lib/categories";
import {
  categoryPage,
  pageNumber,
  CATEGORY_PAGE_SIZE,
} from "@/lib/category-query";
import { normalizeService } from "@/lib/service-taxonomy";
import { generateItemListJsonLd } from "@/lib/seo";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumbs from "@/components/Breadcrumbs";
import InstallerCardStatic from "@/components/InstallerCardStatic";
export const dynamic = "force-dynamic";
type Props = {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ page?: string }>;
};
export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { category } = await params,
    c = CATEGORIES[category],
    page = pageNumber((await searchParams).page);
  return c
    ? {
        title: c.title + (page > 1 ? " — Page " + page : ""),
        description: c.description,
        alternates: {
          canonical:
            "/installers/category/" +
            category +
            (page > 1 ? "?page=" + page : ""),
        },
      }
    : { title: "Category not found" };
}
export default async function Page({ params, searchParams }: Props) {
  const { category } = await params,
    c = CATEGORIES[category];
  if (!c) notFound();
  const page = pageNumber((await searchParams).page),
    data = await categoryPage(category, page);
  if (page > data.pages) notFound();
  const path = "/installers/category/" + category;
  const schema = generateItemListJsonLd(
    data.rows.map((i) => ({
      name: i.business_name,
      url: "https://installers.vicrez.com/installer/" + i.slug,
    })),
    c.heading,
  );
  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8 w-full">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
          }}
        />
        <Breadcrumbs
          items={[
            { name: "Directory", href: "/directory" },
            { name: c.heading, href: path },
          ]}
        />
        <h1 className="text-3xl font-bold mb-4">{c.heading}</h1>
        <p className="max-w-3xl mb-5">{c.intro}</p>
        <form action="/" className="flex flex-wrap gap-3 mb-5">
          <input
            type="hidden"
            name="service"
            value={normalizeService(category)}
          />
          <label className="flex-1 min-w-48">
            ZIP or city and state
            <input
              required
              name="q"
              maxLength={120}
              className="input-field w-full"
              placeholder="ZIP or city, state"
            />
          </label>
          <button className="btn-primary self-end">Find nearby shops</button>
        </form>
        <p className="text-sm mb-6">
          {data.total
            ? `${(page - 1) * CATEGORY_PAGE_SIZE + 1}–${Math.min(page * CATEGORY_PAGE_SIZE, data.total)} of ${data.total}`
            : "No"}{" "}
          matching shops · Ordered by recorded Google review count, then listing
          ID.
        </p>
        <div className="flex flex-wrap gap-3 mb-6">
          {Object.entries(CATEGORIES).map(([slug, cat]) => (
            <a
              key={slug}
              className="text-sm underline"
              href={"/installers/category/" + slug}
            >
              {cat.shortLabel}
            </a>
          ))}
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.rows.map((i) => (
            <InstallerCardStatic key={i.id} installer={i} />
          ))}
        </div>
        {!data.total && (
          <p>No recorded matches yet. Try another service or location.</p>
        )}
        <nav
          aria-label="Category pages"
          className="flex gap-5 items-center justify-center py-8"
        >
          {page > 1 && (
            <a
              rel="prev"
              className="btn-secondary"
              href={path + (page > 2 ? "?page=" + (page - 1) : "")}
            >
              Previous
            </a>
          )}
          <span>
            Page {page} of {data.pages}
          </span>
          {page < data.pages && (
            <a
              rel="next"
              className="btn-secondary"
              href={path + "?page=" + (page + 1)}
            >
              Next
            </a>
          )}
        </nav>
      </main>
      <Footer />
    </>
  );
}
