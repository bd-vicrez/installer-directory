"use client";
import { QUOTE_SERVICES } from "@/lib/quote-services";

interface FiltersProps {
  sort: string;
  inquiry: string;
  onSortChange: (s: string) => void;
  onInquiryChange: (s: string) => void;
  capabilityFilter: string;
  tierFilter: string;
  onCapabilityChange: (cap: string) => void;
  onTierChange: (tier: string) => void;
  radiusFilter: number;
  onRadiusChange: (r: number) => void;
}

const CAPABILITIES = QUOTE_SERVICES.filter((s) => s.id !== "other");
const RADII = [10, 25, 50, 100, 250];

export default function Filters({
  sort,
  inquiry,
  onSortChange,
  onInquiryChange,
  capabilityFilter,
  tierFilter,
  onCapabilityChange,
  onTierChange,
  radiusFilter,
  onRadiusChange,
}: FiltersProps) {
  return (
    <div className="bg-vicrez-card border border-vicrez-border rounded-xl p-4 md:p-6 mb-8">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        {/* Capability filter */}
        <div className="flex-1">
          <label className="block text-xs font-medium text-vicrez-muted mb-2 uppercase tracking-wider">
            Specialty
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              aria-pressed={capabilityFilter === ""}
              onClick={() => onCapabilityChange("")}
              className={`text-sm px-3 py-1.5 rounded-full border transition-all ${
                capabilityFilter === ""
                  ? "bg-vicrez-red border-vicrez-red text-white"
                  : "border-vicrez-border text-vicrez-muted hover:border-vicrez-muted"
              }`}
            >
              All
            </button>
            {CAPABILITIES.map((cap) => (
              <button
                key={cap.id}
                aria-pressed={capabilityFilter === cap.id}
                onClick={() =>
                  onCapabilityChange(cap.id === capabilityFilter ? "" : cap.id)
                }
                className={`text-sm px-3 py-1.5 rounded-full border transition-all ${
                  capabilityFilter === cap.id
                    ? "bg-vicrez-red border-vicrez-red text-white"
                    : "border-vicrez-border text-vicrez-muted hover:border-vicrez-muted"
                }`}
              >
                {cap.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tier filter */}
        <div>
          <label className="block text-xs font-medium text-vicrez-muted mb-2 uppercase tracking-wider">
            Type
          </label>
          <select
            aria-label="Listing type"
            value={tierFilter}
            onChange={(e) => onTierChange(e.target.value)}
            className="input-field text-sm !py-2"
          >
            <option value="">Show All</option>
            <option value="verified">Vicrez records</option>
          </select>
        </div>

        {/* Radius filter */}
        <div>
          <label className="block text-xs font-medium text-vicrez-muted mb-2 uppercase tracking-wider">
            Radius
          </label>
          <select
            aria-label="Search radius"
            value={radiusFilter}
            onChange={(e) => onRadiusChange(Number(e.target.value))}
            className="input-field text-sm !py-2"
          >
            {RADII.map((r) => (
              <option key={r} value={r}>
                {r} miles
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4 mt-5">
        <label className="text-sm">
          Sort by{" "}
          <select
            className="input-field ml-2"
            value={sort}
            onChange={(e) => onSortChange(e.target.value)}
          >
            <option value="recommended">Vicrez records, then distance</option>
            <option value="nearest">Nearest first</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={inquiry === "1"}
            onChange={(e) => onInquiryChange(e.target.checked ? "1" : "")}
          />
          Online inquiry available
        </label>
      </div>
      <p className="text-xs text-gray-600 mt-3">
        Service filters use recorded capabilities. Default ordering places
        Vicrez-recorded shops first, then geographic distance. Radius is
        straight-line distance, not driving time. Inquiry availability does not
        guarantee an appointment.
      </p>
    </div>
  );
}
