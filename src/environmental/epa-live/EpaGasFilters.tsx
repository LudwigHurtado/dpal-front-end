import React from 'react';
import type { EpaFilters } from '../../types/epa';

type Props = {
  filters: EpaFilters;
  gasOptions: string[];
  onChange: (next: Partial<EpaFilters>) => void;
  onSearch: () => void;
};

const inputCls =
  'w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500';
const labelCls = 'mb-1 block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400';

const EpaGasFilters: React.FC<Props> = ({ filters, gasOptions, onChange, onSearch }) => {
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

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onSearch}
          className="rounded-lg border border-cyan-500/60 bg-cyan-900/30 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-900/50"
        >
          Search Official EPA Data
        </button>
        <p className="text-xs text-slate-400">Use paged searches to keep requests fast and stable.</p>
      </div>
    </section>
  );
};

export default EpaGasFilters;
