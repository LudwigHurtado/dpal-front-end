import React from 'react';
import type { DmrvMethodologyPreset } from '../dmrvMethodologyPresets';
import {
  METHODOLOGY_STATUS_LABELS,
  METHODOLOGY_STATUS_STYLES,
  type MethodologyReadinessResult,
} from '../dmrvMethodologyPresets';

const READINESS_STYLES: Record<MethodologyReadinessResult['label'], string> = {
  Draft: 'bg-slate-100 text-slate-700 border-slate-200',
  'Needs Evidence': 'bg-amber-50 text-amber-900 border-amber-200',
  'Ready for Review': 'bg-sky-50 text-sky-900 border-sky-200',
  'Evidence Packet Ready': 'bg-emerald-50 text-emerald-900 border-emerald-200',
};

export type MethodologyPreviewCardProps = {
  preset: DmrvMethodologyPreset | null;
  readiness: MethodologyReadinessResult;
  showCalculationChain?: boolean;
  showVerifierExplanation?: boolean;
};

export function MethodologyPreviewCard({
  preset,
  readiness,
  showCalculationChain = true,
  showVerifierExplanation = true,
}: MethodologyPreviewCardProps): React.ReactElement {
  if (!preset) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600">
        Select a methodology preset and click Apply Preset to see calculation chain, required inputs, and
        verifier-facing explanation.
      </div>
    );
  }

  const chainSteps = preset.calculationChain.length > 0 ? preset.calculationChain : [];

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Methodology preview</p>
          <h3 className="text-sm font-bold text-[#1e3a5f]">{preset.name}</h3>
          <p className="mt-1 text-xs text-slate-600">{preset.bestFor}</p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${METHODOLOGY_STATUS_STYLES[preset.status]}`}
        >
          {METHODOLOGY_STATUS_LABELS[preset.status]}
        </span>
      </div>

      <div className="rounded-xl border border-[#1e3a5f]/15 bg-[#e8f0f7]/60 px-3 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold text-[#1e3a5f]">Evidence readiness</p>
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${READINESS_STYLES[readiness.label]}`}
          >
            {readiness.score}% · {readiness.label}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/90">
          <div
            className="h-full rounded-full bg-[#1e3a5f] transition-all"
            style={{ width: `${readiness.score}%` }}
          />
        </div>
        {readiness.missing.length > 0 ? (
          <p className="mt-2 text-[11px] text-slate-600">
            Still needed: {readiness.missing.slice(0, 4).join(', ')}
            {readiness.missing.length > 4 ? ` (+${readiness.missing.length - 4} more)` : ''}
          </p>
        ) : (
          <p className="mt-2 text-[11px] text-emerald-800">
            Configured for reviewer handoff — not independently verified.
          </p>
        )}
      </div>

      {showCalculationChain && chainSteps.length > 0 ? (
        <section>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Calculation chain</p>
          <ol className="flex flex-wrap items-center gap-1 text-[11px] font-medium text-slate-700">
            {chainSteps.map((step, i) => (
              <li key={step} className="flex items-center gap-1">
                {i > 0 ? <span className="text-slate-400" aria-hidden>→</span> : null}
                <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5">{step}</span>
              </li>
            ))}
            <li className="flex items-center gap-1">
              <span className="text-slate-400" aria-hidden>→</span>
              <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-500">
                Blockchain Trace
              </span>
            </li>
          </ol>
        </section>
      ) : null}

      <section>
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">Required inputs</p>
        <ul className="list-inside list-disc space-y-0.5 text-xs text-slate-700">
          {preset.requiredInputs.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section>
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
          Compatible evidence sources
        </p>
        <div className="flex flex-wrap gap-1.5">
          {preset.compatibleEvidenceSources.map((src) => (
            <span
              key={src}
              className="rounded-md border border-emerald-200/80 bg-emerald-50/80 px-2 py-0.5 text-[10px] font-semibold text-emerald-900"
            >
              {src}
            </span>
          ))}
        </div>
      </section>

      {showVerifierExplanation ? (
        <section className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Verifier explanation</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-700">{preset.verifierExplanation}</p>
        </section>
      ) : null}

      {preset.limitations.length > 0 ? (
        <section>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">Limitations</p>
          <ul className="list-inside list-disc space-y-0.5 text-xs text-amber-950/90">
            {preset.limitations.map((lim) => (
              <li key={lim}>{lim}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
