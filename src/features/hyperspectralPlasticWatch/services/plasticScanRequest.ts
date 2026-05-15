import type {
  HyperspectralPlasticScanResponse,
  PlasticEnvironmentType,
  PlasticFallbackBlock,
  PlasticSpectralProviderBlock,
  PlasticSpectralSignals,
} from '../types';
import type { PlasticScanParams } from './hyperspectralPlasticApi';

/** Shown when CMR metadata succeeded but numeric plastic-risk index is not ready. */
export const PENDING_PLASTIC_INDEX_STATUS_MESSAGE =
  'NASA CMR metadata retrieved. Plastic-risk scoring pending narrow-band index extraction and validation.';

const PRESET_TO_API: Record<string, string> = {
  '1m': '30d',
  '3m': '3mo',
  '6m': '6mo',
  '1y': '1y',
};

/** Parse user coordinates; supports European comma decimals (e.g. 14,5995 → 14.5995). */
export function parseLocalizedNumber(raw: string | number): number {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : Number.NaN;
  const s = String(raw).trim();
  if (!s) return Number.NaN;
  let cleaned = s.replace(/\s/g, '');
  if (/,/.test(cleaned) && !/\./.test(cleaned)) {
    cleaned = cleaned.replace(',', '.');
  } else {
    cleaned = cleaned.replace(/,/g, '');
  }
  return Number.parseFloat(cleaned);
}

