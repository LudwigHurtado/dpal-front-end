import type { LayerExecutionState } from '../../types';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function awardReputationLayer(prev: LayerExecutionState): Promise<LayerExecutionState> {
  await wait(220);
  return { ...prev, reputation: 'awarded' };
}
