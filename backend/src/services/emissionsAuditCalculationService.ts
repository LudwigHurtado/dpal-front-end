import type { EmissionsAuditPayloadInput } from '../schemas/emissionsAudit';

type IndustryWeights = {
  methane: number;
  productionIntensity: number;
  reportedReduction: number;
  no2Activity: number;
  confidence: number;
  landUseBiomass?: number;
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const safePercentChange = (baseline: number, current: number): number => {
  if (!Number.isFinite(baseline) || baseline <= 0) return 0;
  return ((baseline - current) / baseline) * 100;
};

const safeDivide = (numerator: number, denominator: number): number => {
  if (!Number.isFinite(denominator) || denominator <= 0) return 0;
  return numerator / denominator;
};

export function calculateReportedReduction(baselineCO2e: number, currentCO2e: number): number {
  return safePercentChange(baselineCO2e, currentCO2e);
}

export function calculateMethaneChange(baselineMethaneScore: number, currentMethaneScore: number): number {
  return safePercentChange(baselineMethaneScore, currentMethaneScore);
}

export function calculateNO2Change(baselineNO2Score: number, currentNO2Score: number): number {
  return safePercentChange(baselineNO2Score, currentNO2Score);
}

export function calculateEmissionIntensity(emissions: number, output: number): number {
  return safeDivide(emissions, output);
}

export function calculateIntensityReduction(baselineIntensity: number, currentIntensity: number): number {
  return safePercentChange(baselineIntensity, currentIntensity);
}

export function calculateOverallConfidence(input: EmissionsAuditPayloadInput['confidence']): number {
  const value =
    (input.satelliteConfidence + input.regulatoryConfidence + input.weatherQAConfidence) / 3;
  return Math.round(clamp(value, 0, 100));
}

export function getIndustryWeights(industry: EmissionsAuditPayloadInput['industry']): IndustryWeights {
  switch (industry) {
    case 'Oil & Gas':
      return { methane: 0.35, productionIntensity: 0.25, reportedReduction: 0.15, no2Activity: 0.15, confidence: 0.1 };
    case 'Power Plant':
      return { methane: 0.05, productionIntensity: 0.25, reportedReduction: 0.3, no2Activity: 0.3, confidence: 0.1 };
    case 'Cement':
      return { methane: 0.05, productionIntensity: 0.3, reportedReduction: 0.35, no2Activity: 0.2, confidence: 0.1 };
    case 'Mining':
      return { methane: 0.1, productionIntensity: 0.25, reportedReduction: 0.25, no2Activity: 0.25, confidence: 0.15 };
    case 'Agriculture / AFOLU':
      return { methane: 0.1, productionIntensity: 0.2, reportedReduction: 0.2, no2Activity: 0.2, confidence: 0.15, landUseBiomass: 0.35 };
    default:
      return { methane: 0.2, productionIntensity: 0.25, reportedReduction: 0.25, no2Activity: 0.2, confidence: 0.1 };
  }
}

export function calculateObservedReduction(args: {
  industry: EmissionsAuditPayloadInput['industry'];
  methaneChangePct: number;
  no2ChangePct: number;
  intensityReductionPct: number;
  landUseBiomassPlaceholder?: number;
}): number {
  const weights = getIndustryWeights(args.industry);
  const landUseWeight = weights.landUseBiomass ?? 0;
  const observedWeightTotal = weights.methane + weights.no2Activity + weights.productionIntensity + landUseWeight;
  if (observedWeightTotal <= 0) return 0;
  const observedScore =
    args.methaneChangePct * weights.methane +
    args.no2ChangePct * weights.no2Activity +
    args.intensityReductionPct * weights.productionIntensity +
    (args.landUseBiomassPlaceholder ?? 0) * landUseWeight;
  return observedScore / observedWeightTotal;
}

export function calculateDiscrepancyGap(reportedReductionPct: number, observedReductionPct: number): number {
  return reportedReductionPct - observedReductionPct;
}

export function calculateADI(args: {
  industry: EmissionsAuditPayloadInput['industry'];
  reportedReductionPct: number;
  methaneChangePct: number;
  no2ChangePct: number;
  intensityReductionPct: number;
  overallConfidence: number;
  observedReductionPct: number;
}): number {
  const weights = getIndustryWeights(args.industry);
  const reportedConsistency = clamp(100 - Math.abs(args.reportedReductionPct - args.observedReductionPct), 0, 100);
  const methaneConsistency = clamp(100 - Math.abs(args.reportedReductionPct - args.methaneChangePct), 0, 100);
  const no2Consistency = clamp(100 - Math.abs(args.reportedReductionPct - args.no2ChangePct), 0, 100);
  const intensityConsistency = clamp(100 - Math.abs(args.reportedReductionPct - args.intensityReductionPct), 0, 100);
  const landUseComponent = reportedConsistency;

  const weightedTotal =
    methaneConsistency * weights.methane +
    intensityConsistency * weights.productionIntensity +
    reportedConsistency * weights.reportedReduction +
    no2Consistency * weights.no2Activity +
    args.overallConfidence * weights.confidence +
    landUseComponent * (weights.landUseBiomass ?? 0);

  return Math.round(clamp(weightedTotal, 0, 100));
}

export function calculateRiskLevel(discrepancyGap: number, overallConfidence: number): 'Low' | 'Medium' | 'High' | 'Needs More Data' {
  const absoluteGap = Math.abs(discrepancyGap);
  if (overallConfidence < 40) return 'Needs More Data';
  if (absoluteGap <= 10 && overallConfidence >= 70) return 'Low';
  if (absoluteGap > 25) return 'High';
  if (absoluteGap > 10) return 'Medium';
  return 'Low';
}

export function runEmissionsAuditCalculations(payload: EmissionsAuditPayloadInput) {
  const baselineCO2e = payload.reportedData?.baselineCO2e ?? 0;
  const currentCO2e = payload.reportedData?.currentCO2e ?? 0;
  const methaneChangePct = calculateMethaneChange(
    payload.satelliteData?.baselineMethaneScore ?? 0,
    payload.satelliteData?.currentMethaneScore ?? 0,
  );
  const no2ChangePct = calculateNO2Change(
    payload.satelliteData?.baselineNO2Score ?? 0,
    payload.satelliteData?.currentNO2Score ?? 0,
  );
  const reportedReductionPct = calculateReportedReduction(baselineCO2e, currentCO2e);
  const baselineIntensity = calculateEmissionIntensity(
    baselineCO2e,
    payload.productionData?.baselineOutput ?? 0,
  );
  const currentIntensity = calculateEmissionIntensity(
    currentCO2e,
    payload.productionData?.currentOutput ?? 0,
  );
  const intensityReductionPct = calculateIntensityReduction(baselineIntensity, currentIntensity);
  const overallConfidence = calculateOverallConfidence(payload.confidence);
  const observedReductionPct = calculateObservedReduction({
    industry: payload.industry,
    methaneChangePct,
    no2ChangePct,
    intensityReductionPct,
    landUseBiomassPlaceholder: payload.industry === 'Agriculture / AFOLU' ? reportedReductionPct * 0.5 : 0,
  });
  const discrepancyGap = calculateDiscrepancyGap(reportedReductionPct, observedReductionPct);
  const auditDiscrepancyIndex = calculateADI({
    industry: payload.industry,
    reportedReductionPct,
    methaneChangePct,
    no2ChangePct,
    intensityReductionPct,
    overallConfidence,
    observedReductionPct,
  });
  const riskLevel = calculateRiskLevel(discrepancyGap, overallConfidence);

  return {
    calculations: {
      reportedReductionPct,
      methaneChangePct,
      no2ChangePct,
      baselineIntensity,
      currentIntensity,
      intensityReductionPct,
      observedReductionPct,
      discrepancyGap,
      auditDiscrepancyIndex,
    },
    confidence: {
      ...payload.confidence,
      overallConfidence,
    },
    riskLevel,
  };
}
