import Header from "@/components/Header";
import Footer from "@/components/Footer";
export const metadata = {
  title: "For tire shops, body shops and installers",
  alternates: { canonical: "/for-shops" },
};
export default function Page() {
  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-12 space-y-8">
        <h1 className="text-3xl font-bold">Grow your shop’s presence</h1>
        <p>
          Choose the right path for your tire shop, body shop, wrap studio or
          installation business.
        </p>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            [
              "List your shop",
              "Apply for a directory listing. You can separately opt in to receive relevant inquiries after contact review.",
              "/apply",
              "Start an application",
            ],
            [
              "Claim or update a listing",
              "Correct an existing listing, declare your services or submit shop details. We review ownership before publication.",
              "/claim",
              "Find your listing",
            ],
            [
              "Wholesale dealer program",
              "Explore parts purchasing and stocking-order benefits through Vicrez B2B. Membership is separate from directory ownership.",
              "https://b2b.vicrez.com/",
              "Explore wholesale",
            ],
          ].map(([title, copy, href, label]) => (
            <section className="border rounded-xl p-6 space-y-4" key={title}>
              <h2 className="text-xl font-semibold">{title}</h2>
              <p>{copy}</p>
              <a className="underline font-semibold" href={href}>
                {label}
              </a>
            </section>
          ))}
        </div>
        <p className="text-sm">
          Service and equipment details are shop-provided. Directory inclusion
          does not certify workmanship or guarantee jobs. Already submitted? Use
          the private status link on your receipt.
        </p>
      </main>
      <Footer />
    </>
  );
}
