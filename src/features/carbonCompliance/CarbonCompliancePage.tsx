import React, { useEffect, useMemo, useState } from 'react';
import { PlatformTopCommandBar } from '../../../components/platform/PlatformTopCommandBar';
import { NodeConnectionCard } from '../../../components/platform/NodeConnectionCard';
import { WorkspaceSection } from '../../../components/platform/WorkspaceSection';
import { WorkspaceToolCard } from '../../../components/platform/WorkspaceToolCard';
import { SystemOverviewCard } from '../../../components/platform/SystemOverviewCard';
import { StatusChip, type StatusChipTone } from '../../../components/platform/StatusChip';
import { apiUrl, API_ROUTES } from '../../../constants';

export interface CarbonCompliancePageProps {
  onNavigate: (view: string) => void;
  onOpenMobileNav?: () => void;
  useMobileLayout?: boolean;
}

type PipelineStageStatus =
  | 'Ready'
  | 'Running'
  | 'Needs Evidence'
  | 'Human Review'
  | 'Verified'
  | 'Ledgered'
  | 'Registry Check';

type CadTrustConnectionMode =
  | 'demo_mode'
  | 'not_connected'
  | 'live_connected'
  | 'timeout'
  | 'request_failed'
  | 'pending';

interface CadTrustHealthPayload {
  ok?: boolean;
  status?: string;
  live?: boolean;
  message?: string;
}

const DEMO_BADGE = 'Demo readiness view';

const PIPELINE_STAGES: { id: string; label: string; status: PipelineStageStatus }[] = [
  { id: 'intake', label: 'Intake', status: 'Ready' },
  { id: 'monitor', label: 'Monitor', status: 'Running' },
  { id: 'detect', label: 'Detect', status: 'Needs Evidence' },
  { id: 'report', label: 'Report', status: 'Human Review' },
  { id: 'verify', label: 'Verify', status: 'Verified' },
  { id: 'ledger', label: 'Ledger', status: 'Ledgered' },
  { id: 'registry', label: 'Registry', status: 'Registry Check' },
];

const SAMPLE_PROJECT = {
  client: 'CarbonPura',
  project: 'Demo forest / blue carbon / emissions project',
  methodology: 'VM0047-style forest restoration (sample)',
  aoiStatus: 'AOI saved · 842 ha polygon (demo)',
  baselineDate: '2024-01-15',
  monitoringDate: '2026-05-10',
  registryRef: 'CAD Trust · org-demo-014 · project CP-DEMO-7',
  claimType: 'Avoided + removed tCO₂e (indicative)',
  evidenceScore: '78%',
};

const EVIDENCE_LAYERS: {
  layer: string;
  source: string;
  status: string;
  timestamp: string;
  confidence: string;
  hash: string;
}[] = [
  {
    layer: 'Satellite observation',
    source: 'Landsat-9 · Planetary Computer (sample)',
    status: 'Partial',
    timestamp: '2026-05-10 08:12 UTC',
    confidence: '0.72',
    hash: 'sha256:obs…4f2a',
  },
  {
    layer: 'NDVI / NBR / biomass calculation',
    source: 'DPAL MRV engine (sample)',
    status: 'Computed',
    timestamp: '2026-05-10 08:18 UTC',
    confidence: '0.68',
    hash: 'sha256:idx…91bc',
  },
  {
    layer: 'IoT / field sensor',
    source: 'Soil moisture pod · demo feed',
    status: 'Needs sync',
    timestamp: '2026-05-09 22:40 UTC',
    confidence: '0.55',
    hash: 'sha256:iot…0e3d',
  },
  {
    layer: 'Drone / field validation',
    source: 'Field team upload (pending)',
    status: 'Awaiting upload',
    timestamp: '—',
    confidence: '—',
    hash: 'packet:pending',
  },
  {
    layer: 'Uploaded documents',
    source: 'Land title + management plan (sample)',
    status: 'On file',
    timestamp: '2026-04-28 14:02 UTC',
    confidence: '0.81',
    hash: 'sha256:doc…77aa',
  },
  {
    layer: 'AI anomaly review',
    source: 'DPAL screening (sample)',
    status: 'Flagged · review',
    timestamp: '2026-05-10 09:01 UTC',
    confidence: '0.64',
    hash: 'sha256:ai…c901',
  },
  {
    layer: 'Human validator review',
    source: 'Technical validator queue',
    status: 'Human review',
    timestamp: 'Scheduled',
    confidence: '—',
    hash: 'review:pending',
  },
  {
    layer: 'Blockchain hash',
    source: 'DPAL transparency ledger (sample)',
    status: 'Anchored (demo)',
    timestamp: '2026-05-10 09:15 UTC',
    confidence: '—',
    hash: '0x8f3c…a21e',
  },
  {
    layer: 'QR evidence packet',
    source: 'Evidence packet builder',
    status: 'Draft',
    timestamp: '2026-05-10 09:20 UTC',
    confidence: '—',
    hash: 'QR:EP-DEMO-7',
  },
  {
    layer: 'CAD Trust / registry metadata',
    source: 'CAD Trust connector',
    status: 'Registry check',
    timestamp: 'Live probe on load',
    confidence: '—',
    hash: 'cad:meta-pending',
  },
];

