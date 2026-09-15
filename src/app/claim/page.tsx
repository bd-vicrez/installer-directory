import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ClaimForm from "@/components/ClaimForm";
import { getPool } from "@/lib/db";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Claim or update your shop listing",
  alternates: { canonical: "/claim" },
  robots: { index: false, follow: true },
};
export default async function ClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ shop?: string }>;
}) {
  const { shop } = await searchParams;
  const listing =
    shop && shop.length < 100
      ? (
          await getPool().query(
            "SELECT id,business_name FROM installers WHERE id=$1 AND status NOT IN ('removed','non_us_excluded')",
            [shop],
          )
        ).rows[0]
      : null;
  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-10 w-full">
        <h1 className="text-3xl font-bold mb-6">Claim or update a listing</h1>
        {listing ? (
          <ClaimForm shop={listing} />
        ) : (
          <div className="space-y-4">
            <p>
              Find your shop in the directory, then select “Claim or update this
              listing” to attach your request to the correct business.
            </p>
            <a className="btn-primary inline-block" href="/">
              Find your listing
            </a>
            <p>
              Not listed yet?{" "}
              <a className="underline" href="/apply">
                List your shop
              </a>
              .
            </p>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
