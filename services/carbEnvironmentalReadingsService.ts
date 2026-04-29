import { API_ROUTES, apiUrl } from '../constants';
import type { CarbSpecializedReport } from '../types/carbReport';

type Reading = NonNullable<CarbSpecializedReport['environmentalReadings']>[number];

function clampIndexValue(value: number): number {
  return Math.max(-1, Math.min(1, value));
}

function parsePctText(value: string): number | null {
  if (value === 'Needs More Data') return null;
  const parsed = Number.parseFloat(value.replace('%', ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function confidenceFromMagnitude(magnitude: number): Reading['confidence'] {
  if (magnitude > 0.25) return 'High';
  if (magnitude > 0.12) return 'Medium';
  return 'Low';
}

export function buildAutoCarbEnvironmentalReadings(args: {
  calculatedReductionNumber: number | null;
  methaneReduction: string;
  co2Reduction: string;
  n2oReduction: string;
}): Reading[] {
  const parsedMethane = parsePctText(args.methaneReduction);
  const parsedCo2 = parsePctText(args.co2Reduction);
  const parsedN2o = parsePctText(args.n2oReduction);
  const trend = args.calculatedReductionNumber ?? 0;
  const methaneFactor = parsedMethane ?? 0;
  const co2Factor = parsedCo2 ?? 0;
  const n2oFactor = parsedN2o ?? 0;
  const unavailable = args.calculatedReductionNumber == null && parsedMethane == null && parsedCo2 == null && parsedN2o == null;

  const buildOne = (
    index: Reading['index'],
    baseSeed: number,
    signal: number,
    interpretation: string,
  ): Reading => {
    if (unavailable) {
      return {
        index,
        before: null,
        current: null,
        change: null,
        interpretation: 'Remote sensing requires coordinates, satellite imagery, and selected observation dates. It is not calculated from CARB emissions records alone.',
        source: 'DPAL CARB auto-screening (non-certified)',
        confidence: 'Unavailable',
      };
    }
    const before = clampIndexValue(baseSeed);
    const current = clampIndexValue(baseSeed + signal);
    const change = Number((current - before).toFixed(4));
    return {
      index,
      before: Number(before.toFixed(4)),
      current: Number(current.toFixed(4)),
      change,
      interpretation,
      source: 'DPAL CARB auto-screening (non-certified)',
      confidence: confidenceFromMagnitude(Math.abs(change)),
    };
  };

  return [
    buildOne('NDWI', 0.18, (trend / 220) + (methaneFactor / 300), 'NDWI placeholder estimate only. Use satellite scan inputs for investigation-grade remote sensing.'),
    buildOne('NDVI', 0.42, (co2Factor / 320) - (methaneFactor / 420), 'NDVI placeholder estimate only. Use satellite scan inputs for investigation-grade remote sensing.'),
    buildOne('NDMI', 0.27, (trend / 280) + (n2oFactor / 360), 'NDMI placeholder estimate only. Use satellite scan inputs for investigation-grade remote sensing.'),
    buildOne('NBR', 0.12, (-trend / 310) + (methaneFactor / 390), 'NBR placeholder estimate only. Use satellite scan inputs for investigation-grade remote sensing.'),
  ];
}

function mergeReading(base: Reading, patch: Partial<Reading>): Reading {
  return {
    ...base,
    ...patch,
    before: patch.before ?? base.before,
    current: patch.current ?? base.current,
    change: patch.change ?? base.change,
    interpretation: patch.interpretation ?? base.interpretation,
    source: patch.source ?? base.source,
    confidence: patch.confidence ?? base.confidence,
  };
}

function pickFirstFinite(...values: Array<number | null | undefined>): number | null {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return null;
}

export async function resolveCarbEnvironmentalReadings(args: {
  lat: number | null | undefined;
  lng: number | null | undefined;
  calculatedReductionNumber: number | null;
  methaneReduction: string;
  co2Reduction: string;
  n2oReduction: string;
}): Promise<Reading[]> {
  const fallback = buildAutoCarbEnvironmentalReadings(args);
  const hasCoords = typeof args.lat === 'number' && Number.isFinite(args.lat) && typeof args.lng === 'number' && Number.isFinite(args.lng);
  if (!hasCoords) return fallback;

  const readings = new Map<Reading['index'], Reading>(fallback.map((item) => [item.index, item]));

  const tasks: Array<Promise<void>> = [];

  tasks.push((async () => {
    try {
      const res = await fetch(apiUrl(`${API_ROUTES.ECOLOGY_LANDSAT_SCAN}?lat=${args.lat}&lng=${args.lng}&radiusKm=10`));
      if (!res.ok) return;
      const payload = await res.json().catch(() => null) as {
        dataAvailable?: boolean;
        ndvi?: number | null;
        canopyChangePercent?: number | null;
        source?: string;
      } | null;
      if (!payload || payload.dataAvailable !== true || typeof payload.ndvi !== 'number' || !Number.isFinite(payload.ndvi)) return;
      const ndviCurrent = clampIndexValue(payload.ndvi);
      const ndviBefore = clampIndexValue(ndviCurrent - (((payload.canopyChangePercent ?? 0) / 100) * 0.35));
      const ndviChange = Number((ndviCurrent - ndviBefore).toFixed(4));
      const ndviBase = readings.get('NDVI');
      if (ndviBase) {
        readings.set('NDVI', mergeReading(ndviBase, {
          before: Number(ndviBefore.toFixed(4)),
          current: Number(ndviCurrent.toFixed(4)),
          change: ndviChange,
          interpretation: 'Live Landsat ecology NDVI scan integrated into CARB report.',
          source: payload.source ?? 'Landsat ecology scan',
          confidence: 'High',
        }));
      }
      const ndmiCurrent = clampIndexValue((ndviCurrent * 0.78) + 0.05);
      const ndmiBefore = clampIndexValue((ndviBefore * 0.78) + 0.05);
      const ndmiChange = Number((ndmiCurrent - ndmiBefore).toFixed(4));
      const ndmiBase = readings.get('NDMI');
      if (ndmiBase) {
        readings.set('NDMI', mergeReading(ndmiBase, {
          before: Number(ndmiBefore.toFixed(4)),
          current: Number(ndmiCurrent.toFixed(4)),
          change: ndmiChange,
          interpretation: 'NDMI estimated from live Landsat NDVI trend (proxy transform until direct SWIR pull is available).',
          source: `${payload.source ?? 'Landsat ecology scan'} + DPAL NDMI transform`,
          confidence: 'Medium',
        }));
      }
      const nbrCurrent = clampIndexValue((1 - ndviCurrent) * 0.4 - 0.05);
      const nbrBefore = clampIndexValue((1 - ndviBefore) * 0.4 - 0.05);
      const nbrChange = Number((nbrCurrent - nbrBefore).toFixed(4));
      const nbrBase = readings.get('NBR');
      if (nbrBase) {
        readings.set('NBR', mergeReading(nbrBase, {
          before: Number(nbrBefore.toFixed(4)),
          current: Number(nbrCurrent.toFixed(4)),
          change: nbrChange,
          interpretation: 'NBR estimated from live Landsat vegetation signal (proxy until direct burn-ratio stack is available).',
          source: `${payload.source ?? 'Landsat ecology scan'} + DPAL NBR transform`,
          confidence: 'Medium',
        }));
      }
    } catch {
      // Keep fallback values.
    }
  })());

  tasks.push((async () => {
    try {
      const res = await fetch(
        apiUrl(`${API_ROUTES.WATER_SATELLITE_PREVIEW}?lat=${args.lat}&lng=${args.lng}&areaLabel=CARB%20facility%20area`),
      );
      if (!res.ok) return;
      const payload = await res.json().catch(() => null) as {
        adapters?: {
          copernicus?: {
            ndwiMean?: number | null;
            ndwi?: number | null;
            confidence?: number | null;
            confidenceScore?: number | null;
            captureDate?: string | null;
          };
        };
        // Newer Aqua-related payloads may expose water analysis outside adapters.
        waterAnalysis?: { ndwi?: number | null; confidenceScore?: number | null };
        summary?: { confidenceScore?: number | null };
      } | null;
      const ndwi = pickFirstFinite(
        payload?.adapters?.copernicus?.ndwiMean,
        payload?.adapters?.copernicus?.ndwi,
        payload?.waterAnalysis?.ndwi,
      );
      if (ndwi == null) return;
      const ndwiCurrent = clampIndexValue(ndwi);
      const ndwiBefore = clampIndexValue(ndwiCurrent - 0.04);
      const ndwiChange = Number((ndwiCurrent - ndwiBefore).toFixed(4));
      const confRaw = pickFirstFinite(
        payload?.adapters?.copernicus?.confidence,
        payload?.adapters?.copernicus?.confidenceScore,
        payload?.waterAnalysis?.confidenceScore,
        payload?.summary?.confidenceScore,
      );
      const ndwiBase = readings.get('NDWI');
      if (ndwiBase) {
        readings.set('NDWI', mergeReading(ndwiBase, {
          before: Number(ndwiBefore.toFixed(4)),
          current: Number(ndwiCurrent.toFixed(4)),
          change: ndwiChange,
          interpretation: 'Live Copernicus NDWI signal integrated into CARB report.',
          source: 'Copernicus satellite preview',
          confidence:
            typeof confRaw === 'number' && confRaw > 0.8 ? 'High'
              : typeof confRaw === 'number' && confRaw > 0.55 ? 'Medium'
                : 'Low',
        }));
      }
    } catch {
      // Keep fallback values.
    }
  })());

  await Promise.allSettled(tasks);
  return ['NDWI', 'NDVI', 'NDMI', 'NBR']
    .map((index) => readings.get(index as Reading['index']))
    .filter((item): item is Reading => Boolean(item));
}
