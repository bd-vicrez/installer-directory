import { RECOVERY_LOCATIONS } from "@/lib/recovery-locations";
import { queryInstallerBySlug } from "@/lib/db";
import { reviewedProfile } from "@/lib/profile-indexing";
import { filterInstallersByCategory } from "@/lib/categories";

export default async function LocationProjectBrief({
  location,
  category,
}: {
  location: string;
  category: string;
}) {
  const entry = RECOVERY_LOCATIONS[`${location}/${category}`];
  if (!entry) return null;
  const shop = await queryInstallerBySlug(entry.shop);
  if (
    !shop ||
    !reviewedProfile(shop) ||
    !filterInstallersByCategory([shop], category).length
  )
    return null;
  return (
    <section
      className="mb-8 p-6 rounded-xl border border-vicrez-border bg-vicrez-card"
      aria-labelledby="local-project-brief"
    >
      <h2
        id="local-project-brief"
        className="text-xl font-bold text-white mb-3"
      >
        {entry.title}
      </h2>
      <p className="text-gray-300 mb-4 leading-relaxed">{entry.introduction}</p>
      <ul className="list-disc pl-5 space-y-2 text-gray-300">
        {entry.questions.map((q) => (
          <li key={q}>{q}</li>
        ))}
      </ul>
      <p className="mt-4 text-sm">
        <a
          className="text-vicrez-red underline"
          href={`/installer/${shop.slug}`}
        >
          Read {shop.business_name}’s profile and evidence source
        </a>
      </p>
      <p className="mt-3 text-sm text-vicrez-muted">
        This is a planning example from a reviewed record, not a ranking of the
        best shops. Confirm current services, supplied-parts policies and
        availability directly.
      </p>
      <a
        className="inline-block mt-4 text-vicrez-red underline"
        href="/guides/compare-installation-quotes"
      >
        Use the installation quote comparison worksheet
      </a>
    </section>
  );
}
