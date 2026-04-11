import type { LayerAction, LayerExecutionState } from '../types';

/**
 * Returns a user-facing reason if the action is not allowed in the current pipeline, or null if allowed.
 * Linear pipeline: report sync → evidence → validation → escrow → resolution → outcome → reputation → governance.
 */
export function getLayerGateReason(action: LayerAction, layers: LayerExecutionState): string | null {
  switch (action) {
    case 'syncReport':
      return layers.report === 'ready' ? null : 'Report layer already synced.';
    case 'collectEvidence':
      return layers.report === 'synced' ? null : 'Sync the report layer first.';
    case 'approveValidation':
    case 'rejectValidation':
      return layers.evidence === 'collected'
        ? null
        : 'Collect evidence before validation.';
    case 'lockEscrow':
      if (layers.validation !== 'approved') return 'Validation must be approved before locking escrow.';
      if (layers.escrow !== 'pending') return 'Escrow is already advanced past lock.';
      return null;
    case 'releaseEscrow':
      return layers.escrow === 'locked' ? null : 'Lock escrow before release.';
    case 'disputeEscrow':
      return layers.escrow === 'locked' ? null : 'Escrow must be locked to open a dispute.';
    case 'startResolution':
      if (layers.escrow !== 'released' && layers.escrow !== 'disputed') {
        return 'Release or dispute escrow before starting resolution.';
      }
      return layers.resolution === 'idle' ? null : 'Resolution already started or finished.';
    case 'resolveCase':
      return layers.resolution === 'in_progress' ? null : 'Start resolution before resolving the case.';
    case 'recordOutcome':
      return layers.resolution === 'resolved' ? null : 'Resolve the case before recording outcome.';
    case 'awardReputation':
      return layers.outcome === 'recorded' ? null : 'Record outcome before awarding reputation.';
    case 'closeGovernance':
      return layers.reputation === 'awarded' ? null : 'Award reputation before closing governance.';
    default:
      return 'Unknown layer action.';
  }
}