export function toScanDateOnly(value: string): string {
  const t = value.trim();
  if (!t) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return t.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

export function mapQuickPresetToApi(preset: string | null | undefined): string | null {
  if (preset == null || preset === '') return null;
  return PRESET_TO_API[preset] ?? preset;
}

export function isPendingPlasticIndexExtraction(scan: {
  riskLevel?: string;
  plasticRisk?: { status?: string };
  plasticRiskScore?: number | null;
}): boolean {
  if (scan.riskLevel === 'pending_index_extraction') return true;
  if (scan.plasticRisk?.status === 'pending_index_extraction') return true;
  return false;
}

export function plasticScanPendingStatusMessage(scan: {
  riskLevel?: string;
  plasticRisk?: { status?: string; message?: string };
}): string | null {
  if (!isPendingPlasticIndexExtraction(scan)) return null;
  const apiMsg = scan.plasticRisk?.message?.trim();
  if (apiMsg && apiMsg.length > 0) return apiMsg;
  return PENDING_PLASTIC_INDEX_STATUS_MESSAGE;
}

function defaultProviderBlock(): PlasticSpectralProviderBlock {
  return { status: 'unavailable', message: 'Provider lane not included in API response.' };
}

function defaultFallbackBlock(): PlasticFallbackBlock {
  return { status: 'unavailable', message: 'Fallback lane not included in API response.' };
}

function defaultSpectralSignals(): PlasticSpectralSignals {
  return {
    plasticRiskSignal: 'none',
    confidence: 0,
    swirAnomaly: null,
    visibleAnomaly: null,
    waterConfounders: {
      algae: 'unknown',
      turbidity: 'unknown',
      sediment: 'unknown',
      foam: 'unknown',
      cloudsGlint: 'unknown',
    },
    notes: [],
  };
}

function asProviderBlock(v: unknown): PlasticSpectralProviderBlock {
  if (!v || typeof v !== 'object') return defaultProviderBlock();
  const o = v as PlasticSpectralProviderBlock;
  return {
    status: o.status ?? 'unavailable',
    message: typeof o.message === 'string' ? o.message : defaultProviderBlock().message,
    sceneDate: o.sceneDate ?? null,
    spectralRange: o.spectralRange,
    limitations: o.limitations,
    scenes: o.scenes,
  };
}

/** Build POST JSON body with numeric coords and YYYY-MM-DD dates. */
export function buildPlasticScanRequestBody(params: PlasticScanParams): Record<string, unknown> {
  const lat = parseLocalizedNumber(params.lat);
  const lng = parseLocalizedNumber(params.lng);
  const radiusKm = parseLocalizedNumber(params.radiusKm);

  return {
    lat,
    lng,
    radiusKm,
    label: params.label?.trim() || 'Plastic Watch AOI',
    baselineDate: toScanDateOnly(params.baselineDate),
    currentDate: toScanDateOnly(params.currentDate),
    environmentType: params.environmentType,
    polygon: params.polygon ?? null,
    quickPreset: mapQuickPresetToApi(params.quickPreset ?? null),
    aoiGeoJson: params.aoiGeoJson ?? null,
    ...(params.compact ? { compact: true } : {}),
    ...(params.includeLinks ? { includeLinks: true } : {}),
  };
}

/** Merge API scan JSON so UI never crashes on partial provider blocks. */
export function normalizePlasticScanResponse(raw: unknown): HyperspectralPlasticScanResponse | null {
  if (!raw || typeof raw !== 'object') return null;
  const b = raw as Record<string, unknown>;
  if (b.ok !== true) return null;

  const scanId = typeof b.scanId === 'string' ? b.scanId : '';
  if (!scanId) return null;

  const providersRaw = (b.providers && typeof b.providers === 'object' ? b.providers : {}) as Record<
    string,
    unknown
  >;

  const aoiRaw = (b.aoi && typeof b.aoi === 'object' ? b.aoi : {}) as Record<string, unknown>;
  const lat = parseLocalizedNumber(aoiRaw.lat as number ?? b.lat as number);
  const lng = parseLocalizedNumber(aoiRaw.lng as number ?? b.lng as number);

  const plasticRiskRaw =
    b.plasticRisk && typeof b.plasticRisk === 'object'
      ? (b.plasticRisk as HyperspectralPlasticScanResponse['plasticRisk'])
      : {
          score: b.plasticRiskScore == null ? null : Number(b.plasticRiskScore),
          status: 'pending_index_extraction' as const,
          message: PENDING_PLASTIC_INDEX_STATUS_MESSAGE,
        };

  const evidencePacketRaw =
    b.evidencePacket && typeof b.evidencePacket === 'object'
      ? (b.evidencePacket as HyperspectralPlasticScanResponse['evidencePacket'])
      : {
          status: 'preview' as const,
          claimsLevel: 'narrow_band_metadata' as const,
          limitations: Array.isArray(b.limitations) ? (b.limitations as string[]) : [],
          nextActions: [],
        };

  const spectralRaw =
    b.spectralSignals && typeof b.spectralSignals === 'object'
      ? (b.spectralSignals as PlasticSpectralSignals)
      : defaultSpectralSignals();

  const droneRaw = providersRaw.drone;
  const drone =
    droneRaw && typeof droneRaw === 'object'
      ? (droneRaw as HyperspectralPlasticScanResponse['providers']['drone'])
      : { status: 'not_enabled', mode: 'manual' as const, message: 'Drone connector status not returned.' };

  return {
    ok: true,
    scanId,
    label: typeof b.label === 'string' ? b.label : typeof aoiRaw.label === 'string' ? aoiRaw.label : 'Plastic Watch AOI',
    aoi: {
      lat: Number.isFinite(lat) ? lat : 0,
      lng: Number.isFinite(lng) ? lng : 0,
      radiusKm: parseLocalizedNumber(aoiRaw.radiusKm as number) || 10,
      label: typeof aoiRaw.label === 'string' ? aoiRaw.label : 'Plastic Watch AOI',
      baselineDate: toScanDateOnly(String(aoiRaw.baselineDate ?? '')),
      currentDate: toScanDateOnly(String(aoiRaw.currentDate ?? '')),
      environmentType: (aoiRaw.environmentType as PlasticEnvironmentType) ?? 'coast',
      polygon: aoiRaw.polygon,
      quickPreset: (aoiRaw.quickPreset as string | null) ?? null,
      aoiGeoJson: aoiRaw.aoiGeoJson,
    },
    providers: {
      pace: asProviderBlock(providersRaw.pace),
      emit: asProviderBlock(providersRaw.emit),
      sentinelLandsatFallback: providersRaw.sentinelLandsatFallback
        ? (providersRaw.sentinelLandsatFallback as PlasticFallbackBlock)
        : defaultFallbackBlock(),
      drone,
    },
    spectralSignals: spectralRaw,
    plasticRiskScore: b.plasticRiskScore == null ? null : Number(b.plasticRiskScore),
    riskLevel: typeof b.riskLevel === 'string' ? b.riskLevel : 'pending_index_extraction',
    plasticRisk: plasticRiskRaw,
    evidencePacket: evidencePacketRaw,
    evidenceItems: Array.isArray(b.evidenceItems) ? (b.evidenceItems as string[]) : [],
    limitations: Array.isArray(b.limitations) ? (b.limitations as string[]) : [],
    generatedAt: typeof b.generatedAt === 'string' ? b.generatedAt : new Date().toISOString(),
  };
}
