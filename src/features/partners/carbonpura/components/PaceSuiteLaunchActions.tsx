import React from 'react';
import { Link } from 'react-router-dom';
import { buildCarbonPuraContextUrl } from '../carbonPuraProjectContext';
import { buildPaceSuiteContextHref } from '../paceProductSuites';
import type { ProviderSourceStatusEntry } from '../../../environmentalIntegrity/environmentalIntegrityTypes';

type PaceSuiteLaunchActionsProps = {
  source: Pick<
    ProviderSourceStatusEntry,
    | 'productSuiteCode'
    | 'recommendedRoute'
    | 'recommendedModuleLabel'
    | 'evidenceUse'
    | 'evidenceRole'
    | 'launchPurpose'
  >;
  projectId?: string;
  compact?: boolean;
  onMarkForEvidence?: () => void;
  evidenceSelected?: boolean;
};

export function PaceSuiteLaunchActions({
  source,
  projectId,
  compact,
  onMarkForEvidence,
  evidenceSelected,
}: PaceSuiteLaunchActionsProps) {
  const suiteCode = source.productSuiteCode ?? '';
  const liveRoute = source.recommendedRoute ?? '/';
  const contextHref = suiteCode
    ? buildPaceSuiteContextHref(suiteCode, projectId)
    : buildCarbonPuraContextUrl(liveRoute, projectId);

  const btn = compact
    ? 'rounded-md px-2 py-1 text-[10px] font-semibold'
    : 'rounded-lg px-3 py-1.5 text-xs font-semibold';

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Link to={liveRoute} className={`${btn} border border-slate-300 bg-white text-slate-800 hover:bg-slate-50`}>
          Open live engine
        </Link>
        <Link
          to={contextHref}
          className={`${btn} border border-teal-300 bg-teal-50 text-teal-900 hover:bg-teal-100`}
        >
          Open with CarbonPura context
        </Link>
        {onMarkForEvidence ? (
          <button
            type="button"
            onClick={onMarkForEvidence}
            className={`${btn} border ${
              evidenceSelected
                ? 'border-indigo-400 bg-indigo-50 text-indigo-900'
                : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {evidenceSelected ? 'Selected for evidence draft' : 'Mark for evidence packet draft'}
          </button>
        ) : null}
      </div>
      <p className="text-[10px] text-slate-500">
        Cross-module evidence attachment pending. Local draft only — not saved to backend.
      </p>
      {source.launchPurpose ? (
        <p className="text-[11px] text-slate-600">
          <span className="font-semibold text-slate-800">Launch purpose: </span>
          {source.launchPurpose}
        </p>
      ) : null}
      {source.evidenceRole ? (
        <p className="text-[10px] font-medium uppercase tracking-wide text-indigo-700">
          Evidence role: {source.evidenceRole}
        </p>
      ) : null}
    </div>
  );
}
