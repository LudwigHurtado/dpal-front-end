import type { WaterTransaction } from './waterIntelligenceTypes';
import { COLORADO_MOCK_TRANSACTIONS } from './coloradoRiverMockData';

export function listTransactions(): WaterTransaction[] {
  return COLORADO_MOCK_TRANSACTIONS;
}
