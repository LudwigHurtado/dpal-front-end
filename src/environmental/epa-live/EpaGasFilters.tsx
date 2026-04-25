import React from 'react';
import type { EpaFilters } from '../../types/epa';

type Props = {
  filters: EpaFilters;
  gasOptions: string[];
  onChange: (next: Partial<EpaFilters>) => void;
  onSearch: () => void;
  onClear: () => void;
  onApplyQuickTest: (next: Partial<EpaFilters>) => void;
};

const inputCls =
  'w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500';
const labelCls = 'mb-1 block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400';

const QUICK_TESTS: Array<{ label: string; filters: Partial<EpaFilters> }> = [
  { label: 'TX 2023', filters: { state: 'TX', year: '2023' } },
  { label: 'Houston TX', filters: { state: 'TX', city: 'Houston' } },
  { label: 'Cement facilities', filters: { facilityName: 'CEMENT' } },
  { label: 'Landfills', filters: { industryType: 'landfill' } },
  { label: 'Electricity generation', filters: { industryType: 'electricity generation' } },
];

const EpaGasFilters: React.FC<Props> = ({ filters, gasOptions, onChange, onSearch, onClear, onApplyQuickTest }) => {
  return (
    <section className="rounded-2xl border border-slate-700/80 bg-slate-900/70 p-4 md:p-5">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className={labelCls}>State</label>
          <input className={inputCls} value={filters.state} onChange={(e) => onChange({ state: e.target.value })} placeholder="TX" />
        </div>
        <div>
          <label className={labelCls}>City</label>
          <input className={inputCls} value={filters.city} onChange={(e) => onChange({ city: e.target.value })} placeholder="Houston" />
        </div>
        <div>
          <label className={labelCls}>County</label>
          <input className={inputCls} value={filters.county} onChange={(e) => onChange({ county: e.target.value })} placeholder="Harris" />
        </div>
        <div>
          <label className={labelCls}>ZIP</label>
          <input className={inputCls} value={filters.zip} onChange={(e) => onChange({ zip: e.target.value })} placeholder="77002" />
        </div>
        <div>
          <label className={labelCls}>Facility Name</label>
          <input className={inputCls} value={filters.facilityName} onChange={(e) => onChange({ facilityName: e.target.value })} placeholder="Cement" />
        </div>
        <div>
          <label className={labelCls}>Parent Company</label>
          <input className={inputCls} value={filters.parentCompany} onChange={(e) => onChange({ parentCompany: e.target.value })} placeholder="Energy Group" />
        </div>
        <div>
          <label className={labelCls}>Reporting Year</label>
          <input className={inputCls} value={filters.year} onChange={(e) => onChange({ year: e.target.value })} placeholder="2023" />
        </div>
        <div>
          <label className={labelCls}>Gas Type</label>
          <select className={inputCls} value={filters.gas} onChange={(e) => onChange({ gas: e.target.value })}>
            <option value="">All gases</option>
            {gasOptions.map((gas) => (
              <option key={gas} value={gas}>
                {gas}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Industry Type</label>
          <input
            className={inputCls}
            value={filters.industryType}
            onChange={(e) => onChange({ industryType: e.target.value })}
            placeholder="Electricity Generation"
          />
        </div>
      </div>

      <p className="mt-4 text-xs text-cyan-200">
        For best results, start with State + Year, then add city, facility, gas, or industry filters.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {QUICK_TESTS.map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => onApplyQuickTest(chip.filters)}
            className="rounded-full border border-slate-600 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-200 hover:border-cyan-500/70 hover:text-cyan-100"
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onSearch}
          className="rounded-lg border border-cyan-500/60 bg-cyan-900/30 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-900/50"
        >
          Search Official EPA Data
        </button>
        <button
          type="button"
          onClick={onClear}
          className="rounded-lg border border-slate-600 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
        >
          Clear Filters
        </button>
        <p className="text-xs text-slate-400">Use paged searches to keep requests fast and stable.</p>
      </div>
    </section>
  );
};

export default EpaGasFilters;
