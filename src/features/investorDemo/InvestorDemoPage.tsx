import React from 'react';
import type { View } from '../../../App';
import { ArrowRight } from '../../../components/icons';
import { WATCH_DEEP_LINK_HASH } from '../../../utils/appRoutes';
import {
  DEMO_SCENARIOS,
  demoSourceToneClass,
  demoSourceToneLabel,
  type DemoScenario,
} from '../environmentalIntelligence/shared/demoScenarios';

/**
 * Investor pitch / guided walkthrough at `/investor-demo`.
 *
 * Reuses the existing `DEMO_SCENARIOS` so a single source of truth feeds:
 *   - Environmental Intelligence Hub demo card grid
 *   - This investor pitch page (cards + watch CTAs)
 *
 * Honest by construction: every CTA is operator-driven (no auto-scans),
 * every limitation note is preserved, and the page never asserts a verified
 * result from preview / partial / unavailable lanes.
 */

type Props = {
  onReturn: () => void;
  onNavigate: (view: View) => void;
};

const ACCENT_BAR: Record<NonNullable<DemoScenario['accent']>, string> = {
  emerald: 'bg-emerald-600',
  sky: 'bg-sky-600',
  teal: 'bg-teal-600',
  amber: 'bg-amber-500',
};

const SECTION_LABEL_CLASS = 'text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-800';

type BusinessValueCard = {
  capability: string;
  investorMeaning: string;
  detail: string;
};

const BUSINESS_VALUE: BusinessValueCard[] = [
  {
    capability: 'Satellite monitoring',
    investorMeaning: 'Scales globally',
    detail:
      'AquaScan, Forest Integrity, Hyperspectral Plastic Watch, and Earth Observation use public satellite catalogs (Sentinel, Landsat, PACE, EMIT, FIRMS, GFW) — same software runs from the Amazon to Manila Bay to California refineries.',
  },
  {
    capability: 'Evidence packets',
    investorMeaning: 'Audit / compliance value',
    detail:
      'Each module produces a structured evidence packet with location, AOI, providers used, indices computed, validator state, and honest limitations — ready for analyst review or regulator hand-off.',
  },
  {
    capability: 'QR / hash-ready records',
    investorMeaning: 'Chain-of-custody and public trust',
    detail:
      'Accepted packets receive a SHA-256 integrity hash for tamper-evident archiving. Public verification pages and ledger anchors are available where deployed.',
  },
  {
    capability: 'Provider status strips',
    investorMeaning: 'Transparent data reliability',
    detail:
      'Live, Partial, Preview, Rate limited, and Not connected states are surfaced as the operator works. DPAL never hides upstream gaps to make a screen "look healthy".',
  },
  {
    capability: 'Field OS / Situation Room',
    investorMeaning: 'Action and response system',
    detail:
      'Super Agent proposes a multi-module plan; humans approve each step. Situation Room turns an evidence packet into a coordinated response thread — no auto-publish, no auto-escalation.',
  },
  {
    capability: 'MRV / VIU readiness',
    investorMeaning: 'Future monetization path',
    detail:
      'AquaScan and AFOLU workflows are structured to feed Verified Impact Units. Today they are evidence-support; with accepted standards and validator partners they can support carbon-credit issuance — without replacing external validation.',
  },
];

const EVIDENCE_PIPELINE_STEPS: { id: string; title: string; description: string }[] = [
  {
    id: 'location',
    title: 'Location',
    description: 'Operator picks an AOI or coordinates. Map is the source of truth — no fabricated points.',
  },
  {
    id: 'providers',
    title: 'Provider data',
    description:
      'Configured lanes (e.g. Copernicus, FIRMS, GFW, PACE, EMIT, Landsat) pull live or cached observations with honest tone labels.',
  },
  {
    id: 'signal',
    title: 'Signal review',
    description:
      'Indices and anomalies are summarized. Limitations (scene-level vs zonal, narrow-band gaps) are surfaced, not hidden.',
  },
  {
    id: 'risk',
    title: 'Risk score',
    description:
      'Transparent weighted scores (forest integrity, plastic-risk evidence, water impact) are withheld when lanes are insufficient.',
  },
  {
    id: 'packet',
    title: 'Evidence packet',
    description:
      'AOI metadata, provider lane status, signals, limitations, and operator notes bundle into a reviewable packet.',
  },
  {
    id: 'qrhash',
    title: 'QR / hash',
    description: 'On packet acceptance, DPAL issues a SHA-256 integrity hash and public-verify link where deployed.',
  },
  {
    id: 'response',
    title: 'Mission / response',
    description:
      'Situation Room or Missions V2 turn the packet into a human-approved response — never auto-routed, never auto-published.',
  },
];

