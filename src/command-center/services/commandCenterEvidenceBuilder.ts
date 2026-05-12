import type {
  ClaimSafetyLabels,
  CommandCenterOrchestrationResult,
  EvidencePacketDraft,
  EvidencePacketDraftSectionId,
} from '../types';

const DEFAULT_CLAIM: ClaimSafetyLabels = {
  pendingVerification: true,
  humanVerified: false,
  blockchainAnchored: false,
};

function sectionLines(
  sectionId: EvidencePacketDraftSectionId,
  orchestration: CommandCenterOrchestrationResult | undefined,
): string[] {
  if (!orchestration) {
    if (sectionId === 'location') return ['No Command Center run attached — add context or run a preview first.'];
    return ['—'];
  }
  const { context, results } = orchestration;
  switch (sectionId) {
    case 'location':
      return [
        `Location: ${context.locationDescription}`,
        `Coordinates: ${context.latitude.toFixed(5)}, ${context.longitude.toFixed(5)} · Radius ${context.radiusKm} km`,
        `Window: ${context.baselineDateIso} → ${context.currentDateIso}`,
        context.goal ? `Goal: ${context.goal}` : 'Goal: (not set)',
      ];
    case 'moduleResults':
      return results.map((r) => `${r.headline} [${r.status}]`);
    case 'evidenceRefs':
      return results.flatMap((r) => r.evidenceRefs.map((e) => `${r.moduleKey}: ${e.label}${e.href ? ` (${e.href})` : ''}`));
    case 'limitations':
      return results.flatMap((r) => r.limitations.map((l) => `${r.moduleKey}: ${l}`));
    case 'claimSafety':
      return [
        'pending_verification: true',
        'human_verified: false (unless reviewer workflow confirms)',
        'blockchain_anchored: false (unless a chain record exists)',
      ];
    case 'humanReview':
      return ['Human review: not requested from Command Center preview (attach reviewer workflow separately).'];
    case 'blockchain':
      return ['Blockchain: no hash recorded from this preview-only export.'];
    case 'dronePhoto':
      return ['Drone / photo evidence: add in module workspaces or attach files in Situation Room — not bundled here.'];
    case 'waterEvidence':
      return results
        .filter((r) => r.moduleKey === 'water')
        .map((r) => r.headline);
    case 'satelliteEvidence':
      return results
        .filter((r) => r.moduleKey === 'earthObservation' || r.moduleKey === 'forestIntegrity' || r.moduleKey === 'plasticWatch')
        .map((r) => r.headline);
    case 'pollutionEvidence':
      return results
        .filter((r) => r.moduleKey === 'pollutionAudit')
        .map((r) => r.headline);
    default:
      return ['—'];
  }
}

export function buildEvidencePacketPreview(opts: {
  title: string;
  includedSectionIds: EvidencePacketDraftSectionId[];
  orchestration?: CommandCenterOrchestrationResult;
}): EvidencePacketDraft {
  const createdAtIso = new Date().toISOString();
  const lines: string[] = [];
  for (const id of opts.includedSectionIds) {
    lines.push(`## ${id}`);
    lines.push(...sectionLines(id, opts.orchestration));
    lines.push('');
  }
  return {
    id: `cc-ep-${Date.now()}`,
    title: opts.title,
    createdAtIso,
    includedSectionIds: opts.includedSectionIds,
    orchestration: opts.orchestration,
    claimSafety: DEFAULT_CLAIM,
    humanReviewStatus: 'not_requested',
    blockchainStatus: 'none',
    exportNote:
      'Preview-only export from DPAL Command Center. Does not assert verification, anchoring, or publication. Open individual modules for full workflows.',
  };
}

export function evidenceDraftToPreviewText(draft: EvidencePacketDraft): string {
  const header = `${draft.title}\nGenerated: ${draft.createdAtIso}\n${draft.exportNote}\n`;
  if (!draft.orchestration) return header + '(No module run attached)\n';
  const parts: string[] = [header];
  for (const id of draft.includedSectionIds) {
    parts.push(`### ${id}\n`);
    parts.push(sectionLines(id, draft.orchestration).join('\n'));
    parts.push('\n');
  }
  return parts.join('\n');
}
