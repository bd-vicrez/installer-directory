import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Private inquiry progress | Vicrez",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="w-full max-w-3xl mx-auto px-4 py-10 text-gray-900">
      {children}
    </main>
  );
}
