import type { ProviderAdapter, ProviderRunInput, ProviderRunResult } from '../sources/providerAdapters';
import { PROVIDER_RUN_SAFETY, hasGeo } from '../sources/providerAdapters';

const SOURCE_ID = 'SENTINEL_5P_TROPOMI' as const;

export const sentinel5pTropomiAdapter: ProviderAdapter = {
  sourceId: SOURCE_ID,
  canRun: hasGeo,
  async run(input: ProviderRunInput): Promise<ProviderRunResult> {
    const lim = [
      'Open-Meteo air-quality fields are model/column blends and are not identical to Sentinel-5P L2 official products.',
      'Use for screening context — not permit-grade concentrations.',
    ];
    if (!hasGeo(input)) {
      return { sourceId: SOURCE_ID, status: 'unavailable', signals: [], limitations: lim, safetyLabels: PROVIDER_RUN_SAFETY };
    }
    const hasCop = Boolean(process.env.COPERNICUS_CLIENT_ID?.trim() && process.env.COPERNICUS_CLIENT_SECRET?.trim());
    const params = new URLSearchParams({
      latitude: String(input.lat),
      longitude: String(input.lng),
      current: 'nitrogen_dioxide,carbon_monoxide',
      timezone: 'auto',
    });
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?${params.toString()}`;
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
          limitations: [...lim, `Air quality API HTTP ${res.status}`],
          safetyLabels: PROVIDER_RUN_SAFETY,
        };
      }
      const body = (await res.json()) as {
        current?: { nitrogen_dioxide?: number; carbon_monoxide?: number };
        error?: boolean;
        reason?: string;
      };
      if (body.error) {
        return {
          sourceId: SOURCE_ID,
          status: 'unavailable',
          signals: [],
          limitations: [...lim, String(body.reason ?? 'Air quality API error for this point.')],
          safetyLabels: PROVIDER_RUN_SAFETY,
        };
      }
      const no2 = body.current?.nitrogen_dioxide;
      const co = body.current?.carbon_monoxide;
      const st: ProviderRunResult['status'] = typeof no2 === 'number' || typeof co === 'number' ? 'partial' : 'unavailable';
      const extra = hasCop
        ? 'Copernicus credentials are present on the host for future direct Sentinel Hub TROPOMI lanes — this response uses Open-Meteo screening only.'
        : 'Copernicus client credentials are not configured — Sentinel Hub TROPOMI direct retrieval is not enabled.';
      return {
        sourceId: SOURCE_ID,
        status: st,
        signals: [
          { key: 'no2_proxy', label: 'NO₂ (Open-Meteo air-quality, μg/m³)', value: no2 ?? null, confidence: 'requires_validation' },
          { key: 'co_proxy', label: 'CO (Open-Meteo air-quality, μg/m³)', value: co ?? null, confidence: 'requires_validation' },
        ],
        evidenceRefs: [{ type: 'open_meteo_aq', label: 'Open-Meteo Air Quality API', url }],
        limitations: [...lim, extra],
        safetyLabels: PROVIDER_RUN_SAFETY,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'trace gas fetch failed';
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
