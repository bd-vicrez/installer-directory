'use client';

interface FiltersProps {
  capabilityFilter: string;
  tierFilter: string;
  onCapabilityChange: (cap: string) => void;
  onTierChange: (tier: string) => void;
  radiusFilter: number;
  onRadiusChange: (r: number) => void;
}

const CAPABILITIES = [
  'Body Kits',
  'Paint/Bodywork',
  'Vinyl/Wraps',
  'Performance Mods',
  'Wheels/Tires',
];

const RADII = [10, 25, 50, 100, 250];

export default function Filters({
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
              onClick={() => onCapabilityChange('')}
              className={`text-sm px-3 py-1.5 rounded-full border transition-all ${
                capabilityFilter === ''
                  ? 'bg-vicrez-red border-vicrez-red text-white'
                  : 'border-vicrez-border text-vicrez-muted hover:border-vicrez-muted'
              }`}
            >
              All
            </button>
            {CAPABILITIES.map((cap) => (
              <button
                key={cap}
                onClick={() => onCapabilityChange(cap === capabilityFilter ? '' : cap)}
                className={`text-sm px-3 py-1.5 rounded-full border transition-all ${
                  capabilityFilter === cap
                    ? 'bg-vicrez-red border-vicrez-red text-white'
                    : 'border-vicrez-border text-vicrez-muted hover:border-vicrez-muted'
                }`}
              >
                {cap}
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
            value={tierFilter}
            onChange={(e) => onTierChange(e.target.value)}
            className="input-field text-sm !py-2"
          >
            <option value="">Show All</option>
            <option value="verified">Verified Only</option>
          </select>
        </div>

        {/* Radius filter */}
        <div>
          <label className="block text-xs font-medium text-vicrez-muted mb-2 uppercase tracking-wider">
            Radius
          </label>
          <select
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
    </div>
  );
}
