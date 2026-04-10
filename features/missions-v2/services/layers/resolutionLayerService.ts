import type { LayerExecutionState } from '../../types';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function startResolutionLayer(prev: LayerExecutionState): Promise<LayerExecutionState> {
  await wait(260);
  return { ...prev, resolution: 'in_progress' };
}

export async function resolveCaseLayer(prev: LayerExecutionState): Promise<LayerExecutionState> {
  await wait(260);
  return { ...prev, resolution: 'resolved' };
}
