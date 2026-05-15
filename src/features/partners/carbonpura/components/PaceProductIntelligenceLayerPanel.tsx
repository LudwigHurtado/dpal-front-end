import React from 'react';
import { Link } from 'react-router-dom';
import { VIEW_PATHS } from '../../../../../utils/appRoutes';
import {
  CARBONPURA_PACE_MODULE_MAP,
  PACE_DATA_VERSION_LABEL,
  PACE_INTELLIGENCE_LAYERS,
  PACE_PLASTIC_CONFOUNDER_STACK,
  PACE_PLASTIC_CONFIDENCE_DISCLAIMER,
  PACE_POSITIONING_COPY,
  PACE_PRODUCT_AWARE_SUMMARY,
  PACE_PROGRAM_NOTE,
  paceStatusDisplayLabel,
} from '../paceProductSuites';
import type { ProviderSourceLifecycleStatus } from '../../../environmentalIntegrity/environmentalIntegrityTypes';

type PaceProductIntelligenceLayerPanelProps = {
  paceLaneStatus?: ProviderSourceLifecycleStatus | null;
};

export function PaceProductIntelligenceLayerPanel({ paceLaneStatus }: PaceProductIntelligenceLayerPanelProps) {
  const laneLabel = paceLaneStatus ? paceStatusDisplayLabel(paceLaneStatus) : 'Checking…';

  return (
    <section className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/90 to-white p-5 md:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">NASA PACE product suites</p>
          <h2 className="text-lg font-bold text-slate-900">PACE Product Intelligence Layer</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">{PACE_POSITIONING_COPY}</p>
          <p className="mt-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900">
            NASA PACE / OCI — {laneLabel}
          </p>
        </div>
        <Link
          to={VIEW_PATHS.hyperspectralPlasticWatch}
          className="shrink-0 rounded-lg bg-indigo-700 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-800"
        >
          Open Plastic Watch
        </Link>
      </div>

      <p className="mt-3 rounded-lg border border-indigo-100 bg-white/80 px-3 py-2 text-xs leading-relaxed text-indigo-950">
        {PACE_PLASTIC_CONFIDENCE_DISCLAIMER}
      </p>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-bold text-slate-900">Product-aware availability (not one vague “PACE partial”)</h3>
        <p className="mt-1 text-xs text-slate-500">{PACE_PROGRAM_NOTE}</p>
        <p className="mt-2 text-[11px] font-medium text-slate-600">
          Evidence tracking: {PACE_DATA_VERSION_LABEL} · processing L2 · quality flags · uncertainty fields · last status
          check in matrix below
        </p>
        <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {PACE_PRODUCT_AWARE_SUMMARY.map((row) => (
            <li key={row.code} className="text-xs text-slate-700">
              <span className="font-mono font-semibold text-indigo-800">PACE {row.code}</span>
              <span className="text-slate-600">: {row.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PACE_INTELLIGENCE_LAYERS.map((layer) => (
          <div
            key={layer.id}
            className="rounded-xl border border-white/80 bg-white p-4 shadow-sm ring-1 ring-indigo-100/80"
          >
            <p className="text-sm font-semibold text-slate-900">{layer.headline}</p>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-indigo-600">{layer.suites}</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">{layer.detail}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-bold text-slate-900">Plastic-risk confounder stack</h3>
          <p className="mt-1 text-xs text-slate-600">
            DPAL does not just flag a plastic-risk pixel — it explains why it may or may not be plastic using the PACE
            confounder stack below.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[320px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500">
                  <th className="py-2 pr-2 font-semibold">DPAL check</th>
                  <th className="py-2 font-semibold">PACE product support</th>
                </tr>
              </thead>
              <tbody>
                {PACE_PLASTIC_CONFOUNDER_STACK.map((row) => (
                  <tr key={row.dpalCheck} className="border-b border-slate-50">
                    <td className="py-2 pr-2 align-top text-slate-800">{row.dpalCheck}</td>
                    <td className="py-2 align-top text-slate-600">{row.paceSupport}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-bold text-slate-900">CarbonPura module ↔ PACE products</h3>
          <p className="mt-1 text-xs text-slate-600">Which official PACE families each DPAL module is designed to use.</p>
          <ul className="mt-3 space-y-2">
            {CARBONPURA_PACE_MODULE_MAP.map((row) => (
              <li key={row.module} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
                <p className="font-semibold text-slate-900">{row.module}</p>
                <p className="mt-0.5 text-slate-600">{row.paceProducts}</p>
                <Link to={row.route} className="mt-1 inline-block font-mono text-[10px] text-teal-700 hover:text-teal-900">
                  {row.route}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-4 text-[11px] text-slate-500">
        Ten grouped matrix rows below (NASA PACE / OCI — OC_AOP Reflectance, … HARP2/SPEXone) include suite code, processing
        level, domain, carbonPura use, QC flags, uncertainty, and evidence use.
      </p>
    </section>
  );
}