const ANOMALY_CARDS: {
  title: string;
  severity: 'Low' | 'Medium' | 'High';
  explanation: string;
  action: string;
}[] = [
  {
    title: 'Boundary mismatch risk',
    severity: 'Medium',
    explanation: 'Sample AOI polygon edge differs from registry sketch by ~1.8%. Not verified against cadastral survey.',
    action: 'Reconcile AOI with registry geometry before claim publication.',
  },
  {
    title: 'Missing ground truth',
    severity: 'High',
    explanation: 'Drone / plot validation not uploaded for the current monitoring window.',
    action: 'Schedule field validation or attach third-party audit photos.',
  },
  {
    title: 'Possible duplicate claim',
    severity: 'Medium',
    explanation: 'CAD Trust duplicate check pending — demo placeholder only.',
    action: 'Run registry duplicate scan when live connector is enabled.',
  },
  {
    title: 'Satellite trend conflict',
    severity: 'Low',
    explanation: 'NDVI uptick in sample window conflicts with localized NBR stress signal in sector B.',
    action: 'Review scene cloud mask and split AOI for sector-level narrative.',
  },
  {
    title: 'Registry metadata missing',
    severity: 'Medium',
    explanation: 'Organization and project IDs are sample strings until live CAD Trust sync confirms match.',
    action: 'Map CarbonPura project to CAD Trust organization + project records.',
  },
  {
    title: 'Greenwashing claim risk',
    severity: 'High',
    explanation: 'Marketing copy exceeds evidence completeness score (78%) for removal claims.',
    action: 'Tighten public language to indicative MRV until human validator signs off.',
  },
];

const LEDGER_EVENTS: {
  eventType: string;
  timestamp: string;
  hash: string;
  status: string;
}[] = [
  { eventType: 'Project intake hash', timestamp: '2026-04-20 10:00 UTC', hash: '0x1a2b…c3d4', status: 'Anchored (demo)' },
  { eventType: 'AOI boundary hash', timestamp: '2026-04-20 10:05 UTC', hash: '0x5e6f…7890', status: 'Anchored (demo)' },
  { eventType: 'Satellite observation hash', timestamp: '2026-05-10 08:12 UTC', hash: '0xabcd…ef01', status: 'Anchored (demo)' },
  { eventType: 'AI anomaly hash', timestamp: '2026-05-10 09:01 UTC', hash: '0x2345…6789', status: 'Pending review' },
  { eventType: 'Evidence packet hash', timestamp: '2026-05-10 09:20 UTC', hash: '0x9876…5432', status: 'Draft' },
  { eventType: 'Validator decision hash', timestamp: '—', hash: '0xpending…', status: 'Awaiting human' },
  { eventType: 'Registry sync hash', timestamp: '—', hash: '0xregistry…', status: 'Registry check' },
];

