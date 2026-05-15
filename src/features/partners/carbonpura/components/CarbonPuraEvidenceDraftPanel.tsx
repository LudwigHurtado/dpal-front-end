import React from 'react';
import type { useCarbonPuraEvidenceDraft } from '../hooks/useCarbonPuraEvidenceDraft';
import { getPaceSuiteRouting } from '../paceProductSuites';

type EvidenceDraftApi = ReturnType<typeof useCarbonPuraEvidenceDraft>;

type CarbonPuraEvidenceDraftPanelProps = {
  evidenceDraft: EvidenceDraftApi;
};

const MISSING_FOR_PACKET = [
  'Backend evidence packet aggregation API',
  'Cross-module scan result attachment from Plastic Watch / AquaScan / Water Monitor',
  'Validator review queue linkage at CarbonPura hub layer',
  'PACE granule-level provenance in combined export',
  'Field validation attestations before strong claims',
];

export function CarbonPuraEvidenceDraftPanel({ evidenceDraft }: CarbonPuraEvidenceDraftPanelProps) {
  const { draft, selectedModules, clearDraft, removeSourceSuite } = evidenceDraft;
  const count = draft.selectedSourceSuites.length;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Phase 2 · local draft</p>
          <h2 className="text-lg font-bold text-slate-900">CarbonPura evidence draft</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Select PACE product suites as evidence-building blocks. This draft is stored in your browser only — not
            backend-saved. Combined packet generation remains pending.
          </p>
        </div>
        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">
          Local evidence draft only
        </span>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Project: <span className="font-mono text-slate-700">{draft.projectId}</span> · {count} suite
        {count === 1 ? '' : 's'} selected
      </p>

      {count === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
          No suites selected yet. Use &quot;Mark for evidence packet draft&quot; on a PACE matrix row or intelligence
          layer card to add evidence-support context.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {draft.selectedSourceSuites.map((entry) => {
            const routing = getPaceSuiteRouting(entry.suiteCode);
            return (
              <li
                key={entry.suiteCode}
                className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs"
              >
                <div>
                  <p className="font-mono font-semibold text-indigo-800">PACE {entry.suiteCode}</p>
                  <p className="mt-0.5 text-slate-700">{entry.moduleLabel}</p>
                  <p className="mt-0.5 text-slate-500">{entry.evidenceUse}</p>
                  <p className="mt-1 text-[10px] font-medium uppercase text-indigo-600">
                    Evidence role: {routing.evidenceRole}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeSourceSuite(entry.suiteCode)}
                  className="shrink-0 text-[10px] font-semibold text-rose-700 hover:text-rose-900"
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {selectedModules.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-semibold text-slate-800">Selected DPAL modules (from suites)</p>
          <p className="mt-1 text-xs text-slate-600">{selectedModules.join(' · ')}</p>
        </div>
      ) : null}

      <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-3">
        <p className="text-xs font-semibold text-slate-800">Missing for final evidence packet</p>
        <ul className="mt-2 list-inside list-disc text-xs text-slate-600">
          {MISSING_FOR_PACKET.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={clearDraft}
          disabled={count === 0}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-40"
        >
          Clear draft
        </button>
        <button
          type="button"
          disabled
          title="Backend aggregation pending"
          className="cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-500"
        >
          Generate combined evidence packet — backend aggregation pending
        </button>
      </div>
    </section>
  );
}
