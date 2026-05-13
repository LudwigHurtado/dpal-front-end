import React, { useMemo } from 'react';
import {
  Activity,
  Database,
  FileCode,
  Globe,
  Hash,
  Layout,
  List,
  Search,
  ShieldCheck,
} from '../../../../components/icons';
import {
  SATELLITE_SOURCE_REGISTRY,
  getSatelliteRegistryGroupLabel,
  type SatelliteRegistryGroup,
  type SatelliteRegistrySourceStatus,
} from './satelliteSourceRegistry';

const GROUP_ORDER: SatelliteRegistryGroup[] = [
  'ocean_water',
  'forests_carbon',
  'atmosphere_emissions',
  'heat_land_future',
  'ground_truth_public',
];

function statusPillClass(status: SatelliteRegistrySourceStatus): string {
  switch (status) {
    case 'live':
      return 'bg-emerald-50 text-emerald-900 border border-emerald-200';
    case 'partial':
      return 'bg-sky-50 text-sky-900 border border-sky-200';
    case 'metadata_only':
      return 'bg-slate-100 text-slate-800 border border-slate-200';
    case 'planned':
      return 'bg-amber-50 text-amber-950 border border-amber-200';
    case 'future':
      return 'bg-violet-50 text-violet-900 border border-violet-200';
    default:
      return 'bg-slate-50 text-slate-600 border border-slate-200';
  }
}

const WORKFLOW_STEPS: Array<{
  title: string;
  explanation: string;
  Icon: React.FC<{ className?: string }>;
}> = [
  {
    title: 'Collect',
    explanation: 'Ingest satellite metadata, public datasets, disclosures, field uploads, and community reports.',
    Icon: Database,
  },
  {
    title: 'Normalize',
    explanation: 'Map every lane to AOI, time, units, and confidence vocabulary — no silent upgrades.',
    Icon: Layout,
  },
  {
    title: 'Cross-Compare',
    explanation: 'Layer optical, thermal, emissions context, and ground truth without collapsing uncertainty.',
    Icon: Globe,
  },
  {
    title: 'Test Company Claims',
    explanation: 'Compare disclosure text to observations using legally safe labels — never auto-guilt.',
    Icon: Search,
  },
  {
    title: 'Detect Anomalies',
    explanation: 'Flag satellite-indicated divergences as review leads, not final legal findings.',
    Icon: Activity,
  },
  {
    title: 'Score Confidence',
    explanation: 'Explainable heuristics — metadata-only vs multi-source-supported is explicit.',
    Icon: List,
  },
  {
    title: 'Generate Evidence Packet',
    explanation: 'Coordinate-linked, time-stamped bundle with limitations and recommended actions.',
    Icon: FileCode,
  },
  {
    title: 'Write Audit Trail',
    explanation: 'Preserve hashes, validator state, and preview vs live provenance for accountability.',
    Icon: Hash,
  },
];

export const SatelliteAccountabilityInfographic: React.FC = () => {
  const grouped = useMemo(() => {
    return GROUP_ORDER.map((g) => ({
      group: g,
      label: getSatelliteRegistryGroupLabel(g),
      entries: SATELLITE_SOURCE_REGISTRY.filter(
        (e) => e.group === g || (e.additionalGroups?.includes(g) ?? false),
      ),
    }));
  }, []);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-sky-50 px-6 py-8 md:px-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">DPAL disclosure integrity</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
          DPAL Satellite Intelligence + Blockchain Accountability
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
          Multi-source anomaly detection for carbon, pollution, forests, water, methane, and corporate disclosure
          integrity.
        </p>
        <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-900">
          <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
          The satellite is not the product — the trusted evidence infrastructure is the product.
        </p>
      </header>

      <section className="px-6 py-8 md:px-10">
        <h2 className="text-lg font-semibold text-slate-900">Data sources</h2>
        <p className="mt-1 text-xs text-slate-500">
          Registry reflects deployment reality in this repo — planned or future lanes stay labeled.
        </p>
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {grouped.map(({ group, label, entries }) => (
            <article
              key={group}
              className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-inner"
            >
              <h3 className="text-sm font-semibold text-slate-900">{label}</h3>
              <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1 text-xs">
                {entries.map((e) => (
                  <li
                    key={`${group}-${e.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white bg-white px-3 py-2 shadow-sm"
                  >
                    <span className="font-medium text-slate-800">{e.label}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusPillClass(e.status)}`}>
                      {e.status.replace(/_/g, ' ')}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50/50 px-6 py-8 md:px-10">
        <h2 className="text-lg font-semibold text-slate-900">How DPAL Detects Anomalies</h2>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {WORKFLOW_STEPS.map((step) => (
            <div key={step.title} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 text-sky-800">
                <step.Icon className="h-5 w-5" aria-hidden />
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-900">{step.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{step.explanation}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 py-8 md:px-10">
        <h2 className="text-lg font-semibold text-slate-900">Examples of anomalies (illustrative)</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
          <li>Methane plume context near a facility with no matching disclosure narrative.</li>
          <li>Forest loss or biomass decline signals compared to carbon-credit or conservation claims.</li>
          <li>Harmful algal bloom risk or coastal water-quality deterioration vs water disclosures.</li>
          <li>Plastic or pollution confidence screening near coastal activity — evidence-support only.</li>
          <li>Flood extent, land movement, or heat stress signals not reflected in contemporaneous reports.</li>
        </ul>
      </section>

      <section className="border-t border-slate-200 bg-white px-6 py-8 md:px-10">
        <h2 className="text-lg font-semibold text-slate-900">Outcome comparison</h2>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5">
            <h3 className="text-sm font-semibold text-emerald-950">Aligned / Honest Reporting</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-xs leading-relaxed text-emerald-900">
              <li>Claim appears consistent with available evidence.</li>
              <li>Lower anomaly score with documented satellite and record context.</li>
              <li>Evidence packet supports transparency and audit readiness.</li>
              <li>Validator review may confirm consistency — still not a legal certification.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-orange-200 bg-orange-50/50 p-5">
            <h3 className="text-sm font-semibold text-orange-950">Unaligned / Risky Reporting</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-xs leading-relaxed text-orange-950">
              <li>Observed conditions may conflict with disclosures — potential mismatch language only.</li>
              <li>Unexplained methane, forest loss, pollution, or water anomalies flagged for review.</li>
              <li>Higher anomaly score means higher review priority — not a fraud verdict.</li>
              <li>Field validation or qualified enforcement review recommended when signals persist.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50 px-6 py-8 md:px-10">
        <h2 className="text-lg font-semibold text-slate-900">DPAL output</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {['Anomaly Score', 'Evidence Packet', 'Validator Review', 'Blockchain Audit Record'].map((title) => (
            <div key={title} className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
              <p className="text-sm font-semibold text-slate-900">{title}</p>
              <p className="mt-2 text-xs text-slate-500">Structured, confidence-labeled, reviewer-first.</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-xs leading-relaxed text-slate-600">
          DPAL turns advanced satellite science into coordinate-linked, time-stamped, confidence-labeled evidence that
          people can review, verify, and trust.
        </p>
      </section>
    </div>
  );
};

export default SatelliteAccountabilityInfographic;
