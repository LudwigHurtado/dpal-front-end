import type { LayerExecutionState } from '../../types';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function syncReportLayer(prev: LayerExecutionState): Promise<LayerExecutionState> {
  await wait(220);
  return { ...prev, report: 'synced' };
}
