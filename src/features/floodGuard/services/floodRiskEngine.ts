/**
 * DPAL Flood Risk Engine — client-side scoring for the FloodGuard MVP.
 *
 * Backend equivalent will live in `server/services/floodGuard/floodRiskEngine.ts`
 * once the API is implemented. Until then this module powers the dashboard
 * with deterministic, transparent scoring so demos are reproducible.
 *
 * Score formula (0..100):
 *   rainfall intensity        (up to 25)
 *   visual water detection    (up to 20)
 *   river/stream gauge change (up to 15)
 *   satellite water expansion (up to 10)
 *   citizen-report density    (up to 15)
 *   historical vulnerability  (up to 10)
 *   road/school/hospital exposure (up to 10)
 *   - confidence penalties    (up to -10)
 */

import {
  FLOOD_ALERT_LABELS,
  type FloodAlertLevel,
  type FloodCameraDetection,
  type FloodCitizenReport,
  type FloodConfidenceBand,
  type FloodRiskFactor,
  type FloodRiskScore,
  type FloodWeatherSignal,
  type FloodZone,
} from '../floodGuardTypes';

export interface FloodRiskEngineInput {
  zone: FloodZone;
  cameras: FloodCameraDetection[];
  citizenReports: FloodCitizenReport[];
  weather: FloodWeatherSignal | null;
  /** Now in ISO; defaults to `new Date().toISOString()`. */
  asOf?: string;
}

const clamp = (value: number, min: number, max: number): number => {
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
};

function rainfallContribution(weather: FloodWeatherSignal | null): FloodRiskFactor | null {
  if (!weather) return null;
  /** 30m rainfall is the leading indicator; 24h adds context. */
  const burst = clamp(weather.rainfall30mMm / 30, 0, 1) * 18; // up to 18 from 30m
  const sustained = clamp(weather.rainfall24hMm / 100, 0, 1) * 7; // up to 7 from 24h
  const contribution = Math.round(burst + sustained);
  if (contribution <= 0) return null;
  return {
    label: 'Rainfall intensity',
    detail: `${weather.rainfall30mMm.toFixed(0)} mm in last 30 min · ${weather.rainfall24hMm.toFixed(0)} mm in last 24 h`,
    contribution,
  };
}

function cameraContribution(cameras: FloodCameraDetection[]): FloodRiskFactor | null {
  if (!cameras.length) return null;
  const triggers = cameras.filter((c) => ['flash_flood', 'moving_water', 'standing_water', 'river_level_rise'].includes(c.label));
  if (!triggers.length) return null;
  const peakConfidence = Math.max(...triggers.map((c) => c.confidence));
  const breadth = clamp(triggers.length / 3, 0, 1);
  const contribution = Math.round(peakConfidence * 14 + breadth * 6);
  return {
    label: 'Visual water detection',
    detail: `${triggers.length} camera detection(s); peak confidence ${(peakConfidence * 100).toFixed(0)}%`,
    contribution,
  };
}

function waterLevelGaugeContribution(weather: FloodWeatherSignal | null): FloodRiskFactor | null {
  const wl = weather?.waterLevelMeta;
  if (!wl) return null;
  const pctNorm = clamp(wl.levelPercentOfCritical / 100, 0, 1.2);
  let contribution = Math.round(pctNorm * 11);
  if (wl.levelPercentOfCritical >= 100) contribution += 5;
  if (wl.trend === 'rising') contribution += 3;
  if (wl.trend === 'falling') contribution = Math.max(0, contribution - 2);
  const sensitive =
    wl.gaugeType === 'drainage_channel' ||
    wl.gaugeType === 'bridge_underpass_marker' ||
    wl.gaugeType === 'retention_basin';
  if (sensitive) contribution = Math.round(contribution * 1.12);
  contribution = clamp(contribution, 0, 18);
  if (contribution <= 0) return null;
  const sourceTag = wl.isLive ? `live · ${wl.providerLabel}` : `${wl.status} · ${wl.providerLabel}`;
  const detail =
    `Water level ${wl.waterLevelMeters.toFixed(1)}m / ${wl.criticalLevelMeters.toFixed(1)}m critical threshold · ` +
    `${wl.levelPercentOfCritical.toFixed(0)}% of critical · trend ${wl.trend} · ` +
    `${wl.gaugeType.replace(/_/g, ' ')} · source: ${wl.provider} · ${sourceTag}`;
  return {
    label: 'Water level / gauge',
    detail,
    contribution,
  };
}

function riverContribution(weather: FloodWeatherSignal | null): FloodRiskFactor | null {
  if (weather?.waterLevelMeta) return null;
  if (!weather || weather.riverDeltaMeters === undefined) return null;
  if (weather.riverDeltaMeters <= 0) return null;
  const contribution = Math.round(clamp(weather.riverDeltaMeters / 1.5, 0, 1) * 15);
  if (contribution <= 0) return null;
  return {
    label: 'River / stream gauge rise',
    detail: `+${weather.riverDeltaMeters.toFixed(2)} m vs baseline${weather.riverGaugeMeters !== undefined ? ` (now ${weather.riverGaugeMeters.toFixed(2)} m)` : ''}`,
    contribution,
  };
}

