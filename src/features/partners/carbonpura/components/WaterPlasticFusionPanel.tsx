import React from 'react';
import { Link } from 'react-router-dom';
import { VIEW_PATHS } from '../../../../../utils/appRoutes';
import { buildCarbonPuraContextHref } from '../carbonPuraModuleRegistry';

const FUSION_STEPS = [
  'CarbonPura project',
  'Water project context (Water Monitor)',
  'AOI satellite scan (AquaScan)',
  'PACE plastic confidence screening',
  'Confounder review: algae, turbidity, sediment, foam, cloud/glint',
  'Field validation recommendation',
  'Combined evidence packet (aggregation pending)',
  'Validator review',
] as const;

export function WaterPlasticFusionPanel() {
  return (
    <section className="rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50/80 to-white p-5 md:p-6">
      <h2 className="text-lg font-bold text-slate-900">Water + plastic fusion</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-700">
        This is not a mock replacement. CarbonPura taps into existing DPAL engines. Water Monitor provides the project
        operating layer and validation workflow. AquaScan provides technical water-satellite analysis. PACE Plastic Watch
        provides plastic-risk intelligence as a confidence layer inside a multi-sensor model — not a standalone final
        determination.
      </p>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase text-teal-700">Water Monitor</p>
          <p className="mt-2 text-sm text-slate-600">
            Live project workflow, validation, reports, and impact tracking.
          </p>
          <Link
            to={VIEW_PATHS.waterOperationsEngine}
            className="mt-3 inline-block text-xs font-semibold text-teal-700 hover:text-teal-900"
          >
            Open /water/monitor →
          </Link>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase text-teal-700">AquaScan</p>
          <p className="mt-2 text-sm text-slate-600">Live technical AOI and water satellite analysis.</p>
          <Link
            to={VIEW_PATHS.aquaScanWater}
            className="mt-3 inline-block text-xs font-semibold text-teal-700 hover:text-teal-900"
          >
            Open /water/aquascan →
          </Link>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase text-teal-700">PACE Plastic Watch</p>
          <p className="mt-2 text-sm text-slate-600">
            Live PACE/EMIT/Sentinel/Landsat plastic-risk screening and evidence support.
          </p>
          <Link
            to={VIEW_PATHS.hyperspectralPlasticWatch}
            className="mt-3 inline-block text-xs font-semibold text-teal-700 hover:text-teal-900"
          >
            Open /hyperspectral-plastic-watch →
          </Link>
        </div>
      </div>
      <div className="mt-6 overflow-x-auto pb-2">
        <div className="flex min-w-max items-center gap-2">
          {FUSION_STEPS.map((step, i) => (
            <React.Fragment key={step}>
              <div className="max-w-[140px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-center text-[11px] font-medium text-slate-700">
                {step}
              </div>
              {i < FUSION_STEPS.length - 1 ? (
                <span className="text-slate-400" aria-hidden>
                  →
                </span>
              ) : null}
            </React.Fragment>
          ))}
        </div>
      </div>
      <p className="mt-4 text-xs text-slate-500">
        Combined workflow links:{' '}
        <Link
          to={buildCarbonPuraContextHref(VIEW_PATHS.waterOperationsEngine, { includeProjectId: true })}
          className="text-teal-700 underline"
        >
          monitor
        </Link>
        {' · '}
        <Link
          to={buildCarbonPuraContextHref(VIEW_PATHS.aquaScanWater, { includeProjectId: true })}
          className="text-teal-700 underline"
        >
          aquascan
        </Link>
        {' · '}
        <Link
          to={buildCarbonPuraContextHref(VIEW_PATHS.hyperspectralPlasticWatch, { includeProjectId: true })}
          className="text-teal-700 underline"
        >
          plastic watch
        </Link>
      </p>
    </section>
  );
}