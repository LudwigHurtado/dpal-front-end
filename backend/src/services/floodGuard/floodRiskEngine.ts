/**
 * Mirrors `src/features/floodGuard/services/floodRiskEngine.ts` for server-side scoring.
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
} from './floodGuardTypes';

export interface FloodRiskEngineInput {
  zone: FloodZone;
  cameras: FloodCameraDetection[];
  citizenReports: FloodCitizenReport[];
  weather: FloodWeatherSignal | null;
  asOf?: string;
}

const clamp = (value: number, min: number, max: number): number => {
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
};

function rainfallContribution(weather: FloodWeatherSignal | null): FloodRiskFactor | null {
  if (!weather) return null;
  const burst = clamp(weather.rainfall30mMm / 30, 0, 1) * 18;
  const sustained = clamp(weather.rainfall24hMm / 100, 0, 1) * 7;
  const contribution = Math.round(burst + sustained);
  if (contribution <= 0) return null;
  const meta = weather.rainfallMeta;
  const intensity = meta?.intensityMmPerHr ?? weather.rainfall30mMm * 2;
  const sourceTag = meta
    ? meta.status === 'live'
      ? `live · ${meta.providerLabel}`
      : `${meta.status} · ${meta.providerLabel}`
    : 'seeded';
  return {
    label: 'Rainfall intensity',
    detail:
      `${weather.rainfall30mMm.toFixed(0)} mm in last 30 min ` +
      `(~${intensity.toFixed(1)} mm/hr) · ` +
      `${weather.rainfall24hMm.toFixed(0)} mm in last 24 h · ` +
      `source: ${sourceTag}`,
    contribution,
  };
}

function cameraContribution(cameras: FloodCameraDetection[]): FloodRiskFactor | null {
  if (!cameras.length) return null;
  const triggers = cameras.filter((c) =>
    ['flash_flood', 'moving_water', 'standing_water', 'river_level_rise'].includes(c.label),
  );
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

function riverContribution(weather: FloodWeatherSignal | null): FloodRiskFactor | null {
  if (!weather || weather.riverDeltaMeters === undefined) return null;
  if (weather.riverDeltaMeters <= 0) return null;
  const contribution = Math.round(clamp(weather.riverDeltaMeters / 1.5, 0, 1) * 15);
  if (contribution <= 0) return null;
  return {
    label: 'River / stream gauge rise',
    detail: `+${weather.riverDeltaMeters.toFixed(2)} m vs baseline${
      weather.riverGaugeMeters !== undefined ? ` (now ${weather.riverGaugeMeters.toFixed(2)} m)` : ''
    }`,
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
  if (signals >= 3) return 'high';
  if (signals === 2) return 'medium';
  return 'low';
}

export function computeFloodRiskScore(input: FloodRiskEngineInput): FloodRiskScore {
  const factors: FloodRiskFactor[] = [];
  const push = (factor: FloodRiskFactor | null) => {
    if (factor) factors.push(factor);
  };

  push(rainfallContribution(input.weather));
  push(cameraContribution(input.cameras));
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

  const hasLiveWeather = Boolean(input.weather?.capturedAt);
  const sourceMode: FloodRiskScore['sourceMode'] =
    hasLiveWeather || input.cameras.length || input.citizenReports.length ? 'live' : 'mock_demo';

  return {
    zoneId: input.zone.zoneId,
    score,
    alertLevel: level,
    alertLabel: FLOOD_ALERT_LABELS[level],
    confidence,
    reasons,
    factors,
    computedAt: input.asOf ?? new Date().toISOString(),
    sourceMode,
  };
}
