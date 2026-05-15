import React from 'react';
import { Link } from 'react-router-dom';
import {
  buildCarbonPuraContextHref,
  CARBONPURA_LIVE_ENGINES,
  type CarbonPuraEngineDef,
} from '../carbonPuraModuleRegistry';

type LiveModuleLaunchGridProps = {
  onOpenView?: (viewKey: string) => void;
};

function attachmentLabel(status: CarbonPuraEngineDef['attachmentStatus']): string {
  switch (status) {
    case 'live_route':
      return 'Live route available';
    case 'context_query_ready':
      return 'Context link generated — target module attachment handling pending';
    case 'target_module_pending':
      return 'Live route available, project attachment pending';
    case 'aggregation_pending':
      return 'Aggregation pending';
    case 'provider_unavailable':
      return 'Provider unavailable';
    case 'preview_only':
      return 'Preview only — no live provider response yet';
    default:
      return status;
  }
}

function EngineCard({ engine, onOpenView }: { engine: CarbonPuraEngineDef; onOpenView?: (viewKey: string) => void }) {
  const contextHref = buildCarbonPuraContextHref(engine.routePath, { includeProjectId: true });

  return (
    <article className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-slate-900">{engine.label}</h3>
        <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
          {engine.statusLabel}
        </span>
      </div>
      <p className="mt-2 text-xs text-slate-500">{engine.routePath}</p>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">{engine.purpose}</p>
      <p className="mt-3 text-xs text-slate-500">{engine.verifyNote}</p>
      <p className="mt-2 rounded-md border border-amber-100 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-900">
        {attachmentLabel(engine.attachmentStatus)}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {onOpenView ? (
          <button
            type="button"
            onClick={() => onOpenView(engine.viewKey)}
            className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-800"
          >
            Open live engine
          </button>
        ) : (
          <Link
            to={engine.routePath}
            className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-800"
          >
            Open live engine
          </Link>
        )}
        {engine.supportsContextLink ? (
          <Link
            to={contextHref}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
            title="Context link generated — target module attachment handling pending."
          >
            Open with CarbonPura context
          </Link>
        ) : null}
        <button
          type="button"
          disabled
          className="cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-400"
          title="Verification runs inside each live engine workspace."
        >
          Verify output
        </button>
      </div>
    </article>
  );
}

export function LiveModuleLaunchGrid({ onOpenView }: LiveModuleLaunchGridProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 md:p-6">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-900">Live DPAL engines</h2>
        <p className="mt-1 text-sm text-slate-600">
          Launch existing DPAL modules. No embedded rebuilds — each engine opens on its established route.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
        {CARBONPURA_LIVE_ENGINES.map((engine) => (
          <EngineCard key={engine.id} engine={engine} onOpenView={onOpenView} />
        ))}
      </div>
    </section>
  );
}
