import React, { useMemo } from 'react';
import { CarbonPuraHeader } from './components/CarbonPuraHeader';
import { LiveModuleLaunchGrid } from './components/LiveModuleLaunchGrid';
import { LiveProviderStatusPanel } from './components/LiveProviderStatusPanel';
import { PaceProductIntelligenceLayerPanel } from './components/PaceProductIntelligenceLayerPanel';
import { CarbonPuraLiveWorkflowPanel } from './components/CarbonPuraLiveWorkflowPanel';
import { WaterPlasticFusionPanel } from './components/WaterPlasticFusionPanel';
import { LiveVerificationChecklist } from './components/LiveVerificationChecklist';
import { LiveModuleVerificationMatrix } from './components/LiveModuleVerificationMatrix';
import { IntegrityRadarPanel } from './components/IntegrityRadarPanel';
import { EvidencePacketAggregationPanel } from './components/EvidencePacketAggregationPanel';
import { ComplianceRegistryReadinessPanel } from './components/ComplianceRegistryReadinessPanel';
import { CarbonPuraEvidenceDraftPanel } from './components/CarbonPuraEvidenceDraftPanel';
import { CarbonPuraChainOfEvidencePanel } from './components/CarbonPuraChainOfEvidencePanel';
import { useCarbonPuraEvidenceChain } from './hooks/useCarbonPuraEvidenceChain';
import { CARBONPURA_LIVE_ENGINES } from './carbonPuraModuleRegistry';
import { useCarbonPuraLiveStatus } from './hooks/useCarbonPuraLiveStatus';
import { useCarbonPuraEvidenceDraft } from './hooks/useCarbonPuraEvidenceDraft';
import { isPaceMatrixEntry } from './paceProductSuites';

type CarbonPuraWorkspaceProps = {
  onReturn?: () => void;
  onOpenView?: (viewKey: string) => void;
};

type SummaryCard = {
  id: string;
  label: string;
  value: string;
  detail: string;
};

export default function CarbonPuraWorkspace({ onReturn, onOpenView }: CarbonPuraWorkspaceProps) {
  const liveStatus = useCarbonPuraLiveStatus();
  const evidenceDraft = useCarbonPuraEvidenceDraft();
  const evidenceChain = useCarbonPuraEvidenceChain();
  const liveSourceCount = liveStatus.sources.filter((s) => s.status === 'live').length;
  const partialSourceCount = liveStatus.sources.filter((s) => s.status === 'partial').length;

  const paceLaneStatus = useMemo(() => {
    const paceRows = liveStatus.sources.filter(isPaceMatrixEntry);
    if (paceRows.length === 0) return null;
    const priority: Array<(typeof paceRows)[0]['status']> = [
      'live',
      'partial',
      'metadata_only',
      'planned',
      'future',
      'unavailable',
    ];
    for (const status of priority) {
      if (paceRows.some((r) => r.status === status)) return status;
    }
    return paceRows[0]?.status ?? null;
  }, [liveStatus.sources]);

  const summaryCards: SummaryCard[] = [
    {
      id: 'active-projects',
      label: 'Active Projects',
      value: 'Pending',
      detail:
        'Shared project context across partner modules is pending wiring. Module-native workflows open live engines now.',
    },
    {
      id: 'connected-modules',
      label: 'Connected DPAL Modules',
      value: String(CARBONPURA_LIVE_ENGINES.length),
      detail: 'Confirmed SPA routes — CarbonPura launches DPAL engines on their native workspaces.',
    },
    {
      id: 'fusion',
      label: 'Monitoring Sources',
      value: liveStatus.loading ? '…' : String(liveStatus.sources.length),
      detail: liveStatus.loading
        ? 'Loading provider / source matrix…'
        : `${liveSourceCount} live · ${partialSourceCount} partial · ${liveStatus.sources.length} sources (each with reason).`,
    },
    {
      id: 'evidence-draft',
      label: 'Evidence chain',
      value: evidenceChain.backendAvailable
        ? `${evidenceChain.events.length} event${evidenceChain.events.length === 1 ? '' : 's'}`
        : 'Local only',
      detail: evidenceChain.backendAvailable
        ? `Backend ${evidenceChain.persistenceMode} · ${evidenceDraft.selectedSourceSuites.length} local suite selection(s).`
        : 'PACE suites in local draft — backend aggregation unavailable on current API host.',
    },
    {
      id: 'integrity-alerts',
      label: 'Integrity Alerts',
      value: 'Pending',
      detail: 'Planned GeoLedger / overlap / double-counting checks are connection-pending at hub layer.',
    },
    {
      id: 'evidence-packets',
      label: 'Evidence Packets',
      value: evidenceChain.hasDraftPacket ? 'Draft' : 'Pending',
      detail: evidenceChain.hasDraftPacket
        ? 'Draft packet on backend — not validator-approved. QR/export pending.'
        : 'Draft packet API available when evidence events exist; no fabricated combined packet.',
    },
    {
      id: 'validator-reviews',
      label: 'Validator Reviews',
      value: 'Pending',
      detail: 'Validator queue surfaces inside operational modules (e.g., Water Operations Engine).',
    },
    {
      id: 'article6',
      label: 'Article 6 Readiness',
      value: 'Pending',
      detail: 'DPAL prepares evidence-backed records for registry workflows. Article 6 authorization remains with authorities.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 md:py-8">
        <CarbonPuraHeader onReturn={onReturn} />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {summaryCards.map((card) => (
            <div
              key={card.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{card.value}</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">{card.detail}</p>
            </div>
          ))}
        </div>

        <LiveModuleLaunchGrid onOpenView={onOpenView} />

        <CarbonPuraLiveWorkflowPanel />

        <WaterPlasticFusionPanel />

        <PaceProductIntelligenceLayerPanel paceLaneStatus={paceLaneStatus} evidenceDraft={evidenceDraft} />

        <CarbonPuraChainOfEvidencePanel evidenceChain={evidenceChain} evidenceDraft={evidenceDraft} />

        <CarbonPuraEvidenceDraftPanel evidenceDraft={evidenceDraft} evidenceChain={evidenceChain} />

        <LiveProviderStatusPanel evidenceDraft={evidenceDraft} />

        <IntegrityRadarPanel />

        <EvidencePacketAggregationPanel />

        <ComplianceRegistryReadinessPanel />

        <LiveVerificationChecklist />

        <LiveModuleVerificationMatrix />
      </div>
    </div>
  );
}
