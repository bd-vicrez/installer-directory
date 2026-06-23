'use client';

import { useMemo, useState } from 'react';

type Model = 'mobile' | 'single-bay' | 'multi-bay' | 'used-tire';
type EquipTier = 'used' | 'mixed' | 'new';
type StateCost = 'low' | 'mid' | 'high';

interface CostBreakdown {
  category: string;
  low: number;
  high: number;
}

const STATE_TIERS: Record<string, StateCost> = {
  AL: 'low', AK: 'mid', AZ: 'mid', AR: 'low', CA: 'high', CO: 'mid', CT: 'high', DE: 'mid',
  FL: 'mid', GA: 'low', HI: 'high', ID: 'low', IL: 'mid', IN: 'low', IA: 'low', KS: 'low',
  KY: 'low', LA: 'low', ME: 'mid', MD: 'high', MA: 'high', MI: 'mid', MN: 'mid', MS: 'low',
  MO: 'low', MT: 'low', NE: 'low', NV: 'mid', NH: 'mid', NJ: 'high', NM: 'low', NY: 'high',
  NC: 'low', ND: 'low', OH: 'mid', OK: 'low', OR: 'mid', PA: 'mid', RI: 'high', SC: 'low',
  SD: 'low', TN: 'low', TX: 'mid', UT: 'mid', VT: 'mid', VA: 'mid', WA: 'high', WV: 'low',
  WI: 'mid', WY: 'low',
};

const STATE_MULT: Record<StateCost, number> = { low: 0.85, mid: 1.0, high: 1.25 };
const EQUIP_MULT: Record<EquipTier, { low: number; high: number }> = {
  used: { low: 0.45, high: 0.6 },
  mixed: { low: 0.7, high: 0.85 },
  new: { low: 1.0, high: 1.15 },
};

const MODELS: Record<Model, {
  label: string;
  description: string;
  baseBreakdown: CostBreakdown[];
  monthlyOpex: { low: number; high: number };
}> = {
  mobile: {
    label: 'Mobile Tire Business',
    description: 'Service van + on-site mounting. Solo operator. Lowest capital.',
    baseBreakdown: [
      { category: 'Service van (used 60K–100K mi)', low: 22000, high: 35000 },
      { category: 'Mobile mount/balance unit', low: 5000, high: 14000 },
      { category: 'Generator + air compressor', low: 1800, high: 3500 },
      { category: 'TPMS tool + hand tools', low: 1500, high: 3500 },
      { category: 'Initial tire inventory', low: 4000, high: 8000 },
      { category: 'LLC + licensing + EPA reg', low: 600, high: 1800 },
      { category: 'Insurance (year 1)', low: 3000, high: 5500 },
      { category: 'Marketing + website + Google Ads', low: 2000, high: 5000 },
      { category: 'POS / scheduling software (year 1)', low: 600, high: 1800 },
    ],
    monthlyOpex: { low: 3500, high: 6500 },
  },
  'single-bay': {
    label: 'Single-Bay Shop',
    description: 'One service bay, owner + 1 tech. Neighborhood location.',
    baseBreakdown: [
      { category: 'Lease deposit + first months rent', low: 6000, high: 18000 },
      { category: 'Buildout (signage, paint, parking, lighting)', low: 8000, high: 30000 },
      { category: 'Tire mount machine (touchless)', low: 2000, high: 14000 },
      { category: 'Wheel balancer', low: 1200, high: 8000 },
      { category: 'Two-post lift', low: 1500, high: 6000 },
      { category: 'Air compressor + tools', low: 2000, high: 6000 },
      { category: 'TPMS tool', low: 400, high: 1500 },
      { category: 'Initial tire inventory', low: 12000, high: 28000 },
      { category: 'POS system + computers', low: 1500, high: 4500 },
      { category: 'LLC + licensing + permits', low: 800, high: 2500 },
      { category: 'Insurance (year 1)', low: 2800, high: 5500 },
      { category: 'Marketing launch + signage', low: 3000, high: 8000 },
    ],
    monthlyOpex: { low: 12000, high: 22000 },
  },
  'multi-bay': {
    label: 'Multi-Bay Shop',
    description: '3–5 bays, 3–5 employees, commercial accounts. Scales fast.',
    baseBreakdown: [
      { category: 'Lease deposit + first months rent', low: 12000, high: 35000 },
      { category: 'Buildout (signage, paint, parking, lighting)', low: 25000, high: 80000 },
      { category: 'Tire mount machines (2x)', low: 4000, high: 28000 },
      { category: 'Wheel balancers (2x)', low: 2400, high: 16000 },
      { category: 'Two-post lifts (3–4x)', low: 6000, high: 24000 },
      { category: 'Alignment rack', low: 8000, high: 32000 },
      { category: 'Air compressor + tools (full shop)', low: 5000, high: 14000 },
      { category: 'TPMS + diagnostic tools', low: 1500, high: 4000 },
      { category: 'Initial tire inventory', low: 35000, high: 75000 },
      { category: 'POS + computers + cameras', low: 4500, high: 12000 },
      { category: 'LLC + licensing + permits', low: 1000, high: 3500 },
      { category: 'Insurance (year 1)', low: 4500, high: 9000 },
      { category: 'Marketing launch + signage + opening event', low: 6000, high: 18000 },
    ],
    monthlyOpex: { low: 28000, high: 55000 },
  },
  'used-tire': {
    label: 'Used Tire Shop',
    description: 'Lower-income markets, high volume, lower margins. Cash business.',
    baseBreakdown: [
      { category: 'Lease deposit + first months rent', low: 3000, high: 10000 },
      { category: 'Minimal buildout', low: 2000, high: 8000 },
      { category: 'Used mount machine', low: 1500, high: 4500 },
      { category: 'Used balancer', low: 900, high: 2500 },
      { category: 'Air compressor + tools', low: 1500, high: 3500 },
      { category: 'Used tire inventory (200–400 units)', low: 3000, high: 8000 },
      { category: 'LLC + licensing + EPA reg', low: 600, high: 2000 },
      { category: 'Insurance (year 1)', low: 2200, high: 4500 },
      { category: 'Marketing + signage', low: 1500, high: 4000 },
    ],
    monthlyOpex: { low: 4500, high: 9500 },
  },
};