const REVENUE_TRACKS: { title: string; subtitle: string; bullets: string[] }[] = [
  {
    title: 'Enterprise compliance',
    subtitle: 'Refinery / utility / mining ESG operators',
    bullets: [
      'CARB / EPA reconciliation audits with cross-source flags',
      'Emissions Integrity Audit (EIAS) drafts with Prisma persistence',
      'Hazardous waste audit lane with EPA / RCRA cross-reference',
    ],
  },
  {
    title: 'City / civic intelligence',
    subtitle: 'Municipal water, flood, air, and forest stewardship',
    bullets: [
      'AquaScan MRV for watershed monitoring and lab-uploaded evidence',
      'FloodGuard verified civic flood intelligence (does not replace official alerts)',
      'Air Quality Control with OpenAQ-based context',
    ],
  },
  {
    title: 'MRV / VIU partnerships',
    subtitle: 'Carbon-credit / water-impact issuance pathway',
    bullets: [
      'AFOLU forest carbon command center with mission launch flows',
      'Verified Water Impact Credits scaffolding',
      'Buyer marketplace + retirement flows for accepted standards',
    ],
  },
];

const InvestorDemoPage: React.FC<Props> = ({ onReturn, onNavigate }) => {
  /**
   * Navigate to a target view with `#watch` so the destination opens its Watch / workflow panel
   * without auto-running a scan. Same helper pattern as the Environmental Intelligence Hub.
   */
  const openWithWatchHash = React.useCallback(
    (view: View) => {
      try {
        if (typeof window !== 'undefined' && window.location.hash !== WATCH_DEEP_LINK_HASH) {
          window.history.replaceState(
            window.history.state,
            '',
            `${window.location.pathname}${window.location.search}${WATCH_DEEP_LINK_HASH}`,
          );
        }
      } catch {
        /* ignore — hash is a soft hint, navigation still proceeds */
      }
      onNavigate(view);
    },
    [onNavigate],
  );

  /** Watch CTAs in the hero — only render for modules that honor `#watch`. */
  const watchCtaScenarios = React.useMemo(
    () => DEMO_SCENARIOS.filter((s) => s.supportsWatchDeepLink),
    [],
  );

  return (
    <div className="animate-fade-in mx-auto max-w-[1400px] px-4 pb-24 font-sans text-slate-900">
      <div className="mt-4 mb-6 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={onReturn}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Back
        </button>
        <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
          Investor Demo Mode
        </span>
      </div>

      {/* ===================== HERO ===================== */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-800">DPAL Environmental Intelligence</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
          DPAL Environmental Intelligence Investor Demo
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-700 md:text-base">
          From location → signal → verification → evidence packet → response.
        </p>
        <p className="mt-4 max-w-3xl text-xs leading-relaxed text-slate-600 md:text-sm">
          DPAL is an <strong>evidence-support system</strong> for environmental accountability. We connect satellite
          monitoring, on-the-ground reports, and validator review into one workflow — and we keep an honest paper trail
          so investors, regulators, and communities can trust what they are seeing. DPAL does not replace official
          government alerts, lab results, or external validation.
        </p>

        {/* CTA row */}
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onNavigate('environmentalIntelligenceHub')}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-900"
          >
            Open Environmental Intelligence Hub
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
          {watchCtaScenarios.map((scenario) => (
            <button
              key={scenario.id}
              type="button"
              onClick={() => openWithWatchHash(scenario.view)}
              title={`Opens ${scenario.moduleLabel} Watch / workflow panel without running a scan.`}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-900 shadow-sm hover:bg-emerald-50"
            >
              {`Watch ${scenario.moduleLabel} Work`}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
      </section>

      {/* ===================== WHAT DPAL DOES ===================== */}
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <h2 className="text-base font-bold text-slate-900 md:text-lg">What DPAL does, in plain English</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <PlainPoint
            title="See"
            body="Open a map, pick a location or AOI, and pull live satellite + public-data context. Honest lane status the entire time."
          />
          <PlainPoint
            title="Verify"
            body="DPAL aggregates evidence (indices, alerts, hotspots, comparisons) and surfaces what is and is not proven."
          />
          <PlainPoint
            title="Respond"
            body="Operator-approved hand-off to Situation Room, Missions, or audit workspaces. Never auto-publish, never auto-escalate."
          />
        </div>
      </section>

      {/* ===================== DEMO SCENARIO SELECTOR ===================== */}
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 md:text-lg">Investor Demo Scenarios</h2>
            <p className="mt-1 max-w-3xl text-[11px] text-slate-600">
              Each card opens an existing DPAL module. &quot;Watch DPAL Work&quot; deep-links to the module&apos;s
              workflow panel so investors see DPAL&apos;s step plan — no scan starts on its own.
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
            {DEMO_SCENARIOS.length} scenarios
          </span>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {DEMO_SCENARIOS.map((scenario) => (
            <InvestorScenarioCard
              key={scenario.id}
              scenario={scenario}
              onOpenDemo={() => onNavigate(scenario.view)}
              onWatchDpalWork={
                scenario.supportsWatchDeepLink ? () => openWithWatchHash(scenario.view) : undefined
              }
            />
          ))}
        </div>
      </section>

      {/* ===================== EVIDENCE PIPELINE ===================== */}
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <h2 className="text-base font-bold text-slate-900 md:text-lg">Evidence Pipeline</h2>
        <p className="mt-1 max-w-3xl text-[11px] text-slate-600">
          The same backbone runs every DPAL environmental module. Investors can follow a packet from raw location to
          QR-ready chain-of-custody — with operator approval gates at each step.
        </p>
        <ol className="mt-5 flex flex-col gap-2 md:flex-row md:flex-wrap md:items-stretch md:gap-3">
          {EVIDENCE_PIPELINE_STEPS.map((step, idx) => (
            <li
              key={step.id}
              className="flex min-w-0 flex-1 items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 md:basis-[calc(50%-0.5rem)] xl:basis-[calc(25%-0.75rem)]"
            >
              <span
                aria-hidden
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-white text-[11px] font-bold text-emerald-800"
              >
                {idx + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-[10px] leading-relaxed text-slate-500">
          Preview until provider and field validation are complete. Final results may differ based on upstream
          availability, validator review, and field sampling.
        </p>
      </section>

      {/* ===================== BUSINESS VALUE ===================== */}
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <h2 className="text-base font-bold text-slate-900 md:text-lg">Business Value</h2>
        <p className="mt-1 max-w-3xl text-[11px] text-slate-600">
          Each DPAL capability maps to a concrete investor outcome — software, data integrity, response, and a path to
          accepted MRV / VIU standards.
        </p>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {BUSINESS_VALUE.map((row) => (
            <article
              key={row.capability}
              className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"
            >
              <p className={SECTION_LABEL_CLASS}>DPAL capability</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{row.capability}</p>
              <p className={`${SECTION_LABEL_CLASS} mt-3`}>Investor meaning</p>
              <p className="mt-1 text-sm text-emerald-900">{row.investorMeaning}</p>
              <p className="mt-3 text-[11px] leading-relaxed text-slate-600">{row.detail}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ===================== REVENUE / PARTNERSHIP ===================== */}
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <h2 className="text-base font-bold text-slate-900 md:text-lg">Revenue model &amp; partnership tracks</h2>
        <p className="mt-1 max-w-3xl text-[11px] text-slate-600">
          DPAL monetizes the workflow, not the providers. Three concrete revenue tracks — enterprise compliance,
          civic intelligence, and MRV / VIU partnerships — share the same evidence backbone.
        </p>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          {REVENUE_TRACKS.map((track) => (
            <article
              key={track.title}
              className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p className={SECTION_LABEL_CLASS}>Track</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{track.title}</p>
              <p className="mt-0.5 text-[11px] text-slate-500">{track.subtitle}</p>
              <ul className="mt-3 space-y-1.5">
                {track.bullets.map((b) => (
                  <li key={b} className="flex gap-2 text-[11px] leading-relaxed text-slate-700">
                    <span aria-hidden className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                    {b}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <p className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-900">
          DPAL is an MRV-ready workflow. It can support carbon-credit issuance through accepted standards, but does not
          replace external validation, regulator decisions, or certified laboratory results.
        </p>
      </section>

      {/* ===================== NEXT STEPS ===================== */}
      <section className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm md:p-6">
        <h2 className="text-base font-bold text-emerald-900 md:text-lg">Next steps / partnership ask</h2>
        <p className="mt-1 max-w-3xl text-xs leading-relaxed text-emerald-900">
          We are looking for design partners across three lanes: a refinery / utility ESG team for CARB / EPA
          reconciliation, a municipal water authority for AquaScan MRV, and an MRV / VIU standard partner for
          forest and water impact unit issuance.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onNavigate('environmentalIntelligenceHub')}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-900"
          >
            Open Environmental Intelligence Hub
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
          {watchCtaScenarios.map((scenario) => (
            <button
              key={`footer-${scenario.id}`}
              type="button"
              onClick={() => openWithWatchHash(scenario.view)}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-900 shadow-sm hover:bg-emerald-100"
            >
              {`Watch ${scenario.moduleLabel} Work`}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
      </section>

      {import.meta.env.DEV ? <DevQaChecklist /> : null}
    </div>
  );
};

/** Plain-English bullet used in the "What DPAL does" row. */
const PlainPoint: React.FC<{ title: string; body: string }> = ({ title, body }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
    <p className={SECTION_LABEL_CLASS}>{title}</p>
    <p className="mt-1.5 text-xs leading-relaxed text-slate-700">{body}</p>
  </div>
);

/** Investor scenario card (mirrors the Hub demo card layout, scoped to this page). */
const InvestorScenarioCard: React.FC<{
  scenario: DemoScenario;
  onOpenDemo: () => void;
  onWatchDpalWork?: () => void;
}> = ({ scenario, onOpenDemo, onWatchDpalWork }) => {
  const accent = scenario.accent ?? 'emerald';
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <div className={`h-1 w-full ${ACCENT_BAR[accent]}`} aria-hidden />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              {scenario.moduleLabel}
            </p>
            <h3 className="mt-0.5 text-sm font-semibold tracking-tight text-slate-900">{scenario.title}</h3>
          </div>
          <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
            Demo
          </span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-slate-600">{scenario.investorExplanation}</p>
        <p className="mt-3 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-700">
          <span className="font-semibold text-slate-800">Location:</span> {scenario.locationLabel}
        </p>
        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Provider sources</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {scenario.providerSources.map((src) => (
              <span
                key={src.id}
                className={demoSourceToneClass(src.tone)}
                title={`${src.label} — ${demoSourceToneLabel(src.tone)}`}
              >
                {src.label}
                <span className="ml-1 opacity-70">· {demoSourceToneLabel(src.tone)}</span>
              </span>
            ))}
          </div>
        </div>
        <p className="mt-3 text-[10px] leading-relaxed text-slate-500">{scenario.limitationNote}</p>
        <div className="mt-auto pt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onOpenDemo}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-900"
          >
            Open Demo
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
          {onWatchDpalWork ? (
            <button
              type="button"
              onClick={onWatchDpalWork}
              title="Opens the module Watch / workflow panel without running a scan."
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-900 shadow-sm hover:bg-emerald-50"
            >
              Watch DPAL Work
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
};

/**
 * Dev-only QA checklist. Visible exclusively when `import.meta.env.DEV` is true so
 * production / investor previews do not show implementation notes.
 */
const DEV_QA_ITEMS: { id: string; label: string }[] = [
  { id: 'open-hub', label: 'Open Environmental Intelligence Hub from the hero — lands on /environmental-intelligence.' },
  { id: 'open-aqua', label: 'Open AquaScan demo from a scenario card — lands on /water/aquascan.' },
  { id: 'open-forest', label: 'Open Forest Integrity demo — lands on /forest-integrity.' },
  { id: 'open-plastic', label: 'Open Plastic Watch demo — lands on /hyperspectral-plastic-watch.' },
  { id: 'watch-aqua', label: 'Watch AquaScan Work — URL ends with #watch, workflow rail scrolls into view, no scan auto-runs.' },
  { id: 'watch-forest', label: 'Watch Forest Integrity Work — #watch persists, Watch DPAL Work side panel opens.' },
  { id: 'watch-plastic', label: 'Watch Plastic Watch Work — #watch persists, side panel opens.' },
  { id: 'limitation', label: 'Every scenario card shows a limitation note (not optional).' },
  { id: 'preview-language', label: 'Evidence pipeline and revenue copy use Preview / Partial / MRV-ready language honestly.' },
  { id: 'mobile', label: 'Resize to ~375 px — cards stack, CTAs wrap, no horizontal scroll.' },
];

const DevQaChecklist: React.FC = () => (
  <section className="mt-8 rounded-2xl border border-dashed border-violet-300 bg-violet-50 p-5 shadow-sm">
    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-800">Dev-only QA checklist</p>
    <p className="mt-1 text-[11px] text-violet-900">
      Visible only when <code className="rounded bg-white px-1 py-0.5 text-[10px] text-violet-800">import.meta.env.DEV</code>{' '}
      is true. Use this list before sending the investor link.
    </p>
    <ul className="mt-3 space-y-1.5">
      {DEV_QA_ITEMS.map((item) => (
        <li key={item.id} className="flex items-start gap-2 text-[11px] leading-relaxed text-violet-900">
          <span aria-hidden className="mt-1 inline-block h-3 w-3 shrink-0 rounded-sm border border-violet-300 bg-white" />
          {item.label}
        </li>
      ))}
    </ul>
  </section>
);

export default InvestorDemoPage;
