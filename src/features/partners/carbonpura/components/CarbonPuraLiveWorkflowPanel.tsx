import React from 'react';
import { VIEW_PATHS } from '../../../../../utils/appRoutes';
import { Link } from 'react-router-dom';
import { buildCarbonPuraContextHref } from '../carbonPuraModuleRegistry';

const WORKFLOW_STEPS = [
  'CarbonPura project context',
  'Open Water Monitor — create or select water project',
  'Open AquaScan — technical AOI / satellite water analysis',
  'Open PACE Plastic Watch — plastic-risk & confounder screening',
  'Generate or attach evidence inside each engine',
  'Validator review (module-native queue)',
  'Registry / evidence export readiness',
] as const;

export function CarbonPuraLiveWorkflowPanel() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
      <h2 className="text-lg font-bold text-slate-900">Live project workflow</h2>
      <p className="mt-1 text-sm text-slate-600">
        Operators move across live DPAL engines. Each step opens an existing module — nothing is simulated here.
      </p>
      <ol className="mt-4 space-y-3">
        {WORKFLOW_STEPS.map((step, i) => (
          <li key={step} className="flex gap-3 text-sm text-slate-700">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-800">
              {i + 1}
            </span>
            <span className="pt-1">{step}</span>
          </li>
        ))}
      </ol>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          to={buildCarbonPuraContextHref(VIEW_PATHS.waterOperationsEngine, { includeProjectId: true })}
          className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-800"
        >
          Start at Water Monitor
        </Link>
        <Link
          to={buildCarbonPuraContextHref(VIEW_PATHS.aquaScanWater, { includeProjectId: true })}
          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
        >
          Open AquaScan
        </Link>
        <Link
          to={buildCarbonPuraContextHref(VIEW_PATHS.hyperspectralPlasticWatch, { includeProjectId: true })}
          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
        >
          Open Plastic Watch
        </Link>
      </div>
      <p className="mt-3 text-[11px] text-amber-800">
        Context link generated — target module attachment handling pending.
      </p>
    </section>
  );
}
