import type {
  AuditConfidenceInputs,
  AuditDiscrepancyIndex,
  CalculationResults,
  EmissionsIndustry,
  RiskLevel,
} from '../types/emissionsIntegrity.types';

const safePct = (baseline: number, current: number): number => {
  if (!Number.isFinite(baseline) || baseline <= 0) return 0;
  return ((baseline - current) / baseline) * 100;
};

const safeDivide = (numerator: number, denominator: number): number => {
  if (!Number.isFinite(denominator) || denominator <= 0) return 0;
  return numerator / denominator;
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export const getIndustryWeights = (industry: EmissionsIndustry): Record<string, number> => {
  switch (industry) {
    case 'Oil & Gas':
      return { methane: 0.35, no2: 0.2, activity: 0.15, intensity: 0.3, co2: 0 };
    case 'Power Plant':
      return { methane: 0.05, no2: 0.3, activity: 0.25, intensity: 0.25, co2: 0.15 };
    case 'Cement':
      return { methane: 0.05, no2: 0.2, activity: 0.15, intensity: 0.3, co2: 0.3 };
    case 'Agriculture / AFOLU':
      return { methane: 0.15, no2: 0.1, activity: 0.3, intensity: 0.15, co2: 0.3 };
    default:
      return { methane: 0.2, no2: 0.2, activity: 0.2, intensity: 0.25, co2: 0.15 };
  }
};

export interface CalculationInputs {
  industry: EmissionsIndustry;
  baselineReportedEmissions: number;
  currentReportedEmissions: number;
  baselineMethaneScore: number;
  currentMethaneScore: number;
  baselineNO2Score: number;
  currentNO2Score: number;
  baselineActivityProxyScore: number;
  currentActivityProxyScore: number;
  baselineProductionOutput: number;
  currentProductionOutput: number;
  co2ContextScore: number;
}

export function calculateAuditResults(input: CalculationInputs): CalculationResults {
  const weights = getIndustryWeights(input.industry);
  const reportedReductionPct = safePct(input.baselineReportedEmissions, input.currentReportedEmissions);
  const methaneChangePct = safePct(input.baselineMethaneScore, input.currentMethaneScore);
  const no2ChangePct = safePct(input.baselineNO2Score, input.currentNO2Score);
  const activityProxyChangePct = safePct(input.baselineActivityProxyScore, input.currentActivityProxyScore);
  const baselineIntensity = safeDivide(input.baselineReportedEmissions, input.baselineProductionOutput);
  const currentIntensity = safeDivide(input.currentReportedEmissions, input.currentProductionOutput);
  const intensityReductionPct = safePct(baselineIntensity, currentIntensity);
  const observedReductionPct =
    methaneChangePct * weights.methane +
    no2ChangePct * weights.no2 +
    activityProxyChangePct * weights.activity +
    intensityReductionPct * weights.intensity +
    input.co2ContextScore * weights.co2;
  const discrepancyGap = reportedReductionPct - observedReductionPct;

  const interpretation =
    `The company reported a ${reportedReductionPct.toFixed(1)}% reduction, ` +
    `but observed methane/activity indicators suggest a ${observedReductionPct.toFixed(1)}% reduction. ` +
    `This creates a ${Math.abs(discrepancyGap).toFixed(1)}-point discrepancy gap requiring review.`;

  return {
    reportedReductionPct,
    methaneChangePct,
    no2ChangePct,
    activityProxyChangePct,
    baselineIntensity,
    currentIntensity,
    intensityReductionPct,
    observedReductionPct,
    discrepancyGap,
    interpretation,
  };
}

export function hasMinimumAuditData(input: CalculationInputs): boolean {
  return (
    input.baselineReportedEmissions > 0 &&
    input.baselineMethaneScore > 0 &&
    input.baselineNO2Score > 0 &&
    input.baselineProductionOutput > 0 &&
    input.currentProductionOutput > 0
  );
}

export function calculateAdi(
  calculationResults: CalculationResults,
  confidenceInputs: AuditConfidenceInputs,
  industry: EmissionsIndustry,
  hasRequiredData = true,
): AuditDiscrepancyIndex {
  const weights = getIndustryWeights(industry);
  const credibilityPenalty = clamp(Math.abs(calculationResults.discrepancyGap) * 1.8, 0, 55);
  const methaneConsistency = clamp(100 - Math.abs(calculationResults.reportedReductionPct - calculationResults.methaneChangePct), 0, 100);
  const no2Consistency = clamp(100 - Math.abs(calculationResults.reportedReductionPct - calculationResults.no2ChangePct), 0, 100);
  const activityConsistency = clamp(100 - Math.abs(calculationResults.reportedReductionPct - calculationResults.activityProxyChangePct), 0, 100);
  const intensityConsistency = clamp(100 - Math.abs(calculationResults.reportedReductionPct - calculationResults.intensityReductionPct), 0, 100);
  const confidenceScore = Math.round(
    (confidenceInputs.dataConfidence +
      confidenceInputs.satelliteDataConfidence +
      confidenceInputs.regulatoryDataConfidence +
      confidenceInputs.weatherQaConfidence) /
      4,
  );

  const consistencyScore =
    methaneConsistency * weights.methane +
    no2Consistency * weights.no2 +
    activityConsistency * weights.activity +
    intensityConsistency * weights.intensity +
    confidenceInputs.regulatoryDataConfidence * 0.075 +
    confidenceInputs.satelliteDataConfidence * 0.075 +
    confidenceInputs.weatherQaConfidence * 0.05;

  const score = Math.round(clamp(100 - credibilityPenalty * 0.65 + consistencyScore * 0.35 + confidenceScore * 0.15 - 20, 0, 100));

  let riskLevel: RiskLevel = 'Low / Consistent';
  const absoluteGap = Math.abs(calculationResults.discrepancyGap);
  if (!hasRequiredData || confidenceScore < 40) {
    riskLevel = 'Needs More Data';
  } else if (absoluteGap > 25) {
    riskLevel = 'High / Material Discrepancy';
  } else if (absoluteGap > 10) {
    riskLevel = 'Medium / Needs Review';
  } else if (absoluteGap <= 10 && confidenceScore >= 70) {
    riskLevel = 'Low / Consistent';
  } else {
    riskLevel = 'Medium / Needs Review';
  }

  return {
    score,
    riskLevel,
    weights,
    confidenceScore,
  };
}
