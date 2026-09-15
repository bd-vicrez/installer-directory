export const metadata = {
  title: "Vicrez directory administration",
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};
import AdminShell from "@/components/AdminShell";
export default function Layout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
