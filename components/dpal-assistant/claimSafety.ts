import type { DpalProjectClaimSafety, DpalProjectWorkflowState } from './projectGuideTypes';

export const DEFAULT_UNSAFE_CLAIMS = [
  'This proves illegal deforestation.',
  'This proves pollution.',
  'This is a verified carbon credit.',
  'This proves liability.',
  'This is final regulatory evidence.',
];

export function buildClaimSafety(workflowState: DpalProjectWorkflowState): DpalProjectClaimSafety {
  const stage = String(workflowState.processingStage ?? '');
  const status = String(workflowState.signalStatus ?? '').toLowerCase();
  const hasEvidencePacket = Boolean(workflowState.evidencePacket);
  const hasMission = Boolean(workflowState.missionCreated);
  const hasMetric =
    ['ndviChange', 'nbrChange', 'ndmiChange', 'ndwiChange'].some(
      (key) => typeof workflowState.metrics?.[key] === 'number',
    );

  const canMakeClaim =
    stage === 'field_verified'
    && (status === 'verified' || status === 'partially_verified')
    && hasEvidencePacket
    && hasMission
    && hasMetric;

  return {
    canMakeClaim,
    safeClaimLanguage: canMakeClaim
      ? 'DPAL has remote-sensing indicators with supporting verification artifacts. Review scope and limitations before legal or regulatory submission.'
      : 'DPAL detected a remote-sensing screening signal that may indicate change and requires field verification before strong claims.',
    unsafeClaimLanguage: DEFAULT_UNSAFE_CLAIMS,
  };
}

