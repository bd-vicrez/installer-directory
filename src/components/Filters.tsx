"use client";
interface Props {
  sort: string;
  inquiry: string;
  capabilityFilter: string;
  tierFilter: string;
  radiusFilter: number;
  onSortChange: (s: string) => void;
  onInquiryChange: (s: string) => void;
  onCapabilityChange: (s: string) => void;
  onTierChange: (s: string) => void;
  onRadiusChange: (r: number) => void;
}
export default function Filters({
  sort,
  inquiry,
  tierFilter,
  radiusFilter,
  onSortChange,
  onInquiryChange,
  onTierChange,
  onRadiusChange,
}: Props) {
  return (
    <div className="installer-filters">
      <label className="flex items-center gap-2 text-sm min-h-10">
        <input
          type="checkbox"
          className="w-5 h-5"
          checked={inquiry === "1"}
          onChange={(e) => onInquiryChange(e.target.checked ? "1" : "")}
        />
        Shops with an online request option
      </label>
      <details className="mt-2">
        <summary className="cursor-pointer text-sm font-medium py-2">
          Distance and sorting · {radiusFilter} miles
          {sort === "nearest" ? " · Nearest first" : ""}
          {tierFilter ? " · Vicrez records only" : ""}
        </summary>
        <div className="grid gap-4 sm:grid-cols-3 mt-3">
          <label className="text-sm">
            Search radius
            <select
              className="input-field w-full mt-1"
              value={radiusFilter}
              onChange={(e) => onRadiusChange(Number(e.target.value))}
            >
              {[10, 25, 50, 100, 250].map((r) => (
                <option value={r} key={r}>
                  {r} miles
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Sort by
            <select
              className="input-field w-full mt-1"
              value={sort}
              onChange={(e) => onSortChange(e.target.value)}
            >
              <option value="recommended">
                Nearby, online request options first
              </option>
              <option value="nearest">Nearest first</option>
            </select>
          </label>
          <label className="text-sm">
            Listing type
            <select
              className="input-field w-full mt-1"
              value={tierFilter}
              onChange={(e) => onTierChange(e.target.value)}
            >
              <option value="">All listings</option>
              <option value="verified">Vicrez-recorded shops</option>
            </select>
          </label>
        </div>
        <p className="text-xs text-gray-600 mt-3">
          Service filters use recorded capabilities. Default results group
          nearby shops in 10-mile bands, with online request options first
          within each band. Distances are straight-line estimates. City-only
          listings appear afterward with no claimed distance. We check current
          request availability before opening the form. A listing does not
          guarantee a response or appointment.
        </p>
      </details>
    </div>
  );
}
