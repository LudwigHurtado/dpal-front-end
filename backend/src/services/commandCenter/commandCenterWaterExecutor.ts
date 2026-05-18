import type {
  CommandCenterModuleRunResult,
  CommandCenterRunContext,
  CommandCenterRunMode,
} from './commandCenterRunTypes';
import { COMMAND_CENTER_WORKSPACE_VIEW } from './commandCenterModuleRegistry';

const VIEW = COMMAND_CENTER_WORKSPACE_VIEW.water;

const CC_WATER_LIMITATIONS = [
  'Command Center water result is an evidence lead only — not a certified determination, legal outcome, or water credit.',
  'Full AquaScan workspace is required for AOI drawing, overlays, time-series comparison, and evidence packet generation.',
  'Field validation may be required before operational or legal use.',
  'Indicative DMRV context only — live signals depend on this API host and upstream providers.',
];

const STATS_TIMEOUT_MS = 12_000;
const SATELLITE_PREVIEW_TIMEOUT_MS = 95_000;

function internalApiOrigin(): string {
  const fromEnv = process.env.COMMAND_CENTER_INTERNAL_API_ORIGIN?.trim().replace(/\/+$/, '');
  if (fromEnv) return fromEnv;
  const port = parseInt(process.env.PORT ?? '3001', 10);
  return `http://127.0.0.1:${Number.isFinite(port) ? port : 3001}`;
}

function bodyPreview(text: string, max = 280): string {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

type FetchJsonOutcome =
  | { kind: 'ok'; status: number; body: unknown; rawText: string }
  | { kind: 'bad_status'; status: number; rawText: string }
  | { kind: 'network'; message: string };

async function fetchJson(url: string, timeoutMs: number, label: string): Promise<FetchJsonOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    const rawText = await res.text();
    let body: unknown = null;
    try {
      body = rawText ? JSON.parse(rawText) : null;
    } catch {
      body = null;
    }
    if (res.status === 429) return { kind: 'bad_status', status: 429, rawText };
    if (!res.ok) return { kind: 'bad_status', status: res.status, rawText };
    return { kind: 'ok', status: res.status, body, rawText };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.toLowerCase().includes('abort') || msg.toLowerCase().includes('aborted')) {
      return { kind: 'network', message: `timeout:${label}` };
    }
    return { kind: 'network', message: msg };
  } finally {
    clearTimeout(timer);
  }
}

function classifyNetwork(msg: string): 'unavailable' | 'rate_limited' | 'error' {
  const low = msg.toLowerCase();
  if (low.includes('timeout:') || low.includes('etimedout') || low.includes('econnreset') || low.includes('socket') || low.includes('fetch failed')) {
    return 'unavailable';
  }
  if (low.includes('429') || low.includes('rate limit')) return 'rate_limited';
  return 'error';
}

type WaterStatsBody = {
  ok?: boolean;
  liveAnalysisEnabled?: boolean;
  missingCredentials?: string[];
  timestamp?: string;
  service?: string;
};

type SatellitePreviewBody = {
  ok?: boolean;
  capturedAt?: string;
  areaLabel?: string;
  centerLat?: number;
  centerLng?: number;
  adapters?: Record<
    string,
    {
      ok?: boolean;
      confidenceScore?: number;
      ndviMean?: number;
      source?: string;
      waterFraction?: number;
      vvMeanDb?: number;
      floodRisk?: number;
      captureDate?: string;
    }
  >;
  summary?: Record<string, unknown>;
};

