import type { ProviderAdapter, ProviderRunInput, ProviderRunResult } from '../sources/providerAdapters';
import { PROVIDER_RUN_SAFETY, hasGeo } from '../sources/providerAdapters';

const SOURCE_ID = 'WEATHER_DATA' as const;

export const weatherDataAdapter: ProviderAdapter = {
  sourceId: SOURCE_ID,
  canRun: hasGeo,
  async run(input: ProviderRunInput): Promise<ProviderRunResult> {
    const lim = [
      'Open-Meteo forecast is meteorological context only — not emergency dispatch authority.',
    ];
    if (!hasGeo(input)) {
      return { sourceId: SOURCE_ID, status: 'unavailable', signals: [], limitations: lim, safetyLabels: PROVIDER_RUN_SAFETY };
    }
    try {
      const params = new URLSearchParams({
        latitude: String(input.lat),
        longitude: String(input.lng),
        current: 'temperature_2m,relative_humidity_2m,precipitation',
        timezone: 'auto',
      });
      const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
      const ac = new AbortController();
      const to = setTimeout(() => ac.abort(), 12_000);
      const res = await fetch(url, { signal: ac.signal });
      clearTimeout(to);
      if (!res.ok) {
        return {
          sourceId: SOURCE_ID,
          status: 'unavailable',
          signals: [],
          limitations: [...lim, `Open-Meteo HTTP ${res.status}`],
          safetyLabels: PROVIDER_RUN_SAFETY,
        };
      }
      const body = (await res.json()) as {
        current?: { temperature_2m?: number; relative_humidity_2m?: number; precipitation?: number; time?: string };
      };
      const cur = body.current;
      if (!cur || typeof cur.temperature_2m !== 'number') {
        return {
          sourceId: SOURCE_ID,
          status: 'partial',
          signals: [],
          limitations: [...lim, 'Open-Meteo returned no current block for this location.'],
          safetyLabels: PROVIDER_RUN_SAFETY,
        };
      }
      return {
        sourceId: SOURCE_ID,
        status: 'success',
        signals: [
          { key: 'temperature_2m', label: 'Air temperature (2 m)', value: cur.temperature_2m, unit: '°C', confidence: 'medium' },
          {
            key: 'relative_humidity_2m',
            label: 'Relative humidity (2 m)',
            value: cur.relative_humidity_2m ?? null,
            unit: '%',
            confidence: 'medium',
          },
          { key: 'precipitation', label: 'Precipitation (current)', value: cur.precipitation ?? 0, unit: 'mm', confidence: 'medium' },
        ],
        evidenceRefs: [{ type: 'open_meteo', label: 'Open-Meteo forecast', url }],
        limitations: lim,
        safetyLabels: PROVIDER_RUN_SAFETY,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'weather fetch failed';
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
