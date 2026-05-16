import type { HyperspectralPlasticProviderStatusResponse, HyperspectralPlasticScanResponse, PlasticEvidencePacketResponse } from '../types';
import type { LatLngPoint } from './plasticAoiUtils';

export type MissionWorkflowStepId =
  | 'missionType'
  | 'locationAoi'
  | 'satelliteReadiness'
  | 'plasticScan'
  | 'riskReview'
  | 'fieldValidation'
  | 'evidencePacket'
  | 'ledgerAnchor';

export type MissionWorkflowStepStatus =
  | 'not_started'
  | 'in_progress'
  | 'ready'
  | 'complete'
  | 'needs_attention';

export type MissionWorkflowStep = {
  id: MissionWorkflowStepId;
  title: string;
  status: MissionWorkflowStepStatus;
  detail: string;
};

export function computeMissionWorkflowSteps(input: {
  missionTypeSelected: boolean;
  savedPolygon: LatLngPoint[];
  drawingPolygon: boolean;
  providerStatus: HyperspectralPlasticProviderStatusResponse | null;
  providerStatusError: string | null;
  isRunning: boolean;
  lastScan: HyperspectralPlasticScanResponse | null;
  evidence: PlasticEvidencePacketResponse | null;
  lastError: string | null;
}): MissionWorkflowStep[] {
  const hasAoi = input.savedPolygon.length >= 3;
  const aoiStatus: MissionWorkflowStepStatus = input.drawingPolygon
    ? 'in_progress'
    : hasAoi
      ? 'complete'
      : 'not_started';

  let readiness: MissionWorkflowStepStatus = 'not_started';
  let readinessDetail = 'Draw a saved AOI polygon, then check provider readiness.';
  if (hasAoi) {
    if (input.providerStatusError) {
      readiness = 'needs_attention';
      readinessDetail = input.providerStatusError;
    } else if (!input.providerStatus) {
      readiness = 'in_progress';
      readinessDetail = 'Loading provider readiness from API…';
    } else {
      const ps = input.providerStatus;
      const anyReady =
        ps.pace.status === 'ready' ||
        ps.pace.status === 'available' ||
        ps.emit.status === 'ready' ||
        ps.emit.status === 'available' ||
        ps.sentinelLandsat.status === 'ready' ||
        ps.sentinelLandsat.status === 'available';
      readiness = anyReady ? 'ready' : 'needs_attention';
      readinessDetail = `PACE ${ps.pace.status} · EMIT ${ps.emit.status} · Fallback ${ps.sentinelLandsat.status}`;
    }
  }

  let scanStatus: MissionWorkflowStepStatus = 'not_started';
  let scanDetail = 'Scan unlocks after a valid AOI polygon is saved.';
  if (input.isRunning) {
    scanStatus = 'in_progress';
    scanDetail = 'Plastic intelligence scan in progress…';
  } else if (input.lastError && !input.lastScan) {
    scanStatus = 'needs_attention';
    scanDetail = input.lastError;
  } else if (input.lastScan) {
    scanStatus = 'complete';
    scanDetail = `Scan ${input.lastScan.scanId} — ${input.lastScan.plasticRisk.message}`;
  } else if (hasAoi) {
    scanStatus = 'ready';
    scanDetail = 'AOI ready — run plastic intelligence scan when providers look acceptable.';
  }

  let riskStatus: MissionWorkflowStepStatus = 'not_started';
  let riskDetail = 'Review candidate plastic-risk zones after scan.';
  if (input.lastScan) {
    const pending =
      input.lastScan.riskLevel === 'pending_index_extraction' ||
      input.lastScan.plasticRisk.status === 'pending_index_extraction';
    riskStatus = pending ? 'needs_attention' : 'ready';
    riskDetail = pending
      ? 'Metadata retrieved — numeric risk index may still be pending.'
      : 'Open results to review candidate zones and limitations.';
  }

  let fieldStatus: MissionWorkflowStepStatus = 'not_started';
  let fieldDetail = 'Field validation recommended before final claims.';
  if (input.lastScan) {
    fieldStatus = 'needs_attention';
    fieldDetail = 'Schedule drone, photos, or shoreline survey before claiming confirmed plastic.';
  }

  let packetStatus: MissionWorkflowStepStatus = 'not_started';
  let packetDetail = 'Generate evidence packet after scan review.';
  if (input.evidence?.integrityHash) {
    packetStatus = 'complete';
    packetDetail = `Server hash ${input.evidence.integrityHash.slice(0, 16)}…`;
  } else if (input.lastScan) {
    packetStatus = 'ready';
    packetDetail = 'Run Watch DPAL Work or generate preview packet.';
  }

  let ledgerStatus: MissionWorkflowStepStatus = 'not_started';
  let ledgerDetail = 'Blockchain anchoring requires backend ledger integration.';
  if (input.evidence?.integrityHash) {
    ledgerStatus = 'ready';
    ledgerDetail = 'Integrity hash ready — anchor when ledger API is configured.';
  } else if (input.lastScan) {
    ledgerStatus = 'needs_attention';
    ledgerDetail = 'Evidence packet preview available — anchoring unavailable until backend confirms.';
  }

  return [
    {
      id: 'missionType',
      title: 'Mission Type',
      status: input.missionTypeSelected ? 'complete' : 'not_started',
      detail: input.missionTypeSelected ? 'Mission profile selected.' : 'Choose a plastic investigation mission.',
    },
    {
      id: 'locationAoi',
      title: 'Location / AOI',
      status: aoiStatus,
      detail: hasAoi
        ? `Saved polygon — ${input.savedPolygon.length} points.`
        : 'Draw or paste a polygon boundary on the map.',
    },
    {
      id: 'satelliteReadiness',
      title: 'Satellite Readiness',
      status: readiness,
      detail: readinessDetail,
    },
    {
      id: 'plasticScan',
      title: 'Plastic Scan',
      status: scanStatus,
      detail: scanDetail,
    },
    {
      id: 'riskReview',
      title: 'Risk Review',
      status: riskStatus,
      detail: riskDetail,
    },
    {
      id: 'fieldValidation',
      title: 'Field Validation',
      status: fieldStatus,
      detail: fieldDetail,
    },
    {
      id: 'evidencePacket',
      title: 'Evidence Packet',
      status: packetStatus,
      detail: packetDetail,
    },
    {
      id: 'ledgerAnchor',
      title: 'Ledger Anchor',
      status: ledgerStatus,
      detail: ledgerDetail,
    },
  ];
}

export function workflowStatusTone(status: MissionWorkflowStepStatus): string {
  switch (status) {
    case 'complete':
      return 'bg-emerald-500';
    case 'ready':
      return 'bg-sky-500';
    case 'in_progress':
      return 'bg-sky-600 animate-pulse';
    case 'needs_attention':
      return 'bg-amber-500';
    default:
      return 'bg-slate-300';
  }
}

export function workflowStatusLabel(status: MissionWorkflowStepStatus): string {
  switch (status) {
    case 'complete':
      return 'Complete';
    case 'ready':
      return 'Ready';
    case 'in_progress':
      return 'In progress';
    case 'needs_attention':
      return 'Needs attention';
    default:
      return 'Not started';
  }
}
