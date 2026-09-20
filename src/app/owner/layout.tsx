export const metadata = {
  title: "Manage your shop | Vicrez Installer Network",
  robots: { index: false, follow: false },
  alternates: { canonical: null },
  referrer: "no-referrer",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="w-full min-w-0 max-w-4xl mx-auto px-4 py-12">
      <a href="/for-shops" className="inline-block underline text-sm mb-6">
        Vicrez Installer Network · For shops
      </a>
      {children}
    </main>
  );
}
