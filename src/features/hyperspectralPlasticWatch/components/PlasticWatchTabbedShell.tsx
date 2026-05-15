import React from 'react';
import type { PlasticWatchTab } from '../types';

export const PLASTIC_WATCH_TABS: { id: PlasticWatchTab; label: string; hint: string }[] = [
  { id: 'aoi', label: 'AOI & scan', hint: 'Location, dates, layers, run scan' },
  { id: 'results', label: 'Results', hint: 'Risk summary, PACE metadata, spectral' },
  { id: 'evidence', label: 'Evidence', hint: 'Packet export and drone prep' },
  { id: 'workflow', label: 'Workflow', hint: 'Watch DPAL Work steps' },
];

type PlasticWatchTabbedShellProps = {
  activeTab: PlasticWatchTab;
  onTabChange: (tab: PlasticWatchTab) => void;
  mapToolbar: React.ReactNode;
  map: React.ReactNode;
  alerts?: React.ReactNode;
  aoiPanel: React.ReactNode;
  resultsPanel: React.ReactNode;
  evidencePanel: React.ReactNode;
  workflowPanel: React.ReactNode;
};

export function PlasticWatchTabbedShell({
  activeTab,
  onTabChange,
  mapToolbar,
  map,
  alerts,
  aoiPanel,
  resultsPanel,
  evidencePanel,
  workflowPanel,
}: PlasticWatchTabbedShellProps): React.ReactElement {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-4">
      {alerts}

      <section className="w-full" aria-label="Area of interest map">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="text-center sm:text-left">
            <h2 className="text-sm font-semibold text-slate-900">Area of interest map</h2>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Click the map to set center · use tabs below for scan settings and results
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">{mapToolbar}</div>
        </div>

        <div className="mx-auto w-full max-w-5xl">{map}</div>
      </section>

      <div
        role="tablist"
        aria-label="Plastic Watch sections"
        className="flex flex-wrap justify-center gap-1 border-b border-slate-200 pb-px"
      >
        {PLASTIC_WATCH_TABS.map((tab) => {
          const selected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`plastic-watch-panel-${tab.id}`}
              id={`plastic-watch-tab-${tab.id}`}
              title={tab.hint}
              onClick={() => onTabChange(tab.id)}
              className={`rounded-t-lg border px-4 py-2.5 text-xs font-semibold transition ${
                selected
                  ? '-mb-px border-slate-200 border-b-white bg-white text-emerald-900'
                  : 'border-transparent bg-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        {activeTab === 'aoi' ? (
          <div id="plastic-watch-panel-aoi" role="tabpanel" aria-labelledby="plastic-watch-tab-aoi" className="space-y-4">
            {aoiPanel}
          </div>
        ) : null}
        {activeTab === 'results' ? (
          <div
            id="plastic-watch-panel-results"
            role="tabpanel"
            aria-labelledby="plastic-watch-tab-results"
            className="space-y-4"
          >
            {resultsPanel}
          </div>
        ) : null}
        {activeTab === 'evidence' ? (
          <div
            id="plastic-watch-panel-evidence"
            role="tabpanel"
            aria-labelledby="plastic-watch-tab-evidence"
            className="space-y-4"
          >
            {evidencePanel}
          </div>
        ) : null}
        {activeTab === 'workflow' ? (
          <div
            id="plastic-watch-panel-workflow"
            role="tabpanel"
            aria-labelledby="plastic-watch-tab-workflow"
            className="space-y-4"
          >
            {workflowPanel}
          </div>
        ) : null}
      </div>
    </div>
  );
}
