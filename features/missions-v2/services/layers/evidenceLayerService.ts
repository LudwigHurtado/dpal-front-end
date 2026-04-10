import type { LayerExecutionState } from '../../types';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function collectEvidenceLayer(prev: LayerExecutionState): Promise<LayerExecutionState> {
  await wait(260);
  return { ...prev, evidence: 'collected' };
}
