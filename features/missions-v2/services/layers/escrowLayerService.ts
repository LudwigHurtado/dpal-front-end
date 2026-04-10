import type { LayerExecutionState } from '../../types';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function lockEscrowLayer(prev: LayerExecutionState): Promise<LayerExecutionState> {
  await wait(280);
  return { ...prev, escrow: 'locked' };
}

export async function releaseEscrowLayer(prev: LayerExecutionState): Promise<LayerExecutionState> {
  await wait(280);
  return { ...prev, escrow: 'released' };
}

export async function disputeEscrowLayer(prev: LayerExecutionState): Promise<LayerExecutionState> {
  await wait(280);
  return { ...prev, escrow: 'disputed' };
}
