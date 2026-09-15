"use client";
export default function OwnerDetailsFields({
  values,
  onChange,
}: {
  values: Record<string, any>;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <fieldset className="space-y-3 border rounded-xl p-4">
      <legend className="font-semibold px-1">Shop details (optional)</legend>
      <p className="text-sm text-gray-600">
        Tell us what your shop currently offers. These details stay private
        until ownership and publication are reviewed.
      </p>
      <label className="block text-sm">
        Customer-supplied parts
        <select
          className="input-field w-full mt-1"
          value={values.parts_policy || ""}
          onChange={(e) => onChange("parts_policy", e.target.value)}
        >
          <option value="">Not specified</option>
          <option value="accepts-customer-parts">
            Accepted, subject to project review
          </option>
          <option value="shop-supplied-only">Shop-supplied parts only</option>
          <option value="ask-shop">Ask us about your parts</option>
        </select>
      </label>
      {(
        [
          ["service_details", "Service details and limits", 1000],
          ["equipment", "Equipment and capabilities", 500],
          ["hours_note", "Business hours / appointment policy", 500],
        ] as const
      ).map(([key, label, max]) => (
        <label key={key} className="block text-sm">
          {label}
          <textarea
            className="input-field w-full mt-1"
            maxLength={max}
            value={values[key] || ""}
            onChange={(e) => onChange(key, e.target.value)}
          />
        </label>
      ))}
    </fieldset>
  );
}
