import type { LayerAction, LayerExecutionState } from '../../types';
import { syncReportLayer } from './reportLayerService';
import { collectEvidenceLayer } from './evidenceLayerService';
import { approveValidationLayer, rejectValidationLayer } from './validationLayerService';
import { lockEscrowLayer, releaseEscrowLayer, disputeEscrowLayer } from './escrowLayerService';
import { startResolutionLayer, resolveCaseLayer } from './resolutionLayerService';
import { recordOutcomeLayer } from './outcomeLayerService';
import { awardReputationLayer } from './reputationLayerService';
import { closeGovernanceLayer } from './governanceLayerService';

export async function runLayerAction(action: LayerAction, prev: LayerExecutionState): Promise<LayerExecutionState> {
  switch (action) {
    case 'syncReport':
      return syncReportLayer(prev);
    case 'collectEvidence':
      return collectEvidenceLayer(prev);
    case 'approveValidation':
      return approveValidationLayer(prev);
    case 'rejectValidation':
      return rejectValidationLayer(prev);
    case 'lockEscrow':
      return lockEscrowLayer(prev);
    case 'releaseEscrow':
      return releaseEscrowLayer(prev);
    case 'disputeEscrow':
      return disputeEscrowLayer(prev);
    case 'startResolution':
      return startResolutionLayer(prev);
    case 'resolveCase':
      return resolveCaseLayer(prev);
    case 'recordOutcome':
      return recordOutcomeLayer(prev);
    case 'awardReputation':
      return awardReputationLayer(prev);
    case 'closeGovernance':
      return closeGovernanceLayer(prev);
    default:
      return prev;
  }
}
