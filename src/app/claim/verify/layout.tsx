export const metadata = {
  title: "Verify shop ownership | Vicrez Installer Network",
  robots: { index: false, follow: false },
  alternates: { canonical: null },
  referrer: "no-referrer",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return <main className="max-w-xl mx-auto px-4 py-12">{children}</main>;
}
