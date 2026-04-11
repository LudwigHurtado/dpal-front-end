/**
 * Escrow state transitions are implemented in `useMissionWorkspaceV2` + `EscrowConditionsSector`,
 * not as generic layer toggles. This module is kept for backwards compatibility with older imports.
 */
import type { LayerExecutionState } from '../../types';

export async function lockEscrowLayer(prev: LayerExecutionState): Promise<LayerExecutionState> {
  return prev;
}

export async function releaseEscrowLayer(prev: LayerExecutionState): Promise<LayerExecutionState> {
  return prev;
}

export async function disputeEscrowLayer(prev: LayerExecutionState): Promise<LayerExecutionState> {
  return prev;
}
