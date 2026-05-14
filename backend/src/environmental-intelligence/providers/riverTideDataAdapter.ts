import type { ProviderAdapter, ProviderRunInput, ProviderRunResult } from '../sources/providerAdapters';
import { PROVIDER_RUN_SAFETY, hasGeo } from '../sources/providerAdapters';

const SOURCE_ID = 'RIVER_TIDE_DATA' as const;

/**
 * Open-Meteo Flood API river discharge screening (global coverage varies).
 * See https://open-meteo.com/en/docs/flood-api
 */
export const riverTideDataAdapter: ProviderAdapter = {
  sourceId: SOURCE_ID,
  canRun: hasGeo,
  async run(input: ProviderRunInput): Promise<ProviderRunResult> {
    const lim = [
      'River discharge model output is not a measured gauge reading unless validated against local telemetry.',
      'Not a legal flood determination and not a substitute for official warnings.',
    ];
    if (!hasGeo(input)) {
      return { sourceId: SOURCE_ID, status: 'unavailable', signals: [], limitations: lim, safetyLabels: PROVIDER_RUN_SAFETY };
    }
    const params = new URLSearchParams({
      latitude: String(input.lat),
      longitude: String(input.lng),
      daily: 'river_discharge',
      forecast_days: '7',
      timezone: 'auto',
    });
    const url = `https://flood-api.open-meteo.com/v1/forecast?${params.toString()}`;
    try {
      const ac = new AbortController();
      const to = setTimeout(() => ac.abort(), 14_000);
      const res = await fetch(url, { signal: ac.signal });
      clearTimeout(to);
      if (!res.ok) {
        return {
          sourceId: SOURCE_ID,
          status: 'unavailable',
          signals: [],
          limitations: [...lim, `Open-Meteo Flood API HTTP ${res.status} (no coverage or upstream error).`],
          safetyLabels: PROVIDER_RUN_SAFETY,
        };
      }
      const body = (await res.json()) as {
        daily?: { river_discharge_max?: number[]; time?: string[] };
        error?: boolean;
        reason?: string;
      };
      if (body.error) {
        return {
          sourceId: SOURCE_ID,
          status: 'unavailable',
          signals: [],
          limitations: [...lim, String(body.reason ?? 'Flood API returned an error for this location.')],
          safetyLabels: PROVIDER_RUN_SAFETY,
        };
      }
      const series = body.daily?.river_discharge_max;
      const first = Array.isArray(series) && series.length ? series[0] : null;
      const st: ProviderRunResult['status'] = typeof first === 'number' && Number.isFinite(first) ? 'partial' : 'unavailable';
      return {
        sourceId: SOURCE_ID,
        status: st,
        signals: [
          {
            key: 'river_discharge_max_d1',
            label: 'River discharge (daily max, day 1, model)',
            value: first,
            unit: 'm³/s',
            confidence: 'requires_validation',
          },
        ],
        evidenceRefs: [{ type: 'open_meteo_flood', label: 'Open-Meteo Flood API — river discharge', url }],
        limitations: lim,
        safetyLabels: PROVIDER_RUN_SAFETY,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'River/tide context request failed';
      return {
        sourceId: SOURCE_ID,
        status: 'error',
        signals: [],
        limitations: [...lim, msg],
        safetyLabels: PROVIDER_RUN_SAFETY,
      };
    }
  },
};
