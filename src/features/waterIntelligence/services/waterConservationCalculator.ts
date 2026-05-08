import type { ConservationCalculation, ConservationCalculationInput } from './waterIntelligenceTypes';

export function computeConservation(input: ConservationCalculationInput): ConservationCalculation {
  const grossSavedAF = input.baselineConsumptiveUseAF - input.currentConsumptiveUseAF;
  const adjustedSavedAF =
    grossSavedAF -
    input.rainfallAdjustmentAF -
    input.returnFlowAdjustmentAF -
    input.validatorAdjustmentAF;
  const uncertaintyBufferAF = Math.max(0, adjustedSavedAF * (input.uncertaintyBufferPercent / 100));
  const netVerifiedConservationAF = adjustedSavedAF - uncertaintyBufferAF;
  const eligibleVWCU = Math.floor(Math.max(0, netVerifiedConservationAF));

  return {
    ...input,
    grossSavedAF,
    adjustedSavedAF,
    uncertaintyBufferAF,
    netVerifiedConservationAF,
    eligibleVWCU,
  };
}
