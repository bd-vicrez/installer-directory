import { PLANNING_GUIDES } from "@/lib/planning-guides";

export default function PlanningGuide({ slug }: { slug: string }) {
  const guide = PLANNING_GUIDES[slug];
  return (
    <article>
      <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
        {guide.title}
      </h1>
      <p className="text-lg text-gray-300 mb-3">{guide.description}</p>
      <p className="text-sm text-vicrez-muted mb-8">
        Vicrez Installer Directory · Published September 21, 2026 ·
        Project-planning checklist
      </p>
      {guide.sections.map((section) => (
        <section className="mb-8" key={section.title}>
          <h2 className="text-2xl font-bold text-white mb-3">
            {section.title}
          </h2>
          {section.paragraphs?.map((p) => (
            <p key={p} className="text-gray-300 leading-relaxed mb-4">
              {p}
            </p>
          ))}
          {section.items && (
            <ul className="list-disc pl-5 text-gray-300 space-y-3">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
      <section className="mb-8 border border-vicrez-border rounded-xl p-5">
        <h2 className="text-2xl font-bold text-white mb-3">
          Your project worksheet
        </h2>
        <p className="text-gray-300 mb-4">
          Copy these fields into your notes and fill them in with the shop’s
          answers.
        </p>
        <dl className="space-y-4">
          {guide.worksheet.map((row) => (
            <div key={row.field}>
              <dt className="font-semibold text-white">{row.field}</dt>
              <dd className="text-gray-300 mt-1">{row.detail}</dd>
            </div>
          ))}
        </dl>
      </section>
      <nav aria-label="Related project checklists" className="space-y-3 mb-8">
        {Object.entries(PLANNING_GUIDES)
          .filter(([key]) => key !== slug)
          .map(([key, g]) => (
            <a
              className="block text-vicrez-red underline"
              key={key}
              href={`/guides/${key}`}
            >
              {g.title}
            </a>
          ))}
      </nav>
      <p className="text-sm text-vicrez-muted">
        These are planning questions, not vehicle-specific installation
        instructions or quoted shop policies. Use the instructions for the
        actual vehicle and parts, and obtain the shop’s agreement for your
        project.
      </p>
    </article>
  );
}
