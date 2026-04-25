import React from 'react';
import type { EnvirofactsFilters } from '../../types/envirofactsTypes';

type Props = {
  filters: EnvirofactsFilters;
  onChange: (next: Partial<EnvirofactsFilters>) => void;
  onSearch: () => void;
};

const inputCls = 'w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500';
const labelCls = 'mb-1 block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400';

const EnvirofactsSearchPanel: React.FC<Props> = ({ filters, onChange, onSearch }) => {
  return (
    <section className="rounded-2xl border border-slate-700/80 bg-slate-900/70 p-4 md:p-5">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        <div><label className={labelCls}>Address</label><input className={inputCls} value={filters.address} onChange={(e) => onChange({ address: e.target.value })} /></div>
        <div><label className={labelCls}>ZIP Code</label><input className={inputCls} value={filters.zipCode} onChange={(e) => onChange({ zipCode: e.target.value })} /></div>
        <div><label className={labelCls}>City</label><input className={inputCls} value={filters.city} onChange={(e) => onChange({ city: e.target.value })} /></div>
        <div><label className={labelCls}>County</label><input className={inputCls} value={filters.county} onChange={(e) => onChange({ county: e.target.value })} /></div>
        <div><label className={labelCls}>State</label><input className={inputCls} value={filters.state} onChange={(e) => onChange({ state: e.target.value })} /></div>
        <div><label className={labelCls}>Water Body</label><input className={inputCls} value={filters.waterBody} onChange={(e) => onChange({ waterBody: e.target.value })} /></div>
        <div><label className={labelCls}>Facility Name</label><input className={inputCls} value={filters.facilityName} onChange={(e) => onChange({ facilityName: e.target.value })} /></div>
        <div><label className={labelCls}>EPA Program/Source</label><input className={inputCls} value={filters.sourceSearch} onChange={(e) => onChange({ sourceSearch: e.target.value })} /></div>
        <div><label className={labelCls}>Environmental Category</label><input className={inputCls} value={filters.environmentalCategory} onChange={(e) => onChange({ environmentalCategory: e.target.value })} /></div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button type="button" onClick={onSearch} className="rounded-lg border border-cyan-500/70 bg-cyan-900/35 px-4 py-2 text-sm font-semibold text-cyan-100">Search Envirofacts</button>
        <p className="text-xs text-slate-400">Paginated JSON search optimized for Envirofacts service limits.</p>
      </div>
    </section>
  );
};

export default EnvirofactsSearchPanel;