const VALIDATOR_QUEUE: {
  role: string;
  status: string;
  note: string;
}[] = [
  { role: 'AI verifier', status: 'Screening complete (sample)', note: 'Flags anomalies; does not approve claims.' },
  { role: 'Technical validator', status: 'Queued', note: 'MRV methodology + remote sensing checks.' },
  { role: 'Human reviewer', status: 'Required', note: 'Final interpretation of evidence stack.' },
  { role: 'Partner review', status: 'Optional', note: 'CarbonPura partner sign-off when configured.' },
  { role: 'Final publication approval', status: 'Locked', note: 'Publication blocked until human validation completes.' },
];

function pipelineStatusTone(status: PipelineStageStatus): StatusChipTone {
  switch (status) {
    case 'Verified':
    case 'Ledgered':
      return 'success';
    case 'Running':
      return 'info';
    case 'Needs Evidence':
    case 'Human Review':
      return 'warning';
    case 'Registry Check':
      return 'neutral';
    default:
      return 'neutral';
  }
}

function severityTone(severity: 'Low' | 'Medium' | 'High'): StatusChipTone {
  if (severity === 'High') return 'danger';
  if (severity === 'Medium') return 'warning';
  return 'neutral';
}

function evidenceStatusTone(status: string): StatusChipTone {
  if (status.includes('Computed') || status.includes('On file') || status.includes('Anchored')) return 'success';
  if (status.includes('review') || status.includes('Flagged') || status.includes('Partial')) return 'warning';
  if (status.includes('Awaiting') || status.includes('pending') || status.includes('Draft')) return 'neutral';
  return 'info';
}

function parseCadTrustMode(payload: CadTrustHealthPayload | null, fetchError: boolean): CadTrustConnectionMode {
  if (fetchError) return 'request_failed';
  if (!payload) return 'pending';
  const status = (payload.status ?? '').toLowerCase();
  if (status === 'live_connected' || payload.live === true) return 'live_connected';
  if (status === 'demo_mode') return 'demo_mode';
  if (status === 'timeout') return 'timeout';
  if (status === 'request_failed') return 'request_failed';
  if (status === 'not_connected') return 'not_connected';
  return 'not_connected';
}

function cadTrustLabel(mode: CadTrustConnectionMode): string {
  switch (mode) {
    case 'live_connected':
      return 'Live connected';
    case 'demo_mode':
      return 'Demo mode';
    case 'not_connected':
      return 'Not connected';
    case 'timeout':
      return 'Timeout';
    case 'request_failed':
      return 'Request failed';
    default:
      return 'Checking…';
  }
}

function cadTrustTone(mode: CadTrustConnectionMode): StatusChipTone {
  if (mode === 'live_connected') return 'success';
  if (mode === 'demo_mode') return 'info';
  if (mode === 'pending') return 'neutral';
  return 'warning';
}

function DmrvPanel({
  title,
  subtitle,
  badge,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  children: React.ReactNode;
  className?: string;
}): React.ReactElement {
  return (
    <div className={`rounded-2xl border border-slate-200/90 bg-white shadow-md shadow-slate-900/[0.04] ${className}`}>
      <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
            {subtitle ? <p className="mt-1 text-xs leading-relaxed text-slate-500">{subtitle}</p> : null}
          </div>
          {badge ? <StatusChip label={badge} tone="info" dot={false} /> : null}
        </div>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  );
}

function btnPrimary(onClick: () => void, label: string): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-slate-900/15 transition hover:bg-slate-800"
    >
      {label}
    </button>
  );
}

function btnSecondary(onClick: () => void, label: string): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50/50"
    >
      {label}
    </button>
  );
}

/**
 * Carbon dMRV Command Center — investor-ready MRV operating shell with demo/sample state labeling.
 */
