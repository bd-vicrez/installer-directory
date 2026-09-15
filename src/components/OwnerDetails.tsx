export default function OwnerDetails({
  details,
  confirmed,
}: {
  details: Record<string, any>;
  confirmed: string | null;
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
    ["Equipment", details.equipment],
    ["Hours / appointment policy", details.hours_note],
  ].filter(([, v]) => typeof v === "string" && v.trim());
  if (!fields.length) return null;
  return (
    <section className="border rounded-xl p-5 space-y-4 my-6">
      <h2 className="text-xl font-semibold">Details provided by the shop</h2>
      <p className="text-sm text-gray-600">
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
    </section>
  );
}
