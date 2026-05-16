import React, { useEffect, useState } from 'react';
import { PlatformTopCommandBar } from '../../../components/platform/PlatformTopCommandBar';
import { NodeConnectionCard } from '../../../components/platform/NodeConnectionCard';
import { ComplianceTimeline } from '../../../components/platform/ComplianceTimeline';
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

/**
 * Carbon & MRV workspace — aligned with Planetary Intelligence platform chrome (light shell, white cards, command bar).
 */
export default function CarbonCompliancePage({
  onNavigate,
  onOpenMobileNav,
  useMobileLayout,
}: CarbonCompliancePageProps): React.ReactElement {
  const [cadTrustPing, setCadTrustPing] = useState<'idle' | 'ok' | 'error'>('idle');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiUrl(API_ROUTES.CADTRUST_HEALTH), { method: 'GET' });
        if (!cancelled) setCadTrustPing(res.ok ? 'ok' : 'error');
      } catch {
        if (!cancelled) setCadTrustPing('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cadLabel =
    cadTrustPing === 'ok' ? 'CAD Trust probe reachable' : cadTrustPing === 'error' ? 'CAD Trust probe unreachable' : 'CAD Trust probe pending';

  const cadTone: StatusChipTone =
    cadTrustPing === 'ok' ? 'success' : cadTrustPing === 'error' ? 'warning' : 'neutral';

  return (
    <div className="min-h-screen bg-slate-100/90 pb-24">
      <div className="mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <PlatformTopCommandBar onOpenMobileNav={useMobileLayout ? onOpenMobileNav : undefined} />

        {/* Workspace hero — matches planetary home card tone */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-lg shadow-slate-900/[0.06]">
          <div className="border-b border-slate-100 bg-gradient-to-br from-white via-slate-50/80 to-emerald-50/30 px-6 py-8 sm:px-8 sm:py-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-800">Planetary Intelligence · Carbon &amp; MRV</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Carbon &amp; MRV</h1>
                <p className="mt-3 text-sm font-semibold tracking-wide text-teal-800 sm:text-base">Monitor. Verify. Detect. Protect.</p>
                <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-[15px]">
                  Monitor, verify and report carbon activities with precision and integrity. CarbonPura orchestration, CAD Trust posture, registry
                  storytelling, and audit-ready outputs—without changing underlying API routes.
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <StatusChip tone="success" label="Workspace active" />
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
                <SystemOverviewCard title="Projects" value="54" subtitle="Tracked" />
                <SystemOverviewCard title="Packets" value="1,245" subtitle="Evidence" />
                <SystemOverviewCard title="Nodes" value="12" subtitle="Linked" />
              </div>
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <NodeConnectionCard
              title="CAD Trust Node · Observer readiness"
              statusLabel={cadLabel}
              statusTone={cadTone}
              lines={[
                { label: 'Health route', value: API_ROUTES.CADTRUST_HEALTH },
                { label: 'API host', value: 'Uses current VITE_API_BASE resolution' },
                { label: 'Evidence posture', value: 'Packets generated per-module; attach CAD Trust metadata downstream.' },
              ]}
              actions={
                <>
                  <button
                    type="button"
                    onClick={() => onNavigate('carbonPuraWorkspace')}
                    className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-slate-900/15 transition hover:bg-slate-800"
                  >
                    Connect to CarbonPura workspace
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('previewEvidencePacket')}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50/50"
                  >
                    Generate / preview evidence packet
                  </button>
                </>
              }
            />

            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-md shadow-slate-900/[0.04] sm:p-8">
              <h2 className="text-sm font-semibold text-slate-900">Compliance workflow</h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Milestones mirror operator readiness—human gates remain on risk review and publication.
              </p>
              <div className="mt-6">
                <ComplianceTimeline
                  steps={[
                    {
                      id: 'intake',
                      title: 'Project & facility intake',
                      detail: 'Bind AOIs, operators, and registry identifiers.',
                      state: 'done',
                    },
                    {
                      id: 'monitor',
                      title: 'MRV monitoring window',
                      detail: 'Satellite + IoT hooks via DPAL engines.',
                      state: 'current',
                    },
                    {
                      id: 'risk',
                      title: 'AI risk review',
                      detail: 'Anomaly queues stay human-gated.',
                      state: 'upcoming',
                    },
                    {
                      id: 'validators',
                      title: 'Validator review',
                      detail: 'Reviewer Node compatible payloads.',
                      state: 'upcoming',
                    },
                    {
                      id: 'packet',
                      title: 'Evidence packet & ledger references',
                      detail: 'Immutable hashes align with transparency DB workflows.',
                      state: 'upcoming',
                    },
                  ]}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-md shadow-slate-900/[0.04]">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">VIU readiness</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                Verified Impact Units tie to evidence completeness scores inside module-native dashboards. Use Carbon MRV and offsets flows for
                buyer-ready narratives.
              </p>
              <button
                type="button"
                className="mt-4 text-sm font-semibold text-emerald-800 hover:text-emerald-950 hover:underline"
                onClick={() => onNavigate('carbonMRV')}
              >
                Open Carbon MRV →
              </button>
            </div>
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-md shadow-slate-900/[0.04]">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Registry connectivity</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                Sync storytelling across offsets marketplace, Carbon HQ, and partner workspaces—without breaking legacy civic routes.
              </p>
            </div>
          </div>
        </div>

        <WorkspaceSection
          title="Launchpads"
          description="Deep links into DPAL engines referenced by CarbonPura playbooks."
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
          </div>
        </WorkspaceSection>
      </div>
    </div>
  );
}
