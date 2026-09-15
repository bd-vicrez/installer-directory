import Header from "@/components/Header";
import Footer from "@/components/Footer";
export const metadata = {
  title: "How to find and contact an installer",
  alternates: { canonical: "/how-it-works" },
};
export default function Page() {
  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-12 space-y-6">
        <h1 className="text-3xl font-bold">
          Find the right shop for your project
        </h1>
        <ol className="list-decimal pl-6 space-y-5">
          <li>
            <strong>Search your location and service.</strong> Use a ZIP or city
            and state. Radius is geographic distance. Choose nearest-first or
            browse Vicrez-recorded shops first.
          </li>
          <li>
            <strong>Compare the details.</strong> Check recorded services,
            address, Google rating and contact options. Ask about
            customer-supplied parts, equipment limits and the specific job.
            Unknown information means it has not been confirmed.
          </li>
          <li>
            <strong>Contact the shop.</strong> If online inquiry is available,
            the shop-specific request goes only to that shop. Network requests
            look for up to three eligible matching shops within 100 miles of
            your ZIP. A saved request does not mean the shop has replied or
            accepted the project.
          </li>
          <li>
            <strong>Confirm before scheduling.</strong> Agree on fitment, parts,
            labor, paint, timeline and price with the shop. A directory inquiry
            is not a booking or a binding installed-price quote.
          </li>
        </ol>
        <a href="/" className="btn-primary inline-block">
          Find an installer
        </a>
        <p>
          <a href="/how-verification-works" className="underline">
            What our listing labels mean
          </a>{" "}
          ·{" "}
          <a href="/for-shops" className="underline">
            Information for shop owners
          </a>
        </p>
      </main>
      <Footer />
    </>
  );
}
