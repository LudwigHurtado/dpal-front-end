import React from 'react';
import type { EnvirofactsFilters, EnvirofactsSearchMode } from '../../types/envirofactsTypes';

type Props = {
  filters: EnvirofactsFilters;
  onChange: (next: Partial<EnvirofactsFilters>) => void;
  onSearch: () => void;
  onClear: () => void;
  onChip: (patch: Partial<EnvirofactsFilters>) => void;
};

const inputCls =
  'w-full rounded-lg border border-slate-600/90 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none ring-0 placeholder:text-slate-600 focus:border-slate-400';
const labelCls = 'mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500';
const selectCls = inputCls + ' cursor-pointer';

const SEARCH_MODES: { value: EnvirofactsSearchMode; label: string }[] = [
  { value: 'auto', label: 'Auto (recommended)' },
  { value: 'zip', label: 'ZIP Code' },
  { value: 'address', label: 'Address' },
  { value: 'city', label: 'City' },
  { value: 'county', label: 'County' },
  { value: 'state', label: 'State' },
  { value: 'waterBody', label: 'Water body' },
  { value: 'facilityName', label: 'Facility name' },
  { value: 'sourceProgram', label: 'EPA source / program' },
  { value: 'environmentalCategory', label: 'Environmental category' },
];

const EnvirofactsSearchPanel: React.FC<Props> = ({ filters, onChange, onSearch, onClear, onChip }) => {
  return (
    <section className="rounded-xl border border-slate-700/90 bg-slate-900/75 p-4 shadow-sm md:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-700/60 pb-4">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-slate-100">Search official EPA records</h2>
          <p className="mt-2 max-w-3xl text-xs leading-relaxed text-slate-400">
            Start broad with ZIP, city, county, or state. Then narrow by EPA source, environmental category, or facility name.
          </p>
        </div>
      </div>

      <div className="mt-4">
        <p className={labelCls}>Quick examples</p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'ZIP 60085', patch: { searchMode: 'zip' as const, zipCode: '60085' } },
            { label: 'State IL', patch: { searchMode: 'state' as const, state: 'IL' } },
            { label: 'Lake County IL', patch: { searchMode: 'county' as const, state: 'IL', county: 'Lake' } },
            { label: 'Houston TX', patch: { searchMode: 'city' as const, state: 'TX', city: 'Houston' } },
            { label: 'Air facilities', patch: { searchMode: 'environmentalCategory' as const, environmentalCategory: 'Air', sourceSearch: 'air' } },
            { label: 'Water records', patch: { searchMode: 'environmentalCategory' as const, environmentalCategory: 'Water', sourceSearch: 'water' } },
            { label: 'Waste records', patch: { searchMode: 'environmentalCategory' as const, environmentalCategory: 'Waste', sourceSearch: 'RCRA' } },
            { label: 'TRI toxics', patch: { searchMode: 'sourceProgram' as const, sourceSearch: 'TRI', environmentalCategory: 'Toxic' } },
            { label: 'RCRA waste', patch: { searchMode: 'sourceProgram' as const, sourceSearch: 'RCRA', environmentalCategory: 'Waste' } },
            { label: 'Enforcement review', patch: { searchMode: 'sourceProgram' as const, sourceSearch: 'enforcement' } },
          ].map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => onChip({ ...chip.patch, page: 1 })}
              className="rounded-md border border-slate-600 bg-slate-950/80 px-2.5 py-1 text-[11px] font-medium text-slate-200 hover:border-slate-500 hover:bg-slate-900"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-3">
          <label className={labelCls}>Primary search mode</label>
          <select
            className={selectCls + ' max-w-md'}
            value={filters.searchMode}
            onChange={(e) => onChange({ searchMode: e.target.value as EnvirofactsSearchMode })}
          >
            {SEARCH_MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>ZIP Code</label>
          <input className={inputCls} value={filters.zipCode} onChange={(e) => onChange({ zipCode: e.target.value })} placeholder="e.g. 60085" />
        </div>
        <div>
          <label className={labelCls}>Address</label>
          <input className={inputCls} value={filters.address} onChange={(e) => onChange({ address: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>City</label>
          <input className={inputCls} value={filters.city} onChange={(e) => onChange({ city: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>County</label>
          <input className={inputCls} value={filters.county} onChange={(e) => onChange({ county: e.target.value })} placeholder="e.g. Lake" />
        </div>
        <div>
          <label className={labelCls}>State (2-letter)</label>
          <input
            className={inputCls}
            value={filters.state}
            maxLength={2}
            onChange={(e) => onChange({ state: e.target.value.toUpperCase() })}
            placeholder="IL"
          />
        </div>
        <div>
          <label className={labelCls}>Water body</label>
          <input className={inputCls} value={filters.waterBody} onChange={(e) => onChange({ waterBody: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>Facility / record name</label>
          <input className={inputCls} value={filters.facilityName} onChange={(e) => onChange({ facilityName: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>EPA source / program</label>
          <input className={inputCls} value={filters.sourceSearch} onChange={(e) => onChange({ sourceSearch: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>Environmental category</label>
          <input className={inputCls} value={filters.environmentalCategory} onChange={(e) => onChange({ environmentalCategory: e.target.value })} />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-700/50 pt-4">
        <button
          type="button"
          onClick={onSearch}
          className="rounded-lg border border-slate-500 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-white"
        >
          Search Official EPA Records
        </button>
        <button
          type="button"
          onClick={onClear}
          className="rounded-lg border border-slate-600 bg-slate-950 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500 hover:bg-slate-900"
        >
          Clear Filters
        </button>
        <p className="text-[11px] text-slate-500">Requests use 1-based row ranges per EPA Envirofacts Data Service conventions.</p>
      </div>
    </section>
  );
};

export default EnvirofactsSearchPanel;
