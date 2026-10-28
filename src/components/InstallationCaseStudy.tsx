import { INSTALLATION_CASE_STUDIES } from "@/lib/installation-case-studies";

export default function InstallationCaseStudy({ slug }: { slug: string }) {
  const study = INSTALLATION_CASE_STUDIES[slug];
  const video = `https://www.youtube.com/watch?v=${study.videoId}`;
  return (
    <article className="space-y-8 text-gray-300 leading-relaxed">
      <header className="space-y-4">
        <p className="text-sm font-semibold text-vicrez-red">Vicrez installation case study</p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white">{study.title}</h1>
        <p className="text-lg">{study.introduction}</p>
        <p className="text-sm text-vicrez-muted">By Vicrez Installer Network · Reviewed October 28, 2026</p>
      </header>
      <section className="rounded-xl border border-vicrez-border bg-vicrez-card p-6 space-y-3">
        <h2 className="text-xl font-bold text-white">Watch the original installation</h2>
        <p>Published by vicrez.com on {study.videoPublished}. Each observation below links to its source moment.</p>
        <a className="inline-block underline font-semibold text-white" href={video}>Watch on YouTube →</a>
      </section>
      <section className="space-y-3">
        <h2 className="text-2xl font-bold text-white">The recorded project</h2>
        <p>{study.scope}</p>
      </section>
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-white">What to carry into your installation brief</h2>
        {study.observations.map((item) => (
          <section key={item.seconds} className="border-l-2 border-vicrez-red pl-5 space-y-3">
            <h3 className="text-xl font-semibold text-white">{item.heading}</h3>
            <a className="text-sm underline" href={`${video}&t=${item.seconds}s`}>Source video at {item.time}</a>
            <p>{item.evidence}</p>
            <p><strong className="text-white">Ask your installer: </strong>{item.question}</p>
          </section>
        ))}
      </section>
      <section className="space-y-3">
        <h2 className="text-2xl font-bold text-white">Documented outcome</h2>
        <p>{study.outcome}</p>
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-white">Evidence and scope</h2>
        <p>{study.limits}</p>
        <p>This is a planning reference. Your installer should use current product instructions and vehicle-specific service information for the work.</p>
      </section>
      <section className="rounded-xl bg-vicrez-card border border-vicrez-border p-6 space-y-3">
        <h2 className="text-xl font-bold text-white">Build a comparable written estimate</h2>
        <p>Record the exact parts, preparation, finish, transferred hardware and handover checks so every shop is quoting the same job.</p>
        <p><a className="underline" href="/guides/customer-supplied-parts-installation">Prepare your parts and installation brief</a> · <a className="underline" href="/guides/compare-installation-quotes">Download the quote-comparison worksheet</a></p>
      </section>
    </article>
  );
}
