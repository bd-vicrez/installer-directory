"use client";
const fields = [
  ["product_url", "Vicrez product link", 500],
  ["sku", "Part number / SKU", 80],
  ["parts_owned", "Parts you already own", 200],
  ["wheel_size", "Wheel size, width and offset", 80],
  ["tire_size", "Tire size", 80],
  ["fitment_notes", "Fitment / modification details", 300],
  ["installation_requirements", "Installation requirements", 600],
] as const;
export default function ProjectBriefFields({
  value,
  onChange,
  service,
}: {
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
  service?: string;
}) {
  return (
    <fieldset className="min-w-0 space-y-3 border rounded-xl p-4">
      <legend className="font-semibold px-1">Project details (optional)</legend>
      <p className="text-sm">
        Help the shop assess the work. Measurements are provided by you; the
        shop must confirm fitment. You can add private photos after saving your
        request.
      </p>
      {fields
        .filter(
          ([key]) =>
            service === "wheels-tires" ||
            !["wheel_size", "tire_size"].includes(key),
        )
        .map(([key, label, max]) => (
          <label className="block text-sm" key={key}>
            {label}
            <textarea
              rows={key === "installation_requirements" ? 3 : 1}
              maxLength={max}
              className="input-field w-full block mt-1"
              value={value[key] || ""}
              onChange={(e) => onChange({ ...value, [key]: e.target.value })}
            />
          </label>
        ))}
    </fieldset>
  );
}