const STATE_OPTIONS = Object.keys(STATE_TIERS).sort();

export default function Calculator() {
  const [model, setModel] = useState<Model>('single-bay');
  const [stateCode, setStateCode] = useState<string>('TX');
  const [equipTier, setEquipTier] = useState<EquipTier>('mixed');
  const [includeBuffer, setIncludeBuffer] = useState<boolean>(true);
  const [showEmail, setShowEmail] = useState<boolean>(false);
  const [emailSent, setEmailSent] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');

  const stateTier = STATE_TIERS[stateCode] || 'mid';
  const stateMult = STATE_MULT[stateTier];

  const result = useMemo(() => {
    const m = MODELS[model];
    const equipCategories = new Set([
      'Tire mount machine (touchless)',
      'Tire mount machines (2x)',
      'Mobile mount/balance unit',
      'Wheel balancer',
      'Wheel balancers (2x)',
      'Two-post lift',
      'Two-post lifts (3–4x)',
      'Alignment rack',
      'Air compressor + tools',
      'Air compressor + tools (full shop)',
      'Generator + air compressor',
      'TPMS tool',
      'TPMS tool + hand tools',
      'TPMS + diagnostic tools',
      'Used mount machine',
      'Used balancer',
    ]);

    const breakdown = m.baseBreakdown.map((b) => {
      const isEquip = equipCategories.has(b.category);
      const equipL = isEquip ? EQUIP_MULT[equipTier].low : 1;
      const equipH = isEquip ? EQUIP_MULT[equipTier].high : 1;
      // State multiplier applies to lease, buildout, licensing, insurance
      const isStateSensitive =
        b.category.includes('Lease') ||
        b.category.includes('Buildout') ||
        b.category.includes('buildout') ||
        b.category.includes('licensing') ||
        b.category.includes('Insurance');
      const sMult = isStateSensitive ? stateMult : 1;
      return {
        category: b.category,
        low: Math.round(b.low * equipL * sMult),
        high: Math.round(b.high * equipH * sMult),
      };
    });

    const oneTimeLow = breakdown.reduce((s, b) => s + b.low, 0);
    const oneTimeHigh = breakdown.reduce((s, b) => s + b.high, 0);

    const bufferLow = includeBuffer ? m.monthlyOpex.low * 4 * stateMult : 0;
    const bufferHigh = includeBuffer ? m.monthlyOpex.high * 4 * stateMult : 0;

    return {
      breakdown,
      oneTimeLow,
      oneTimeHigh,
      bufferLow: Math.round(bufferLow),
      bufferHigh: Math.round(bufferHigh),
      totalLow: oneTimeLow + Math.round(bufferLow),
      totalHigh: oneTimeHigh + Math.round(bufferHigh),
    };
  }, [model, stateCode, equipTier, includeBuffer, stateMult]);

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <div className="bg-vicrez-card border border-vicrez-border rounded-xl p-6">
        <h2 className="text-white font-bold text-lg mt-0 mb-4">Your Plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-vicrez-muted text-sm mb-2">Business model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value as Model)}
              className="w-full bg-vicrez-dark border border-vicrez-border text-white rounded px-3 py-2"
            >
              {Object.entries(MODELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-vicrez-muted mt-2">{MODELS[model].description}</p>
          </div>
          <div>
            <label className="block text-vicrez-muted text-sm mb-2">State</label>
            <select
              value={stateCode}
              onChange={(e) => setStateCode(e.target.value)}
              className="w-full bg-vicrez-dark border border-vicrez-border text-white rounded px-3 py-2"
            >
              {STATE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <p className="text-xs text-vicrez-muted mt-2">
              Cost tier: <span className="text-white">{stateTier}</span> ({(stateMult * 100).toFixed(0)}% of national average)
            </p>
          </div>
          <div>
            <label className="block text-vicrez-muted text-sm mb-2">Equipment tier</label>
            <select
              value={equipTier}
              onChange={(e) => setEquipTier(e.target.value as EquipTier)}
              className="w-full bg-vicrez-dark border border-vicrez-border text-white rounded px-3 py-2"
            >
              <option value="used">Used (45–60%)</option>
              <option value="mixed">Mixed used + new (70–85%)</option>
              <option value="new">All new (100%+)</option>
            </select>
            <p className="text-xs text-vicrez-muted mt-2">
              Most new shops start with used equipment to preserve capital.
            </p>
          </div>
        </div>

        <label className="flex items-center gap-2 mt-5 cursor-pointer">
          <input
            type="checkbox"
            checked={includeBuffer}
            onChange={(e) => setIncludeBuffer(e.target.checked)}
            className="rounded"
          />
          <span className="text-gray-300 text-sm">
            Include 4-month working capital buffer{' '}
            <span className="text-vicrez-muted">(strongly recommended)</span>
          </span>
        </label>
      </div>

      {/* Result */}
      <div className="bg-gradient-to-br from-vicrez-red/20 to-vicrez-card border border-vicrez-red/30 rounded-xl p-6">
        <div className="text-vicrez-muted text-sm uppercase tracking-wider font-semibold">
          Estimated all-in startup cost
        </div>
        <div className="text-white text-4xl sm:text-5xl font-extrabold mt-2">
          {fmt(result.totalLow)} – {fmt(result.totalHigh)}
        </div>
        <div className="grid grid-cols-2 gap-4 mt-5 text-sm">
          <div>
            <div className="text-vicrez-muted">One-time costs</div>
            <div className="text-white font-semibold">
              {fmt(result.oneTimeLow)} – {fmt(result.oneTimeHigh)}
            </div>
          </div>
          {includeBuffer && (
            <div>
              <div className="text-vicrez-muted">4-month operating buffer</div>
              <div className="text-white font-semibold">
                {fmt(result.bufferLow)} – {fmt(result.bufferHigh)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Breakdown */}
      <div className="bg-vicrez-card border border-vicrez-border rounded-xl p-6">
        <h2 className="text-white font-bold text-lg mt-0 mb-4">Cost Breakdown</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-white">
              <tr className="border-b border-vicrez-border">
                <th className="py-2">Category</th>
                <th className="py-2 text-right">Low</th>
                <th className="py-2 text-right">High</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              {result.breakdown.map((b) => (
                <tr key={b.category} className="border-b border-vicrez-border/40">
                  <td className="py-2">{b.category}</td>
                  <td className="py-2 text-right">{fmt(b.low)}</td>
                  <td className="py-2 text-right">{fmt(b.high)}</td>
                </tr>
              ))}
              <tr className="text-white font-bold">
                <td className="py-3">One-time subtotal</td>
                <td className="py-3 text-right">{fmt(result.oneTimeLow)}</td>
                <td className="py-3 text-right">{fmt(result.oneTimeHigh)}</td>
              </tr>
              {includeBuffer && (
                <tr className="text-white font-bold">
                  <td className="py-3">+ 4-month buffer</td>
                  <td className="py-3 text-right">{fmt(result.bufferLow)}</td>
                  <td className="py-3 text-right">{fmt(result.bufferHigh)}</td>
                </tr>
              )}
              <tr className="text-vicrez-red font-extrabold text-lg border-t-2 border-vicrez-red/40">
                <td className="py-3">All-in total</td>
                <td className="py-3 text-right">{fmt(result.totalLow)}</td>
                <td className="py-3 text-right">{fmt(result.totalHigh)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Email gate / CTA */}
      <div className="bg-gradient-to-r from-vicrez-red to-red-700 rounded-xl p-6">
        {!showEmail && !emailSent && (
          <div className="text-center">
            <h2 className="text-white font-bold text-xl mb-2 mt-0">
              Want this breakdown emailed to you?
            </h2>
            <p className="text-white/90 mb-4 text-sm">
              We&apos;ll send a PDF version of your estimate plus our free state-by-state licensing
              checklist.
            </p>
            <button
              onClick={() => setShowEmail(true)}
              className="bg-white text-vicrez-red font-bold px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Email Me the PDF + Checklist
            </button>
          </div>
        )}

        {showEmail && !emailSent && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              // TODO: wire to /api/lead-magnet — for now just acknowledge
              setEmailSent(true);
            }}
            className="flex flex-col sm:flex-row gap-3 justify-center items-center"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="bg-white text-gray-900 px-4 py-3 rounded-lg w-full sm:w-80"
            />
            <button
              type="submit"
              className="bg-white text-vicrez-red font-bold px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors whitespace-nowrap"
            >
              Send It Over
            </button>
          </form>
        )}

        {emailSent && (
          <div className="text-center text-white">
            <div className="text-2xl font-bold mb-2">Got it. ✓</div>
            <p className="text-white/90 text-sm">
              We&apos;ll send the PDF + checklist to <strong>{email}</strong> within a few minutes.
              Check spam if you don&apos;t see it.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
