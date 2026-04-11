import type { LayerAction, LayerExecutionState } from '../../types';
import { getLayerGateReason } from '../layerGating';
import { syncReportLayer } from './reportLayerService';
import { collectEvidenceLayer } from './evidenceLayerService';
import { approveValidationLayer, rejectValidationLayer } from './validationLayerService';
import { startResolutionLayer, resolveCaseLayer } from './resolutionLayerService';
import { recordOutcomeLayer } from './outcomeLayerService';
import { awardReputationLayer } from './reputationLayerService';
import { closeGovernanceLayer } from './governanceLayerService';

export async function runLayerAction(action: LayerAction, prev: LayerExecutionState): Promise<LayerExecutionState> {
  const gate = getLayerGateReason(action, prev);
  if (gate) {
    throw new Error(gate);
  }
  switch (action) {
    case 'syncReport':
      return syncReportLayer(prev);
    case 'collectEvidence':
      return collectEvidenceLayer(prev);
    case 'approveValidation':
      return approveValidationLayer(prev);
    case 'rejectValidation':
      return rejectValidationLayer(prev);
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
