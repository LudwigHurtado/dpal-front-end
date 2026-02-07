import React, { useState } from 'react';
import { ArrowLeft } from '../icons';

const HEADER_BLUE = '#2563eb';

export interface MobileFiltersState {
  radiusKm: number;
  dateRange: string;
  unverified: boolean;
  communityVerified: boolean;
  verifiedOrg: boolean;
  severityLow: boolean;
  severityMedium: boolean;
  severityHigh: boolean;
  tagRoads: boolean;
  tagTrash: boolean;
  onlyWithEvidence: boolean;
}

const DEFAULT_FILTERS: MobileFiltersState = {
  radiusKm: 20,
  dateRange: 'Last 7 Days',
  unverified: false,
  communityVerified: true,
  verifiedOrg: true,
  severityLow: false,
  severityMedium: false,
  severityHigh: false,
  tagRoads: false,
  tagTrash: false,
  onlyWithEvidence: false,
};

interface MobileFiltersViewProps {
  onBack: () => void;
  onApply: (filters: MobileFiltersState) => void;
  initialFilters?: Partial<MobileFiltersState>;
}

const DATE_RANGES = ['Last 24 Hours', 'Last 7 Days', 'Last 30 Days', 'Last 90 Days'];

const MobileFiltersView: React.FC<MobileFiltersViewProps> = ({
  onBack,
  onApply,
  initialFilters,
}) => {
  const [filters, setFilters] = useState<MobileFiltersState>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });

  const update = (key: keyof MobileFiltersState, value: boolean | number | string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-full bg-zinc-950 pb-8">
      {/* Header: Back | DPAL */}
      <header className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b border-zinc-800" style={{ backgroundColor: HEADER_BLUE }}>
        <button type="button" onClick={onBack} className="p-2 rounded-full bg-white/20 text-white touch-manipulation" aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-lg font-bold text-white tracking-tight">DPAL</span>
      </header>

      <div className="px-4 py-4 max-w-lg mx-auto">
        <h1 className="text-lg font-bold text-white mb-4">Filter & Sort</h1>

        {/* Search Radius */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-zinc-400 mb-2">Search Radius</label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={50}
              value={filters.radiusKm}
              onChange={(e) => update('radiusKm', Number(e.target.value))}
              className="flex-1 h-2 rounded-full appearance-none bg-zinc-700 accent-blue-600"
            />
            <span className="text-white font-semibold w-12 text-right">{filters.radiusKm} KM</span>
          </div>
        </div>

        {/* Date Range */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-zinc-400 mb-2">Date Range</label>
          <select
            value={filters.dateRange}
            onChange={(e) => update('dateRange', e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-900 text-white"
          >
            {DATE_RANGES.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* Verification */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-zinc-400 mb-2">Verification</label>
          <div className="space-y-2">
            <label className="flex items-center gap-3 touch-manipulation cursor-pointer">
              <input type="checkbox" checked={filters.unverified} onChange={(e) => update('unverified', e.target.checked)} className="w-5 h-5 rounded border-zinc-600 text-blue-500 bg-zinc-800" />
              <span className="text-zinc-300">Unverified</span>
            </label>
            <label className="flex items-center gap-3 touch-manipulation cursor-pointer">
              <input type="checkbox" checked={filters.communityVerified} onChange={(e) => update('communityVerified', e.target.checked)} className="w-5 h-5 rounded border-zinc-600 text-blue-500 bg-zinc-800" />
              <span className="text-zinc-300">Community Verified</span>
            </label>
            <label className="flex items-center gap-3 touch-manipulation cursor-pointer">
              <input type="checkbox" checked={filters.verifiedOrg} onChange={(e) => update('verifiedOrg', e.target.checked)} className="w-5 h-5 rounded border-zinc-600 text-blue-500 bg-zinc-800" />
              <span className="text-zinc-300">Verified Org</span>
            </label>
          </div>
        </div>

        {/* Severity */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-zinc-400 mb-2">Severity</label>
          <div className="flex gap-2">
            {(['Low', 'Medium', 'High'] as const).map((s, i) => {
              const key = s === 'Low' ? 'severityLow' : s === 'Medium' ? 'severityMedium' : 'severityHigh';
              const isOn = filters[key];
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => update(key, !isOn)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold touch-manipulation ${
                    isOn ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tags */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-zinc-400 mb-2">Tags</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => update('tagRoads', !filters.tagRoads)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold touch-manipulation ${filters.tagRoads ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}
            >
              #Roads
            </button>
            <button
              type="button"
              onClick={() => update('tagTrash', !filters.tagTrash)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold touch-manipulation ${filters.tagTrash ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}
            >
              #Trash
            </button>
          </div>
        </div>

        {/* Evidence filter */}
        <label className="flex items-center justify-between py-3 mb-6 touch-manipulation cursor-pointer border-t border-zinc-800">
          <span className="text-sm text-zinc-300">Only show with evidence</span>
          <input type="checkbox" checked={filters.onlyWithEvidence} onChange={(e) => update('onlyWithEvidence', e.target.checked)} className="w-5 h-5 rounded border-zinc-600 text-blue-500 bg-zinc-800" />
        </label>

        {/* Reset | Apply */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setFilters(DEFAULT_FILTERS)}
            className="flex-1 py-3 rounded-xl font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700 touch-manipulation"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => onApply(filters)}
            className="flex-1 py-3 rounded-xl font-semibold bg-emerald-500 text-white touch-manipulation"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileFiltersView;
export type { MobileFiltersState };
