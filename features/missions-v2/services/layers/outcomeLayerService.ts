import type { LayerExecutionState } from '../../types';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function recordOutcomeLayer(prev: LayerExecutionState): Promise<LayerExecutionState> {
  await wait(240);
  return { ...prev, outcome: 'recorded' };
}
