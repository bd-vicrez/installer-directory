export default function OwnerDetails({
  details,
  confirmed,
  photos = [],
}: {
  details: Record<string, any>;
  confirmed: string | null;
  photos?: { id: string; caption: string; width: number; height: number }[];
}) {
  if (!confirmed) return null;
  const policy: Record<string, string> = {
    "accepts-customer-parts":
      "Customer-supplied parts accepted, subject to project review",
    "shop-supplied-only": "Shop-supplied parts only",
    "ask-shop": "Ask the shop about your parts",
  };
  const fields = [
    ["Customer-supplied parts", policy[details.parts_policy]],
    ["Services and limits", details.service_details],
    [
      "Vehicle specialties",
      details.vehicle_specialties || details.vehicle_brands,
    ],
    ["Tire and wheel limits", details.tire_limits],
    ["Body and paint capabilities", details.body_capabilities],
    ["Wrap and PPF materials", details.wrap_materials],
    ["Equipment", details.equipment],
    ["Hours / appointment policy", details.hours_note],
  ].filter(([, v]) => typeof v === "string" && v.trim());
  if (!fields.length && !photos.length) return null;
  const projects = Array.isArray(details.projects)
    ? details.projects.filter((p: any) =>
        photos.some((photo) => photo.id === p.photo_id),
      )
    : [];
  return (
    <section className="border rounded-xl p-5 space-y-4 my-6">
      <h2 className="text-xl font-semibold">Details provided by the shop</h2>
      <p className="text-sm text-gray-500">
        Ownership and publication reviewed{" "}
        {new Date(confirmed).toLocaleDateString("en-US", { timeZone: "UTC" })}.
        Capabilities are self-declared. Confirm your project and current
        availability directly.
      </p>
      <dl className="space-y-3">
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt className="font-semibold">{label}</dt>
            <dd className="whitespace-pre-wrap">{value}</dd>
          </div>
        ))}
      </dl>
      {!!projects.length && (
        <section className="space-y-4">
          <h3 className="text-xl font-semibold">
            Completed projects reported by this shop
          </h3>
          <p className="text-sm">
            Reviewed for publication. These examples describe the shop’s own
            work; confirm suitability for your vehicle directly.
          </p>
          {projects.map((p: any, i: number) => (
            <article className="border rounded-lg p-4 space-y-2" key={i}>
              <h4 className="font-semibold">
                {p.vehicle} · {p.service.replaceAll("-", " ")}
              </h4>
              <p>Completed {p.completed_month}</p>
              <p className="whitespace-pre-wrap">{p.summary}</p>
              {p.parts && <p>Parts / products: {p.parts}</p>}
              <img
                src={"/api/shop-photos/" + p.photo_id}
                alt={
                  p.vehicle +
                  " — " +
                  p.service.replaceAll("-", " ") +
                  " project"
                }
                loading="lazy"
                className="w-full max-h-80 object-contain rounded"
              />
            </article>
          ))}
        </section>
      )}
      {!!photos.length && (
        <div>
          <h3 className="font-semibold text-lg mb-3">Shop project gallery</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {photos.map((photo) => (
              <figure key={photo.id}>
                <img
                  src={"/api/shop-photos/" + photo.id}
                  alt={photo.caption}
                  width={photo.width}
                  height={photo.height}
                  loading="lazy"
                  className="w-full h-56 object-contain rounded-lg bg-gray-50"
                />
                <figcaption className="text-sm mt-2">
                  {photo.caption}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
