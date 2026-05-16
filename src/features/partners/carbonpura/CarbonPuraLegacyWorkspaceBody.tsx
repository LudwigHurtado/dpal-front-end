import React, { useMemo, useState } from 'react';
import { CarbonPuraHeader } from './components/CarbonPuraHeader';
import { CarbonPuraSectionNav, type CarbonPuraViewMode } from './components/CarbonPuraSectionNav';
import { CarbonPuraProjectMapPanel } from './components/CarbonPuraProjectMapPanel';
import { CarbonPuraNextActionPanel } from './components/CarbonPuraNextActionPanel';
import { CarbonPuraFoldPanel } from './components/CarbonPuraFoldPanel';
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
import { carbonPuraSectionAnchor } from './carbonPuraSections';

type CarbonPuraLegacyWorkspaceBodyProps = {
  onReturn?: () => void;
  onOpenView?: (viewKey: string) => void;
};

type SummaryCard = {
  id: string;
  label: string;
  value: string;
  detail: string;
};

/** Full technical CarbonPura workspace — preserved for operators; mounted below command-center hero. */
export function CarbonPuraLegacyWorkspaceBody({ onReturn, onOpenView }: CarbonPuraLegacyWorkspaceBodyProps) {
  const [viewMode, setViewMode] = useState<CarbonPuraViewMode>('executive');
  const liveStatus = useCarbonPuraLiveStatus();
  const evidenceDraft = useCarbonPuraEvidenceDraft();
  const evidenceChain = useCarbonPuraEvidenceChain();
  const liveSourceCount = liveStatus.sources.filter((s) => s.status === 'live').length;
  const partialSourceCount = liveStatus.sources.filter((s) => s.status === 'partial').length;
  const isTechnical = viewMode === 'technical';

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

  const monitoringSourceCount = liveStatus.loading ? '…' : String(liveStatus.sources.length);

  const summaryCards: SummaryCard[] = [
    {
      id: 'connected-modules',
      label: 'Connected modules',
      value: String(CARBONPURA_LIVE_ENGINES.length),
      detail: 'Confirmed SPA routes — CarbonPura launches DPAL engines on their native workspaces.',
    },
    {
      id: 'fusion',
      label: 'Monitoring sources',
      value: monitoringSourceCount,
      detail: liveStatus.loading
        ? 'Loading provider / source matrix…'
        : `${liveSourceCount} live · ${partialSourceCount} partial · ${monitoringSourceCount} sources (each with reason).`,
    },
    {
      id: 'evidence-draft',
      label: 'Evidence events',
      value: evidenceChain.backendAvailable ? String(evidenceChain.events.length) : 'Local only',
      detail: evidenceChain.backendAvailable
        ? `Backend ${evidenceChain.persistenceMode} · evidence-source events on configured host.`
        : 'Local suite selections — backend aggregation unavailable on current API host.',
    },
    {
      id: 'evidence-packets',
      label: 'Draft packets',
      value: evidenceChain.hasDraftPacket ? 'Draft' : 'Pending',
      detail: evidenceChain.hasDraftPacket
        ? 'Draft packet on backend — not validator-approved. QR living page pending.'
        : 'Draft packet API available when evidence events exist; no fabricated combined packet.',
    },
  ];

  return (
    <div className="space-y-6 border-t border-slate-200 pt-10">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-700">
        Technical workspace — provider matrices, verification QA, and evidence tooling below. Same capabilities as before;
        command-center hero lives above this block.
      </div>

      <CarbonPuraHeader onReturn={onReturn} viewMode={viewMode} onViewModeChange={setViewMode} />

      <CarbonPuraSectionNav viewMode={viewMode} />

      <div id={carbonPuraSectionAnchor('overview')} className="scroll-mt-28 space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {summaryCards.map((card) => (
            <div key={card.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{card.value}</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">{card.detail}</p>
            </div>
          ))}
        </div>

        <CarbonPuraProjectMapPanel />
        <CarbonPuraNextActionPanel />

        {isTechnical ? (
          <CarbonPuraFoldPanel defaultExpanded={false}>
            <CarbonPuraLiveWorkflowPanel />
          </CarbonPuraFoldPanel>
        ) : null}
      </div>

      <div id={carbonPuraSectionAnchor('live-engines')} className="scroll-mt-28">
        <LiveModuleLaunchGrid onOpenView={onOpenView} />
      </div>

      {isTechnical ? (
        <>
          <div id={carbonPuraSectionAnchor('water-plastic')} className="scroll-mt-28">
            <CarbonPuraFoldPanel defaultExpanded>
              <WaterPlasticFusionPanel />
            </CarbonPuraFoldPanel>
          </div>

          <div id={carbonPuraSectionAnchor('pace-products')} className="scroll-mt-28">
            <CarbonPuraFoldPanel defaultExpanded={false}>
              <PaceProductIntelligenceLayerPanel paceLaneStatus={paceLaneStatus} evidenceDraft={evidenceDraft} />
            </CarbonPuraFoldPanel>
          </div>

          <div id={carbonPuraSectionAnchor('provider-matrix')} className="scroll-mt-28">
            <LiveProviderStatusPanel evidenceDraft={evidenceDraft} />
          </div>

          <CarbonPuraFoldPanel defaultExpanded={false}>
            <IntegrityRadarPanel />
          </CarbonPuraFoldPanel>

          <CarbonPuraFoldPanel defaultExpanded={false}>
            <EvidencePacketAggregationPanel />
          </CarbonPuraFoldPanel>
        </>
      ) : null}

      <div id={carbonPuraSectionAnchor('evidence-chain')} className="scroll-mt-28 space-y-6">
        <CarbonPuraChainOfEvidencePanel evidenceChain={evidenceChain} evidenceDraft={evidenceDraft} />
        <CarbonPuraFoldPanel defaultExpanded>
          <CarbonPuraEvidenceDraftPanel evidenceDraft={evidenceDraft} evidenceChain={evidenceChain} />
        </CarbonPuraFoldPanel>
      </div>

      {isTechnical ? (
        <>
          <div id={carbonPuraSectionAnchor('compliance')} className="scroll-mt-28">
            <CarbonPuraFoldPanel defaultExpanded={false}>
              <ComplianceRegistryReadinessPanel />
            </CarbonPuraFoldPanel>
          </div>

          <div id={carbonPuraSectionAnchor('verification')} className="scroll-mt-28 space-y-6">
            <CarbonPuraFoldPanel defaultExpanded={false}>
              <LiveVerificationChecklist />
            </CarbonPuraFoldPanel>
            <CarbonPuraFoldPanel defaultExpanded={false}>
              <LiveModuleVerificationMatrix />
            </CarbonPuraFoldPanel>
          </div>
        </>
      ) : null}
    </div>
  );
}