function satelliteContribution(weather: FloodWeatherSignal | null): FloodRiskFactor | null {
  if (!weather) return null;
  const sm = weather.satelliteMeta;
  const expansionPct = sm?.waterExpansionPercent ?? weather.satelliteWaterExpansionPct;
  if (expansionPct === undefined || expansionPct <= 0) return null;

  const wet = clamp(sm?.floodWetConfidence ?? 0.65, 0, 1);
  const wetBoost = 0.55 + 0.45 * wet;
  const contribution = Math.round(clamp(expansionPct / 25, 0, 1) * 10 * wetBoost);
  if (contribution <= 0) return null;

  const sourceTag = sm ? `${sm.status} · ${sm.providerLabel}` : 'legacy satelliteWaterExpansionPct';
  const ndwiNote = sm ? `NDWI mean ${sm.ndwiMean.toFixed(2)} · ` : '';

  return {
    label: 'Satellite water expansion',
    detail:
      `${ndwiNote}Satellite water expansion +${expansionPct.toFixed(1)}% · flood-wet confidence ${(wet * 100).toFixed(0)}% · source: ${sourceTag}`,
    contribution,
  };
}

function citizenContribution(reports: FloodCitizenReport[]): FloodRiskFactor | null {
  if (!reports.length) return null;
  const density = clamp(reports.length / 5, 0, 1);
  const photoBoost = reports.some((r) => r.hasPhoto) ? 0.15 : 0;
  const contribution = Math.round((density + photoBoost) * 15);
  return {
    label: 'Citizen reports',
    detail: `${reports.length} report(s) within zone${reports.some((r) => r.hasPhoto) ? '; at least one with photo' : ''}`,
    contribution,
  };
}

function historicalContribution(zone: FloodZone): FloodRiskFactor | null {
  if (!zone.history.length) return null;
  const recent = zone.history.filter((event) => {
    const ageMs = Date.now() - new Date(event.date).getTime();
    return ageMs <= 1000 * 60 * 60 * 24 * 730;
  });
  const score = clamp(recent.length / 3, 0, 1) * 10;
  const contribution = Math.round(score);
  if (contribution <= 0) return null;
  return {
    label: 'Historical flood vulnerability',
    detail: `${recent.length} qualifying event(s) in the last 24 months`,
    contribution,
  };
}

function exposureContribution(zone: FloodZone): FloodRiskFactor | null {
  const { schools, hospitals, shelters, majorRoads, bridges, estimatedResidents } = zone.exposure;
  const points =
    schools * 0.5 +
    hospitals * 1.5 +
    shelters * 0.4 +
    majorRoads * 0.6 +
    bridges * 0.7 +
    Math.min(estimatedResidents / 50_000, 4);
  const contribution = Math.round(clamp(points, 0, 10));
  if (contribution <= 0) return null;
  return {
    label: 'Public infrastructure exposure',
    detail: `${schools} schools · ${hospitals} hospitals · ${majorRoads} major roads · ~${estimatedResidents.toLocaleString()} residents`,
    contribution,
  };
}

function confidencePenalty(input: FloodRiskEngineInput): FloodRiskFactor | null {
  const reasons: string[] = [];
  let penalty = 0;
  if (!input.weather) {
    penalty += 4;
    reasons.push('no rainfall/river feed');
  }
  if (!input.cameras.length) {
    penalty += 3;
    reasons.push('no camera detections');
  }
  if (input.citizenReports.length === 0) {
    penalty += 2;
    reasons.push('no citizen reports');
  }
  if (penalty <= 0) return null;
  return {
    label: 'Confidence penalty',
    detail: `Reduced confidence — ${reasons.join(', ')}`,
    contribution: -Math.min(penalty, 10),
  };
}

function alertLevelFromScore(score: number): FloodAlertLevel {
  if (score >= 90) return 5;
  if (score >= 75) return 4;
  if (score >= 55) return 3;
  if (score >= 35) return 2;
  if (score >= 15) return 1;
  return 0;
}

function confidenceFromInputs(input: FloodRiskEngineInput): FloodConfidenceBand {
  let signals = 0;
  if (input.weather) signals += 1;
  if (input.cameras.length > 0) signals += 1;
  if (input.citizenReports.length > 0) signals += 1;
  if (
    input.weather &&
    (input.weather.satelliteWaterExpansionPct !== undefined || input.weather.satelliteMeta)
  ) {
    signals += 1;
  }
  if (input.weather?.waterLevelMeta) signals += 1;
  if (signals >= 3) return 'high';
  if (signals === 2) return 'medium';
  return 'low';
}

/**
 * Compute a flood risk score for a single zone using all available signals.
 * Output is deterministic given the same input — useful for demos and tests.
 */
export function computeFloodRiskScore(input: FloodRiskEngineInput): FloodRiskScore {
  const factors: FloodRiskFactor[] = [];
  const push = (factor: FloodRiskFactor | null) => { if (factor) factors.push(factor); };

  push(rainfallContribution(input.weather));
  push(cameraContribution(input.cameras));
  push(waterLevelGaugeContribution(input.weather));
  push(riverContribution(input.weather));
  push(satelliteContribution(input.weather));
  push(citizenContribution(input.citizenReports));
  push(historicalContribution(input.zone));
  push(exposureContribution(input.zone));
  push(confidencePenalty(input));

  const total = factors.reduce((acc, factor) => acc + factor.contribution, 0);
  const score = clamp(Math.round(total), 0, 100);
  const level = alertLevelFromScore(score);
  const confidence = confidenceFromInputs(input);

  const reasons = factors
    .filter((f) => f.contribution > 0)
    .sort((a, b) => b.contribution - a.contribution)
    .map((f) => f.label);

  return {
    zoneId: input.zone.zoneId,
    score,
    alertLevel: level,
    alertLabel: FLOOD_ALERT_LABELS[level],
    confidence,
    reasons,
    factors,
    computedAt: input.asOf ?? new Date().toISOString(),
    sourceMode: input.weather || input.cameras.length || input.citizenReports.length ? 'mock_demo' : 'mock_demo',
  };
}

/**
 * Convenience helper: compute scores for a list of zones in a single pass.
 */
export function computeFloodRiskBatch(
  inputs: FloodRiskEngineInput[],
): FloodRiskScore[] {
  return inputs.map(computeFloodRiskScore);
}
