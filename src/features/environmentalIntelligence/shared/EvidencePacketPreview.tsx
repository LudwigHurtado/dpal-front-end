import React from 'react';
import { demoSourceToneClass, demoSourceToneLabel, type DemoScenarioSourceChip } from './demoScenarios';

/**
 * Investor-facing preview of an evidence packet. Used inside the Environmental
 * Intelligence Hub demo cards and inside module-level `InvestorDemoExplainer`s.
 *
 * Honest by construction:
 * - Shows preview-only language ("preview only — final evidence packet requires
 *   live provider response and/or field validation").
 * - Renders provider chips with their tone (live / partial / preview / not connected).
 * - Never asserts a verified result.
 */

export type EvidencePacketPreviewProps = {
  /** Human-readable location label (e.g. "Manila Bay, Philippines"). */
  location: string;
  /** Optional timestamp / window placeholder (e.g. "Last 30 days", or an ISO string). */
  timestampLabel?: string;
  /** Provider source chips with honest tone. */
  providerSources: DemoScenarioSourceChip[];
  /** One-line summary of the screening signal / risk band. */
  signalSummary: string;
  /** One-line confidence note or limitation. */
  confidenceNote: string;
  /** Honest field-validation state (e.g. "Pending field validation"). */
  fieldValidationStatus: string;
  /** Honest QR / hash readiness state (e.g. "QR / SHA-256 hash will be issued after live response"). */
  qrHashStatus: string;
  /** Operator next action. */
  recommendedAction: string;
  /** Optional density tweak — `'compact'` is used inside cards, default is full. */
  density?: 'default' | 'compact';
  /** Optional extra className for layout containment. */
  className?: string;
};

const PREVIEW_DISCLAIMER =
  'Preview only — final evidence packet requires live provider response and/or field validation.';

const labelClass = 'text-[10px] font-semibold uppercase tracking-wide text-slate-500';

const EvidencePacketPreview: React.FC<EvidencePacketPreviewProps> = ({
  location,
  timestampLabel,
  providerSources,
  signalSummary,
  confidenceNote,
  fieldValidationStatus,
  qrHashStatus,
  recommendedAction,
  density = 'default',
  className,
}) => {
  const compact = density === 'compact';
  return (
    <section
      aria-label="Evidence packet preview"
      className={`flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${className ?? ''}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">Evidence Packet Preview</p>
        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
          Preview
        </span>
      </div>

      <div className={`grid grid-cols-1 ${compact ? '' : 'sm:grid-cols-2'} gap-3`}>
        <div>
          <p className={labelClass}>Location</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{location}</p>
        </div>
        <div>
          <p className={labelClass}>Timestamp / window</p>
          <p className="mt-1 text-sm text-slate-700">{timestampLabel ?? 'Set when the operator runs the scan.'}</p>
        </div>
      </div>

      <div>
        <p className={labelClass}>Provider sources</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {providerSources.length === 0 ? (
            <span className="text-[11px] text-slate-500">No sources configured yet.</span>
          ) : (
            providerSources.map((src) => (
              <span key={src.id} className={demoSourceToneClass(src.tone)} title={`${src.label} — ${demoSourceToneLabel(src.tone)}`}>
                <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${dotClass(src.tone)}`} />
                {src.label}
                <span className="ml-1 opacity-70">· {demoSourceToneLabel(src.tone)}</span>
              </span>
            ))
          )}
        </div>
      </div>

      <div className={`grid grid-cols-1 ${compact ? '' : 'sm:grid-cols-2'} gap-3`}>
        <div>
          <p className={labelClass}>Signal / risk summary</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-700">{signalSummary}</p>
        </div>
        <div>
          <p className={labelClass}>Confidence / limitation</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-700">{confidenceNote}</p>
        </div>
        <div>
          <p className={labelClass}>Field validation</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-700">{fieldValidationStatus}</p>
        </div>
        <div>
          <p className={labelClass}>QR / hash readiness</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-700">{qrHashStatus}</p>
        </div>
      </div>

      <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
        <p className={`${labelClass} text-emerald-900`}>Recommended action</p>
        <p className="mt-1 text-xs leading-relaxed text-emerald-900">{recommendedAction}</p>
      </div>

      <p className="text-[10px] leading-relaxed text-slate-500">{PREVIEW_DISCLAIMER}</p>
    </section>
  );
};

function dotClass(tone: DemoScenarioSourceChip['tone']): string {
  switch (tone) {
    case 'live':
      return 'bg-emerald-500';
    case 'partial':
      return 'bg-amber-500';
    case 'preview':
      return 'bg-sky-500';
    case 'unavailable':
    default:
      return 'bg-slate-400';
  }
}

export default EvidencePacketPreview;