function laneFromAdapter(
  id: string,
  label: string,
  block: Record<string, unknown> | undefined,
  kind: 'statistics' | 'metadata',
): CommandCenterModuleRunResult['providerLanes'][0] {
  if (!block || typeof block !== 'object') {
    return { id, label, state: 'unknown', detail: 'No adapter block in response.' };
  }
  const ok = block.ok === true;
  const parts: string[] = [];
  const ndviMean = typeof block.ndviMean === 'number' && Number.isFinite(block.ndviMean) ? block.ndviMean : null;
  const confidenceScore =
    typeof block.confidenceScore === 'number' && Number.isFinite(block.confidenceScore) ? block.confidenceScore : null;
  if (kind === 'statistics') {
    if (ndviMean != null) parts.push(`ndviMean ${ndviMean}`);
    if (confidenceScore != null) parts.push(`confidence ${confidenceScore}`);
    if (typeof block.source === 'string' && block.source) parts.push(block.source);
  }
  const wf = typeof block.waterFraction === 'number' && Number.isFinite(block.waterFraction) ? block.waterFraction : null;
  const vv = typeof block.vvMeanDb === 'number' && Number.isFinite(block.vvMeanDb) ? block.vvMeanDb : null;
  const fr = typeof block.floodRisk === 'number' && Number.isFinite(block.floodRisk) ? block.floodRisk : null;
  if (wf != null) parts.push(`waterFraction ${wf}`);
  if (vv != null) parts.push(`VV ${vv} dB`);
  if (fr != null) parts.push(`floodRisk ${fr}`);
  if (typeof block.captureDate === 'string' && block.captureDate) parts.push(`captureDate ${block.captureDate}`);
  const detail = parts.length ? parts.join(' · ') : ok ? 'ok' : 'no confident sample in window';
  return { id, label, state: ok ? 'ok' : 'partial', detail };
}

function nasaMetadataLane(
  id: string,
  label: string,
  block: { ok?: boolean; soilMoistureIndex?: number; surfaceWaterLevel?: number; waterStorageTrend?: number; vegetationStress?: number } | undefined,
): CommandCenterModuleRunResult['providerLanes'][0] {
  if (!block) return { id, label, state: 'unknown', detail: 'No block.' };
  const ok = block.ok === true;
  return {
    id,
    label,
    state: ok ? 'ok' : 'partial',
    detail: ok ? 'NASA CMR / capability check reported available (metadata readiness — not a local hydrology reading).' : 'No qualifying granule metadata in recent window (readiness signal only).',
  };
}