export default function CarbonCompliancePage({
  onNavigate,
  onOpenMobileNav,
  useMobileLayout,
}: CarbonCompliancePageProps): React.ReactElement {
  const [cadTrustPayload, setCadTrustPayload] = useState<CadTrustHealthPayload | null>(null);
  const [cadTrustFetchError, setCadTrustFetchError] = useState(false);
  const [cadTrustCheckedAt, setCadTrustCheckedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiUrl(API_ROUTES.CADTRUST_HEALTH), { method: 'GET' });
        const body = (await res.json().catch(() => null)) as CadTrustHealthPayload | null;
        if (!cancelled) {
          setCadTrustPayload(body);
          setCadTrustFetchError(false);
          setCadTrustCheckedAt(new Date().toISOString());
        }
      } catch {
        if (!cancelled) {
          setCadTrustPayload(null);
          setCadTrustFetchError(true);
          setCadTrustCheckedAt(new Date().toISOString());
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cadMode = useMemo(
    () => parseCadTrustMode(cadTrustPayload, cadTrustFetchError),
    [cadTrustPayload, cadTrustFetchError],
  );

  const cadLive = cadMode === 'live_connected';
  const cadStatusLabel = cadTrustLabel(cadMode);
  const cadStatusTone = cadTrustTone(cadMode);

  const cadSyncStatus = cadLive
    ? 'Live sync enabled'
    : cadMode === 'demo_mode'
      ? 'Connector installed · live sync disabled'
      : cadMode === 'pending'
        ? 'Probe pending'
        : 'Not syncing · check API host configuration';

  const lastCheckedDisplay = cadTrustCheckedAt
    ? new Date(cadTrustCheckedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : '—';

  return (
    <div className="min-h-screen bg-slate-100/90 pb-24">
      <div className="mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <PlatformTopCommandBar onOpenMobileNav={useMobileLayout ? onOpenMobileNav : undefined} />

        {/* Hero */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-lg shadow-slate-900/[0.06]">
          <div className="border-b border-slate-100 bg-gradient-to-br from-white via-slate-50/80 to-emerald-50/30 px-6 py-8 sm:px-8 sm:py-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-800">
                  Planetary Intelligence · Carbon dMRV
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                  Carbon dMRV Command Center
                </h1>
                <p className="mt-3 text-sm font-medium leading-relaxed text-teal-900 sm:text-base">
                  Monitor, Report, Verify, Validate, Ledger, and Registry-align carbon evidence.
                </p>
                <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-[15px]">
                  Digital MRV operating view for CarbonPura and DPAL engines — intake through registry alignment with
                  human-gated validation. Sample project state below unless a live API confirms otherwise.
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <StatusChip tone="info" label={DEMO_BADGE} />
                  <StatusChip tone="warning" label="Sample project state" />
                  <button
                    type="button"
                    onClick={() => onNavigate('mainMenu')}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50/50"
                  >
                    ← Platform home
                  </button>
                </div>
              </div>
              <div className="grid w-full shrink-0 grid-cols-1 gap-3 sm:max-w-md sm:grid-cols-3 lg:w-auto lg:min-w-[280px]">
                <SystemOverviewCard title="Evidence score" value={SAMPLE_PROJECT.evidenceScore} subtitle="Sample" />
                <SystemOverviewCard title="Layers" value="10" subtitle="Evidence stack" />
                <SystemOverviewCard title="Anomalies" value="6" subtitle="Open review" />
              </div>
            </div>
          </div>

          {/* Horizontal dMRV pipeline */}
          <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-5 sm:px-8">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">dMRV pipeline</p>
            <div className="mt-4 overflow-x-auto pb-1">
              <div className="flex min-w-[720px] items-stretch gap-0">
                {PIPELINE_STAGES.map((stage, i) => (
                  <React.Fragment key={stage.id}>
                    <div className="flex min-w-[96px] flex-1 flex-col items-center gap-2 px-1">
                      <span className="text-center text-xs font-semibold text-slate-800">{stage.label}</span>
                      <StatusChip label={stage.status} tone={pipelineStatusTone(stage.status)} />
                    </div>
                    {i < PIPELINE_STAGES.length - 1 ? (
                      <span className="flex shrink-0 items-center px-1 text-slate-300" aria-hidden>
                        →
                      </span>
                    ) : null}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Operational grid */}
        <div className="mt-8 grid gap-6 xl:grid-cols-12">
          {/* Project intake */}
          <div className="xl:col-span-3">
            <DmrvPanel title="Project Intake" subtitle="Sample project state — not a verified registry claim." badge={DEMO_BADGE}>
              <dl className="space-y-3 text-sm">
                {(
                  [
                    ['Client', SAMPLE_PROJECT.client],
                    ['Project', SAMPLE_PROJECT.project],
                    ['Methodology', SAMPLE_PROJECT.methodology],
                    ['AOI status', SAMPLE_PROJECT.aoiStatus],
                    ['Baseline date', SAMPLE_PROJECT.baselineDate],
                    ['Monitoring date', SAMPLE_PROJECT.monitoringDate],
                    ['Registry ref', SAMPLE_PROJECT.registryRef],
                    ['Claim type', SAMPLE_PROJECT.claimType],
                    ['Evidence completeness', SAMPLE_PROJECT.evidenceScore],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="border-t border-slate-100 pt-3 first:border-t-0 first:pt-0">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
                    <dd className="mt-1 font-medium text-slate-900">{value}</dd>
                  </div>
                ))}
              </dl>
            </DmrvPanel>
          </div>

          {/* Evidence stack */}
          <div className="xl:col-span-6">
            <DmrvPanel
              title="Evidence Stack"
              subtitle="Layered proof model — timestamps and hashes are illustrative unless live API data is attached."
              badge="Sample project state"
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <th className="pb-2 pr-3">Layer</th>
                      <th className="pb-2 pr-3">Source</th>
                      <th className="pb-2 pr-3">Status</th>
                      <th className="pb-2 pr-3">Timestamp</th>
                      <th className="pb-2 pr-3">Confidence</th>
                      <th className="pb-2">Hash / packet</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {EVIDENCE_LAYERS.map((row) => (
                      <tr key={row.layer} className="align-top">
                        <td className="py-2.5 pr-3 font-semibold text-slate-900">{row.layer}</td>
                        <td className="py-2.5 pr-3 text-slate-600">{row.source}</td>
                        <td className="py-2.5 pr-3">
                          <StatusChip label={row.status} tone={evidenceStatusTone(row.status)} />
                        </td>
                        <td className="py-2.5 pr-3 tabular-nums text-slate-600">{row.timestamp}</td>
                        <td className="py-2.5 pr-3 tabular-nums text-slate-600">{row.confidence}</td>
                        <td className="py-2.5 font-mono text-[11px] text-slate-700">{row.hash}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DmrvPanel>
          </div>

          {/* Anomaly + CAD Trust column */}
          <div className="space-y-6 xl:col-span-3">
            <DmrvPanel title="Anomaly & Integrity Review" subtitle="AI flags require human validation before publication.">
              <ul className="space-y-3">
                {ANOMALY_CARDS.map((card) => (
                  <li key={card.title} className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">{card.title}</p>
                      <StatusChip label={card.severity} tone={severityTone(card.severity)} />
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600">{card.explanation}</p>
                    <p className="mt-2 text-xs font-semibold text-emerald-900">Next: {card.action}</p>
                  </li>
                ))}
              </ul>
            </DmrvPanel>

            <NodeConnectionCard
              title="CAD Trust · Registry connector"
              statusLabel={cadStatusLabel}
              statusTone={cadStatusTone}
              lines={[
                { label: 'Connection mode', value: cadMode.replace(/_/g, ' ') },
                { label: 'Last checked', value: lastCheckedDisplay },
                { label: 'API route', value: API_ROUTES.CADTRUST_HEALTH },
                { label: 'Live sync status', value: cadSyncStatus },
                {
                  label: 'Organizations loaded',
                  value: cadLive ? 'Live probe OK (count not exposed)' : 'Demo placeholder · 3',
                },
                { label: 'Projects matched', value: cadLive ? 'Pending live mapping' : 'Demo placeholder · 1' },
                { label: 'Units checked', value: cadLive ? 'Pending live mapping' : 'Demo placeholder · 0' },
                {
                  label: 'Duplicate claim check',
                  value: cadLive ? 'Run via registry API' : 'Pending / demo',
                },
              ]}
              actions={
                <>
                  {btnPrimary(() => onNavigate('carbonPuraWorkspace'), 'Open CarbonPura workspace')}
                  {btnSecondary(() => onNavigate('previewEvidencePacket'), 'Preview evidence packet')}
                </>
              }
            />
            {cadTrustPayload?.message ? (
              <p className="text-xs text-slate-500">{cadTrustPayload.message}</p>
            ) : null}
          </div>
        </div>

        {/* Blockchain audit trail */}
        <DmrvPanel
          className="mt-8"
          title="Blockchain Audit Trail"
          subtitle="Illustrative ledger feed — not a public blockchain transaction unless your deployment anchors live."
          badge={DEMO_BADGE}
        >
          <ul className="divide-y divide-slate-100">
            {LEDGER_EVENTS.map((evt) => (
              <li key={evt.eventType} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{evt.eventType}</p>
                  <p className="mt-0.5 text-xs tabular-nums text-slate-500">{evt.timestamp}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                  <code className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-700">{evt.hash}</code>
                  <StatusChip label={evt.status} tone={evt.status.includes('Anchored') ? 'success' : 'neutral'} />
                </div>
              </li>
            ))}
          </ul>
        </DmrvPanel>

        {/* Validator queue */}
        <DmrvPanel
          className="mt-6"
          title="Validator Queue"
          subtitle="AI supports review; final claims require human validation."
        >
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {VALIDATOR_QUEUE.map((item) => (
              <li key={item.role} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                <p className="text-sm font-semibold text-slate-900">{item.role}</p>
                <p className="mt-2">
                  <StatusChip label={item.status} tone={item.status.includes('Locked') ? 'warning' : 'info'} />
                </p>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">{item.note}</p>
              </li>
            ))}
          </ul>
        </DmrvPanel>

        {/* Generate audit output */}
        <section className="mt-8 rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-white to-emerald-50/40 p-6 shadow-md shadow-slate-900/[0.04] sm:p-8">
          <h2 className="text-lg font-semibold text-slate-900">Generate Audit Output</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Export-ready actions route into DPAL engines. Evidence packets remain indicative until validators sign off.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {btnPrimary(() => onNavigate('previewEvidencePacket'), 'Generate evidence packet')}
            {btnSecondary(() => onNavigate('carbonMRV'), 'Open Carbon MRV engine')}
            {btnSecondary(() => onNavigate('carbonPuraWorkspace'), 'Open CarbonPura workspace')}
            {btnSecondary(() => onNavigate('transparencyDatabase'), 'Open transparency database')}
            <button
              type="button"
              onClick={() => onNavigate('previewEvidencePacket')}
              className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm font-semibold text-teal-950 shadow-sm transition hover:bg-teal-100/80"
            >
              Export validator summary
            </button>
          </div>
        </section>

        {/* Legacy launchpads */}
        <WorkspaceSection
          title="Connected DPAL Engines"
          description="Deep links into DPAL engines referenced by CarbonPura playbooks — unchanged navigation targets."
          className="mt-12"
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <WorkspaceToolCard
              title="Carbon MRV"
              description="Live adapters when API host exposes /api/carbon/* routes."
              onClick={() => onNavigate('carbonMRV')}
            />
            <WorkspaceToolCard
              title="Carbon HQ"
              description="Portfolio overview + mission bridges."
              onClick={() => onNavigate('dpalCarbon')}
            />
            <WorkspaceToolCard
              title="Offsets marketplace"
              description="Liquidity + retirement simulations."
              onClick={() => onNavigate('offsetMarketplace')}
            />
            <WorkspaceToolCard
              title="Emissions Integrity Audit"
              description="Industrial emissions workflows with evidence packets."
              onClick={() => onNavigate('emissionsIntegrityAudit')}
            />
            <WorkspaceToolCard
              title="Environmental Workspace"
              description="Jump to satellite + water + plastics monitors."
              onClick={() => onNavigate('environmentalWorkspace')}
            />
            <WorkspaceToolCard
              title="Blockchain transparency DB"
              description="Audit trail lookups for filings."
              onClick={() => onNavigate('transparencyDatabase')}
            />
            <WorkspaceToolCard
              title="CarbonPura workspace"
              description="Partner command center for orchestrating DPAL engines."
              onClick={() => onNavigate('carbonPuraWorkspace')}
            />
            <WorkspaceToolCard
              title="Evidence packet preview"
              description="Preview structured disclosure packets before publication."
              onClick={() => onNavigate('previewEvidencePacket')}
            />
          </div>
        </WorkspaceSection>
      </div>
    </div>
  );
}
