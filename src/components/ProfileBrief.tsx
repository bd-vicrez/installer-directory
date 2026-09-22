import { Installer } from "@/lib/types";
import { reviewedProfile } from "@/lib/profile-indexing";
import { RECOVERY_LOCATIONS } from "@/lib/recovery-locations";

export default function ProfileBrief({ installer }: { installer: Installer }) {
  const brief = reviewedProfile(installer);
  if (!brief) return null;
  const local = Object.entries(RECOVERY_LOCATIONS).find(
    ([, entry]) => entry.shop === installer.slug,
  );
  return (
    <section
      className="mb-8 bg-vicrez-card border border-vicrez-border rounded-xl p-6"
      aria-labelledby="project-planning"
    >
      <h2 id="project-planning" className="text-xl font-bold text-white mb-3">
        Plan a project with {installer.business_name}
      </h2>
      <p className="text-gray-300 leading-relaxed mb-4">{brief.summary}</p>
      <h3 className="font-semibold text-white mb-2">Questions for this shop</h3>
      <ul className="list-disc pl-5 space-y-2 text-gray-300">
        {brief.questions.map((q) => (
          <li key={q}>{q}</li>
        ))}
      </ul>
      <div className="mt-4 space-y-2 text-sm">
        <a
          className="block text-vicrez-red underline"
          href="/guides/customer-supplied-parts-installation"
        >
          Agree on customer-supplied parts before ordering
        </a>
        {local && (
          <a
            className="block text-vicrez-red underline"
            href={`/installers/${local[0]}`}
          >
            {local[1].title}
          </a>
        )}
      </div>
      <p className="text-sm text-vicrez-muted mt-4">
        Source:{" "}
        {brief.sourceUrl ? (
          <a
            className="text-vicrez-red underline"
            href={brief.sourceUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            {brief.sourceLabel}
          </a>
        ) : (
          brief.sourceLabel
        )}
        . Reviewed September 21, 2026.
      </p>
      <p className="text-sm text-vicrez-muted mt-2">
        Confirm current services, customer-supplied parts and availability with
        the shop. This editorial review is not an owner reconfirmation or a
        certification of workmanship.
      </p>
    </section>
  );
}