export async function executeWaterForCommandCenter(
  ctx: CommandCenterRunContext,
  runMode: CommandCenterRunMode,
): Promise<CommandCenterModuleRunResult> {
  const baseLim = CC_WATER_LIMITATIONS;
  const aoiNote = `Command Center map uses center and radius ${ctx.radiusKm} km; GET /api/water/satellite-preview applies a fixed ~2 km statistics AOI around the center (not a user-drawn polygon matching that radius).`;

  if (runMode === 'dry_run') {
    return {
      moduleKey: 'water',
      status: 'preview_ready',
      runMode,
      headline: 'AquaScan — workflow preview (no live water pull from Command Center engine).',
      limitations: [...baseLim, aoiNote, 'Open AquaScan to run live lanes, overlays, and evidence steps.'],
      providerLanes: [
        { id: 'stats', label: 'GET /api/water/stats', state: 'preview', detail: 'Not invoked from Command Center dry run.' },
        {
          id: 'satellite-preview',
          label: 'GET /api/water/satellite-preview',
          state: 'preview',
          detail: 'Not invoked from Command Center dry run.',
        },
      ],
      evidenceRefs: [
        {
          id: 'focus',
          label: `Focus: ${ctx.latitude.toFixed(5)}, ${ctx.longitude.toFixed(5)} · radius ${ctx.radiusKm} km`,
        },
      ],
      openWorkspaceView: VIEW,
    };
  }

  const origin = internalApiOrigin();
  const statsUrl = `${origin}/api/water/stats`;
  const statsOut = await fetchJson(statsUrl, STATS_TIMEOUT_MS, 'water_stats');

  if (statsOut.kind === 'network') {
    const kind = classifyNetwork(statsOut.message);
    if (kind === 'unavailable') {
      return {
        moduleKey: 'water',
        status: 'unavailable',
        runMode,
        headline: 'AquaScan — water stats unreachable (timeout or network).',
        limitations: [...baseLim, 'Verify API host connectivity.'],
        providerLanes: [{ id: 'water-stats', label: 'GET /api/water/stats', state: 'unavailable', detail: bodyPreview(statsOut.message) }],
        evidenceRefs: [{ id: 'endpoint', label: 'GET /api/water/stats' }],
        openWorkspaceView: VIEW,
        errorMessage: bodyPreview(statsOut.message),
      };
    }
    if (kind === 'rate_limited') {
      return {
        moduleKey: 'water',
        status: 'rate_limited',
        runMode,
        headline: 'AquaScan — rate limited on water stats.',
        limitations: baseLim,
        providerLanes: [{ id: 'water-stats', label: 'GET /api/water/stats', state: 'rate_limited', detail: bodyPreview(statsOut.message) }],
        evidenceRefs: [],
        openWorkspaceView: VIEW,
        errorMessage: bodyPreview(statsOut.message),
      };
    }
    return {
      moduleKey: 'water',
      status: 'error',
      runMode,
      headline: 'AquaScan — error requesting water stats.',
      limitations: baseLim,
      providerLanes: [{ id: 'water-stats', label: 'GET /api/water/stats', state: 'error', detail: bodyPreview(statsOut.message) }],
      evidenceRefs: [],
      openWorkspaceView: VIEW,
      errorMessage: bodyPreview(statsOut.message),
    };
  }

  if (statsOut.kind === 'bad_status' && statsOut.status === 429) {
    return {
      moduleKey: 'water',
      status: 'rate_limited',
      runMode,
      headline: 'AquaScan — HTTP 429 on GET /api/water/stats.',
      limitations: baseLim,
      providerLanes: [{ id: 'water-stats', label: 'GET /api/water/stats', state: 'rate_limited', detail: bodyPreview(statsOut.rawText) }],
      evidenceRefs: [],
      openWorkspaceView: VIEW,
      errorMessage: bodyPreview(statsOut.rawText),
    };
  }

  if (statsOut.kind === 'bad_status') {
    return {
      moduleKey: 'water',
      status: 'error',
      runMode,
      headline: `AquaScan — GET /api/water/stats returned HTTP ${statsOut.status}.`,
      limitations: baseLim,
      providerLanes: [
        { id: 'water-stats', label: 'GET /api/water/stats', state: 'error', detail: bodyPreview(statsOut.rawText) },
      ],
      evidenceRefs: [{ id: 'endpoint', label: 'GET /api/water/stats' }],
      openWorkspaceView: VIEW,
      errorMessage: bodyPreview(statsOut.rawText),
    };
  }

  const statsBody = (statsOut.body ?? {}) as WaterStatsBody;
  if (statsBody.ok !== true) {
    return {
      moduleKey: 'water',
      status: 'error',
      runMode,
      headline: 'AquaScan — GET /api/water/stats returned an unexpected JSON body.',
      limitations: baseLim,
      providerLanes: [{ id: 'water-stats', label: 'GET /api/water/stats', state: 'error', detail: bodyPreview(statsOut.rawText) }],
      evidenceRefs: [{ id: 'endpoint', label: 'GET /api/water/stats' }],
      openWorkspaceView: VIEW,
      errorMessage: bodyPreview(statsOut.rawText),
    };
  }

  const liveEnabled = statsBody.liveAnalysisEnabled === true;
  const missing = Array.isArray(statsBody.missingCredentials) ? statsBody.missingCredentials : [];

  if (!liveEnabled) {
    return {
      moduleKey: 'water',
      status: 'partial',
      runMode,
      headline: 'AquaScan — provider readiness only: Copernicus credentials are not configured on this API host (no live satellite statistics lane).',
      limitations: [
        ...baseLim,
        aoiNote,
        'This result reflects GET /api/water/stats only — not a water detection outcome.',
        missing.length ? `Missing env: ${missing.join(', ')}.` : 'Configure COPERNICUS_CLIENT_ID and COPERNICUS_CLIENT_SECRET on the API host for live lanes.',
      ],
      providerLanes: [
        {
          id: 'water-stats',
          label: 'GET /api/water/stats',
          state: 'partial',
          detail: `liveAnalysisEnabled=false · service=${String(statsBody.service ?? 'water-routes')}`,
        },
      ],
      evidenceRefs: [
        { id: 'endpoint-stats', label: 'GET /api/water/stats' },
        ...(statsBody.timestamp ? [{ id: 'stats-timestamp', label: `stats.timestamp: ${statsBody.timestamp}` }] : []),
      ],
      openWorkspaceView: VIEW,
    };
  }

  const areaLabel = (ctx.locationDescription || 'Command Center scan').trim().slice(0, 160);
  const previewUrl = `${origin}/api/water/satellite-preview?${new URLSearchParams({
    lat: String(ctx.latitude),
    lng: String(ctx.longitude),
    areaLabel,
  }).toString()}`;

  const previewOut = await fetchJson(previewUrl, SATELLITE_PREVIEW_TIMEOUT_MS, 'water_satellite_preview');

  if (previewOut.kind === 'network') {
    const kind = classifyNetwork(previewOut.message);
    if (kind === 'unavailable') {
      return {
        moduleKey: 'water',
        status: 'unavailable',
        runMode,
        headline: 'AquaScan — satellite preview unreachable (timeout or network).',
        limitations: [...baseLim, aoiNote],
        providerLanes: [
          { id: 'water-stats', label: 'GET /api/water/stats', state: 'ok', detail: 'liveAnalysisEnabled=true' },
          { id: 'satellite-preview', label: 'GET /api/water/satellite-preview', state: 'unavailable', detail: bodyPreview(previewOut.message) },
        ],
        evidenceRefs: [
          { id: 'endpoint-stats', label: 'GET /api/water/stats' },
          { id: 'endpoint-preview', label: 'GET /api/water/satellite-preview' },
        ],
        openWorkspaceView: VIEW,
        errorMessage: bodyPreview(previewOut.message),
      };
    }
    if (kind === 'rate_limited') {
      return {
        moduleKey: 'water',
        status: 'rate_limited',
        runMode,
        headline: 'AquaScan — rate limited on satellite preview.',
        limitations: baseLim,
        providerLanes: [
          { id: 'water-stats', label: 'GET /api/water/stats', state: 'ok', detail: 'liveAnalysisEnabled=true' },
          { id: 'satellite-preview', label: 'GET /api/water/satellite-preview', state: 'rate_limited', detail: bodyPreview(previewOut.message) },
        ],
        evidenceRefs: [],
        openWorkspaceView: VIEW,
        errorMessage: bodyPreview(previewOut.message),
      };
    }
    return {
      moduleKey: 'water',
      status: 'error',
      runMode,
      headline: 'AquaScan — error requesting satellite preview.',
      limitations: baseLim,
      providerLanes: [
        { id: 'water-stats', label: 'GET /api/water/stats', state: 'ok', detail: 'liveAnalysisEnabled=true' },
        { id: 'satellite-preview', label: 'GET /api/water/satellite-preview', state: 'error', detail: bodyPreview(previewOut.message) },
      ],
      evidenceRefs: [],
      openWorkspaceView: VIEW,
      errorMessage: bodyPreview(previewOut.message),
    };
  }

  if (previewOut.kind === 'bad_status' && previewOut.status === 429) {
    return {
      moduleKey: 'water',
      status: 'rate_limited',
      runMode,
      headline: 'AquaScan — HTTP 429 on GET /api/water/satellite-preview.',
      limitations: baseLim,
      providerLanes: [
        { id: 'water-stats', label: 'GET /api/water/stats', state: 'ok', detail: 'liveAnalysisEnabled=true' },
        { id: 'satellite-preview', label: 'GET /api/water/satellite-preview', state: 'rate_limited', detail: bodyPreview(previewOut.rawText) },
      ],
      evidenceRefs: [{ id: 'endpoint-preview', label: 'GET /api/water/satellite-preview' }],
      openWorkspaceView: VIEW,
      errorMessage: bodyPreview(previewOut.rawText),
    };
  }

  if (previewOut.kind === 'bad_status') {
    return {
      moduleKey: 'water',
      status: 'error',
      runMode,
      headline: `AquaScan — GET /api/water/satellite-preview returned HTTP ${previewOut.status}.`,
      limitations: [...baseLim, aoiNote],
      providerLanes: [
        { id: 'water-stats', label: 'GET /api/water/stats', state: 'ok', detail: 'liveAnalysisEnabled=true' },
        {
          id: 'satellite-preview',
          label: 'GET /api/water/satellite-preview',
          state: 'error',
          detail: bodyPreview(previewOut.rawText),
        },
      ],
      evidenceRefs: [
        { id: 'endpoint-stats', label: 'GET /api/water/stats' },
        { id: 'endpoint-preview', label: 'GET /api/water/satellite-preview' },
      ],
      openWorkspaceView: VIEW,
      errorMessage: bodyPreview(previewOut.rawText),
    };
  }

  const prev = (previewOut.body ?? {}) as SatellitePreviewBody;
  if (prev.ok !== true) {
    return {
      moduleKey: 'water',
      status: 'error',
      runMode,
      headline: 'AquaScan — satellite preview JSON missing ok:true.',
      limitations: baseLim,
      providerLanes: [
        { id: 'water-stats', label: 'GET /api/water/stats', state: 'ok', detail: 'liveAnalysisEnabled=true' },
        { id: 'satellite-preview', label: 'GET /api/water/satellite-preview', state: 'error', detail: bodyPreview(previewOut.rawText) },
      ],
      evidenceRefs: [{ id: 'endpoint-preview', label: 'GET /api/water/satellite-preview' }],
      openWorkspaceView: VIEW,
      errorMessage: bodyPreview(previewOut.rawText),
    };
  }

  const adapters = prev.adapters ?? {};
  const cop = adapters.copernicus as Record<string, unknown> | undefined;
  const s1 = adapters.sentinel1 as Record<string, unknown> | undefined;
  const smap = adapters.smap as { ok?: boolean; soilMoistureIndex?: number } | undefined;
  const swot = adapters.swot as { ok?: boolean; surfaceWaterLevel?: number } | undefined;
  const grace = adapters.grace as { ok?: boolean; waterStorageTrend?: number } | undefined;
  const gibs = adapters.gibs as { ok?: boolean; vegetationStress?: number } | undefined;

  const lanes: CommandCenterModuleRunResult['providerLanes'] = [
    { id: 'water-stats', label: 'GET /api/water/stats', state: 'ok', detail: 'liveAnalysisEnabled=true (provider readiness gate)' },
    laneFromAdapter('copernicus-s2', 'Copernicus Sentinel-2 statistics (NDVI/NDWI/NDMI/NBR window)', cop, 'statistics'),
    laneFromAdapter('sentinel-1', 'Sentinel-1 SAR statistics (VV-derived estimate)', s1, 'statistics'),
    nasaMetadataLane('nasa-smap', 'NASA SMAP (CMR metadata readiness)', smap),
    nasaMetadataLane('nasa-swot', 'NASA SWOT (CMR metadata readiness)', swot),
    nasaMetadataLane('nasa-grace', 'NASA GRACE-FO (CMR metadata readiness)', grace),
    nasaMetadataLane('nasa-gibs', 'NASA GIBS / MODIS (tile capability)', gibs),
  ];

  const s2Ok = cop?.ok === true;
  const s1Ok = s1?.ok === true;
  const moduleStatus: CommandCenterModuleRunResult['status'] = s2Ok && s1Ok ? 'success' : 'partial';

  const headline = s2Ok && s1Ok
    ? 'AquaScan — live GET /api/water/satellite-preview returned Copernicus and Sentinel-1 statistic lanes (screening context only — not verification).'
    : 'AquaScan — live satellite preview responded; one or more statistic lanes are weak or empty for this window (evidence lead only).';

  const evidenceRefs: CommandCenterModuleRunResult['evidenceRefs'] = [
    { id: 'endpoint-stats', label: 'GET /api/water/stats' },
    { id: 'endpoint-preview', label: 'GET /api/water/satellite-preview' },
  ];
  if (prev.capturedAt) evidenceRefs.push({ id: 'capturedAt', label: `snapshot.capturedAt: ${prev.capturedAt}` });
  if (prev.areaLabel) evidenceRefs.push({ id: 'areaLabel', label: `areaLabel: ${prev.areaLabel}` });
  if (prev.centerLat != null && prev.centerLng != null) {
    evidenceRefs.push({ id: 'center', label: `center: ${prev.centerLat}, ${prev.centerLng}` });
  }

  return {
    moduleKey: 'water',
    status: moduleStatus,
    runMode,
    headline,
    limitations: [
      ...baseLim,
      aoiNote,
      'NASA CMR/GIBS lanes indicate catalog or tile capability near this point — not a substitute for gauge readings or field validation.',
      'This payload is a satellite statistics snapshot — not water credit issuance, not automated verification, and not publication.',
    ],
    providerLanes: lanes,
    evidenceRefs,
    openWorkspaceView: VIEW,
  };
}
