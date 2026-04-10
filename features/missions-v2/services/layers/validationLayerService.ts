import type { LayerExecutionState } from '../../types';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function approveValidationLayer(prev: LayerExecutionState): Promise<LayerExecutionState> {
  await wait(280);
  return { ...prev, validation: 'approved' };
}

export async function rejectValidationLayer(prev: LayerExecutionState): Promise<LayerExecutionState> {
  await wait(280);
  return { ...prev, validation: 'rejected' };
}
