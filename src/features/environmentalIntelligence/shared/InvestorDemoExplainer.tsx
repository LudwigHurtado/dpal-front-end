import React from 'react';
import EvidencePacketPreview, { type EvidencePacketPreviewProps } from './EvidencePacketPreview';

/**
 * Investor-facing explainer card. Designed to sit near a module's Watch DPAL Work /
 * workflow panel without disrupting the existing layout.
 *
 * Renders five sections in plain English:
 *  1. What you are seeing
 *  2. Why it matters
 *  3. Evidence packet preview (embedded `EvidencePacketPreview`)
 *  4. Honesty / limitation note
 *  5. Next action
 *
 * The component is purely presentational. It never triggers a scan or a provider call.
 */

type ProviderInfo = EvidencePacketPreviewProps['providerSources'];

export type InvestorDemoExplainerProps = {
  /** Short title (e.g. "Forest Integrity — investor demo"). */
  title: string;
  /** Module / lane label (e.g. "Forest Integrity"). */
  moduleLabel: string;
  /** What the investor is looking at in this module right now. */
  whatYouAreSeeing: string;
  /** Why this matters for verification / accountability. */
  whyItMatters: string;
  /** Honest limitation / disclaimer. Always rendered. */
  honestyNote: string;
  /** Operator next step (no auto-actions). */
  nextAction: string;
  /** Evidence packet preview content (provider chips, signal, validation, etc.). */
  evidencePreview: EvidencePacketPreviewProps;
  /** Optional accent — matches `EnvironmentalServiceCard`. */
  accent?: 'emerald' | 'sky' | 'teal' | 'amber';
  /** Optional container className for layout containment. */
  className?: string;
  /** Optional badge in the top-right (defaults to "Demo Mode"). */
  badgeLabel?: string;
};

const accentBar: Record<NonNullable<InvestorDemoExplainerProps['accent']>, string> = {
  emerald: 'bg-emerald-600',
  sky: 'bg-sky-600',
  teal: 'bg-teal-600',
  amber: 'bg-amber-500',
};

const sectionLabel = 'text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-800';

const InvestorDemoExplainer: React.FC<InvestorDemoExplainerProps> = ({
  title,
  moduleLabel,
  whatYouAreSeeing,
  whyItMatters,
  honestyNote,
  nextAction,
  evidencePreview,
  accent = 'emerald',
  className,
  badgeLabel = 'Demo Mode',
}) => {
  return (
    <article
      aria-label={`Investor demo explainer — ${moduleLabel}`}
      className={`flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className ?? ''}`}
    >
      <div className={`h-1 w-full ${accentBar[accent]}`} aria-hidden />
      <div className="flex flex-col gap-4 p-5">
        <header className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              {moduleLabel}
            </p>
            <h3 className="mt-0.5 text-base font-semibold tracking-tight text-slate-900">{title}</h3>
          </div>
          <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
            {badgeLabel}
          </span>
        </header>

        <section>
          <p className={sectionLabel}>What you are seeing</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-700">{whatYouAreSeeing}</p>
        </section>

        <section>
          <p className={sectionLabel}>Why it matters</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-700">{whyItMatters}</p>
        </section>

        <section>
          <p className={sectionLabel}>Evidence packet preview</p>
          <div className="mt-1.5">
            <EvidencePacketPreview {...evidencePreview} density="compact" />
          </div>
        </section>

        <section className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
          <p className={`${sectionLabel} text-amber-900`}>Honesty / limitation</p>
          <p className="mt-1 text-xs leading-relaxed text-amber-900">{honestyNote}</p>
        </section>

        <section className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
          <p className={`${sectionLabel} text-emerald-900`}>Next action</p>
          <p className="mt-1 text-xs leading-relaxed text-emerald-900">{nextAction}</p>
        </section>
      </div>
    </article>
  );
};

export default InvestorDemoExplainer;
