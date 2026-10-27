import { queryInstallerBySlug } from "@/lib/db";
import { PILOT_CITIES, supportedPilotCities } from "@/lib/editorial-pilot";
import { reviewedProfile } from "@/lib/profile-indexing";

export default async function CityProjectBrief({ location }: { location: string }) {
  if (!Object.hasOwn(PILOT_CITIES, location)) return null;
  const content = PILOT_CITIES[location];
  const shop = await queryInstallerBySlug(content.shop);
  if (!shop || !supportedPilotCities([shop]).some(([slug]) => slug === location)) return null;
  const review = reviewedProfile(shop)!;
  return (
    <section className="mb-8 bg-vicrez-card border border-vicrez-border rounded-xl p-6" aria-labelledby="local-project-planning">
      <h2 id="local-project-planning" className="text-xl font-bold text-white mb-3">{content.title}</h2>
      <p className="text-gray-300 leading-relaxed mb-4">{content.context}</p>
      <ul className="list-disc pl-5 space-y-2 text-gray-300">
        {content.checks.map((check) => <li key={check}>{check}</li>)}
      </ul>
      <p className="mt-4"><a href={`/installer/${shop.slug}`} className="text-vicrez-red underline">Read {shop.business_name}'s services and project questions</a></p>
      <p className="text-sm text-vicrez-muted mt-3">Source: {review.sourceUrl ? <a href={review.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">{review.sourceLabel}</a> : review.sourceLabel}. Editorial review: October 27, 2026. Confirm current availability and acceptance of your parts with the business.</p>
      <a href="/guides/compare-installation-quotes" className="inline-block mt-4 text-vicrez-red underline">Compare written estimates using the same scope</a>
    </section>
  );
}
