import type {
  CommandCenterModuleRunResult,
  CommandCenterRunContext,
  CommandCenterRunMode,
} from './commandCenterRunTypes';
import { COMMAND_CENTER_WORKSPACE_VIEW } from './commandCenterModuleRegistry';

const VIEW = COMMAND_CENTER_WORKSPACE_VIEW.earthObservation;

const CC_EO_LIMITATIONS = [
  'Command Center Earth Observation result is an evidence lead only — not a legal finding, certified DMRV outcome, or credit issuance.',
  'Full Earth Observation workspace is required for AOI review, overlays, before/after comparison, and evidence packet generation.',
  'Satellite and provider outputs are scene-level screening signals; field validation may be required.',
];

const PROVIDER_STATUS_TIMEOUT_MS = 18_000;
const EO_SCAN_TIMEOUT_MS = 120_000;
const MAX_EO_RADIUS_KM = 250;

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

async function fetchJsonGet(url: string, timeoutMs: number, label: string): Promise<FetchJsonOutcome> {
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

async function fetchJsonPost(
  url: string,
  payload: Record<string, unknown>,
  timeoutMs: number,
  label: string,
): Promise<FetchJsonOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
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
  if (
    low.includes('timeout:') ||
    low.includes('etimedout') ||
    low.includes('econnreset') ||
    low.includes('socket') ||
    low.includes('fetch failed')
  ) {
    return 'unavailable';
  }
  if (low.includes('429') || low.includes('rate limit')) return 'rate_limited';
  return 'error';
}

function outcomeFromFetch(out: FetchJsonOutcome):
  | { kind: 'ok'; body: unknown; rawText: string }
  | { kind: 'rate_limited'; preview: string }
  | { kind: 'unavailable'; preview: string }
  | { kind: 'error'; preview: string } {
  if (out.kind === 'network') {
    const k = classifyNetwork(out.message);
    if (k === 'unavailable') return { kind: 'unavailable', preview: bodyPreview(out.message) };
    if (k === 'rate_limited') return { kind: 'rate_limited', preview: bodyPreview(out.message) };
    return { kind: 'error', preview: bodyPreview(out.message) };
  }
  if (out.kind === 'bad_status' && out.status === 429) return { kind: 'rate_limited', preview: bodyPreview(out.rawText) };
  if (out.kind === 'bad_status') return { kind: 'error', preview: bodyPreview(out.rawText) };
  return { kind: 'ok', body: out.body, rawText: out.rawText };
}

function inferAnalysisType(ctx: CommandCenterRunContext): string {
  const blob = `${ctx.goal} ${ctx.locationDescription}`.toLowerCase();
  if (/water|flood|ndwi|wetland|river|lake|aqua/i.test(blob)) return 'water';
  if (/heat|uhi|urban heat/i.test(blob)) return 'heat';
  if (/urban|city|sprawl/i.test(blob)) return 'urban';
  if (/fire|burn|firms|smoke/i.test(blob)) return 'flood_fire';
  if (/carbon|co2|mrv|credit|offset/i.test(blob)) return 'carbon';
  if (/pollution|smoke|plume|air quality/i.test(blob)) return 'pollution';
  if (/farm|crop|agriculture|ndmi|drought/i.test(blob)) return 'agriculture';
  return 'deforestation';
}

function readinessLaneFromForestStatus(body: Record<string, unknown>): CommandCenterModuleRunResult['providerLanes'][0] {
  const eoLive = Boolean(body.earthObservationLive);
  const cop = Boolean(body.copernicusConfigured);
  const at = typeof body.generatedAt === 'string' ? body.generatedAt : '';
  return {
    id: 'eo-readiness',
    label: 'GET /api/forest-integrity/provider-status (Earth Observation flags)',
    state: eoLive ? 'ok' : 'partial',
    detail: bodyPreview(
      `earthObservationLive=${eoLive} · copernicusConfigured=${cop}${at ? ` · generatedAt: ${at}` : ''}`,
      240,
    ),
  };
}

function buildScanLanes(scan: Record<string, unknown>): CommandCenterModuleRunResult['providerLanes'] {
  const lanes: CommandCenterModuleRunResult['providerLanes'] = [];
  const sourceMode = typeof scan.sourceMode === 'string' ? scan.sourceMode : '';
  const signalStatus = typeof scan.signalStatus === 'string' ? scan.signalStatus : '';
  const processingStage = typeof scan.processingStage === 'string' ? scan.processingStage : '';
  const riskLevel = typeof scan.riskLevel === 'string' ? scan.riskLevel : '';
  const summary = typeof scan.summary === 'string' ? scan.summary : '';
  lanes.push({
    id: 'eo-scan',
    label: 'POST /api/earth-observation/scan',
    state: sourceMode === 'LIVE' ? 'ok' : sourceMode === 'UNAVAILABLE' ? 'partial' : 'partial',
    detail: bodyPreview(
      `sourceMode=${sourceMode} · signalStatus=${signalStatus} · processingStage=${processingStage} · riskLevel=${riskLevel} · ${summary}`,
      280,
    ),
  });

  const before = scan.beforeScene as Record<string, unknown> | null | undefined;
  const after = scan.afterScene as Record<string, unknown> | null | undefined;
  const beforeId = before && typeof before.sceneId === 'string' ? before.sceneId : '';
  const afterId = after && typeof after.sceneId === 'string' ? after.sceneId : '';
  if (beforeId || afterId) {
    lanes.push({
      id: 'landsat-pc',
      label: 'Landsat / Planetary Computer (before · after scenes)',
      state: beforeId && afterId ? 'ok' : 'partial',
      detail: bodyPreview(
        [beforeId ? `before: ${beforeId}` : '', afterId ? `after: ${afterId}` : ''].filter(Boolean).join(' · '),
        220,
      ),
    });
  }

  const sources = Array.isArray(scan.sources) ? (scan.sources as Record<string, unknown>[]) : [];
  const parts: string[] = [];
  for (const s of sources.slice(0, 6)) {
    const name = typeof s.name === 'string' ? s.name : '';
    const product = typeof s.product === 'string' ? s.product : '';
    if (name || product) parts.push([name, product].filter(Boolean).join(' — '));
  }
  if (parts.length) {
    const blob = parts.join(' | ');
    lanes.push({
      id: 'catalog-sources',
      label: 'Catalog / provider sources (from scan payload)',
      state: 'ok',
      detail: bodyPreview(blob, 280),
    });
    if (/copernicus|sentinel/i.test(blob)) {
      lanes.push({
        id: 'lane-copernicus-sentinel',
        label: 'Copernicus / Sentinel lane',
        state: 'partial',
        detail: 'Referenced in scan.sources — not a standalone verification.',
      });
    }
    if (/nasa|hls|gibs|cmr|landsat|planetary/i.test(blob)) {
      lanes.push({
        id: 'lane-nasa-landsat',
        label: 'NASA / Landsat / PC lane',
        state: 'partial',
        detail: 'Referenced in scan.sources — scene-level statistics only.',
      });
    }
  }

  return lanes;
}

function moduleStatusFromScan(scan: Record<string, unknown>): CommandCenterModuleRunResult['status'] {
  const sourceMode = typeof scan.sourceMode === 'string' ? scan.sourceMode : '';
  const signalStatus = typeof scan.signalStatus === 'string' ? scan.signalStatus : '';
  const processingStage = typeof scan.processingStage === 'string' ? scan.processingStage : '';
  if (sourceMode === 'LIVE' && processingStage === 'metric_computed' && (signalStatus === 'verified' || signalStatus === 'partially_verified')) {
    return 'success';
  }
  if (sourceMode === 'LIVE') return 'partial';
  return 'partial';
}

export async function executeEarthObservationForCommandCenter(
  ctx: CommandCenterRunContext,
  runMode: CommandCenterRunMode,
): Promise<CommandCenterModuleRunResult> {
  const baseLim = CC_EO_LIMITATIONS;
  const aoiNote =
    'Command Center uses center coordinates and radius (capped at 250 km for POST /api/earth-observation/scan). Custom polygon AOI, overlays, and packet workflows require the full Earth Observation workspace.';

  if (runMode === 'dry_run') {
    return {
      moduleKey: 'earthObservation',
      status: 'preview_ready',
      runMode,
      headline: 'Earth Observation — workflow preview (no live scan from Command Center engine).',
      limitations: [...baseLim, aoiNote, 'Open Earth Observation for live Landsat/Copernicus screening and evidence steps.'],
      providerLanes: [
        { id: 'readiness', label: 'GET /api/forest-integrity/provider-status', state: 'preview', detail: 'Not invoked in dry run.' },
        { id: 'scan', label: 'POST /api/earth-observation/scan', state: 'preview', detail: 'Not invoked in dry run.' },
      ],
      evidenceRefs: [
        { id: 'focus', label: `Focus: ${ctx.latitude.toFixed(5)}, ${ctx.longitude.toFixed(5)} · radius ${ctx.radiusKm} km` },
      ],
      openWorkspaceView: VIEW,
    };
  }

  const origin = internalApiOrigin();
  const statusUrl = `${origin}/api/forest-integrity/provider-status`;
  const statusFetch = await fetchJsonGet(statusUrl, PROVIDER_STATUS_TIMEOUT_MS, 'eo_provider_status');
  const statusOutcome = outcomeFromFetch(statusFetch);

  if (statusOutcome.kind !== 'ok') {
    const err = statusOutcome.preview;
    if (statusOutcome.kind === 'unavailable') {
      return {
        moduleKey: 'earthObservation',
        status: 'unavailable',
        runMode,
        headline: 'Earth Observation — provider readiness request timed out or network failed.',
        limitations: [...baseLim, 'Retry when the API host is reachable.'],
        providerLanes: [{ id: 'readiness', label: 'GET /api/forest-integrity/provider-status', state: 'unavailable', detail: err }],
        evidenceRefs: [{ id: 'endpoint', label: 'GET /api/forest-integrity/provider-status' }],
        openWorkspaceView: VIEW,
        errorMessage: err,
      };
    }
    if (statusOutcome.kind === 'rate_limited') {
      return {
        moduleKey: 'earthObservation',
        status: 'rate_limited',
        runMode,
        headline: 'Earth Observation — HTTP 429 on provider readiness.',
        limitations: baseLim,
        providerLanes: [{ id: 'readiness', label: 'GET /api/forest-integrity/provider-status', state: 'rate_limited', detail: err }],
        evidenceRefs: [],
        openWorkspaceView: VIEW,
        errorMessage: err,
      };
    }
    return {
      moduleKey: 'earthObservation',
      status: 'error',
      runMode,
      headline: 'Earth Observation — GET /api/forest-integrity/provider-status returned an error.',
      limitations: baseLim,
      providerLanes: [{ id: 'readiness', label: 'GET /api/forest-integrity/provider-status', state: 'error', detail: err }],
      evidenceRefs: [{ id: 'endpoint', label: 'GET /api/forest-integrity/provider-status' }],
      openWorkspaceView: VIEW,
      errorMessage: err,
    };
  }

  const statusBody = (statusOutcome.body ?? {}) as Record<string, unknown>;
  if (statusBody.ok !== true) {
    return {
      moduleKey: 'earthObservation',
      status: 'error',
      runMode,
      headline: 'Earth Observation — provider readiness JSON missing ok:true.',
      limitations: baseLim,
      providerLanes: [{ id: 'readiness', label: 'GET /api/forest-integrity/provider-status', state: 'error', detail: bodyPreview(statusOutcome.rawText) }],
      evidenceRefs: [],
      openWorkspaceView: VIEW,
      errorMessage: bodyPreview(statusOutcome.rawText),
    };
  }

  const analysisType = inferAnalysisType(ctx);
  const radiusKm = Math.min(Math.max(ctx.radiusKm, 0.001), MAX_EO_RADIUS_KM);
  const scanPayload: Record<string, unknown> = {
    analysisType,
    latitude: ctx.latitude,
    longitude: ctx.longitude,
    radiusKm,
    startDate: ctx.baselineDateIso,
    endDate: ctx.currentDateIso,
  };

  const scanUrl = `${origin}/api/earth-observation/scan`;
  const scanFetch = await fetchJsonPost(scanUrl, scanPayload, EO_SCAN_TIMEOUT_MS, 'earth_observation_scan');
  const scanOutcome = outcomeFromFetch(scanFetch);

  const readinessLane = readinessLaneFromForestStatus(statusBody);

  if (scanOutcome.kind !== 'ok') {
    const err = scanOutcome.preview;
    if (scanOutcome.kind === 'unavailable') {
      return {
        moduleKey: 'earthObservation',
        status: 'unavailable',
        runMode,
        headline: 'Earth Observation — scan timed out or network failed after readiness succeeded.',
        limitations: [...baseLim, aoiNote],
        providerLanes: [readinessLane, { id: 'eo-scan', label: 'POST /api/earth-observation/scan', state: 'unavailable', detail: err }],
        evidenceRefs: [
          { id: 'endpoint-readiness', label: 'GET /api/forest-integrity/provider-status' },
          { id: 'endpoint-scan', label: 'POST /api/earth-observation/scan' },
        ],
        openWorkspaceView: VIEW,
        errorMessage: err,
      };
    }
    if (scanOutcome.kind === 'rate_limited') {
      return {
        moduleKey: 'earthObservation',
        status: 'rate_limited',
        runMode,
        headline: 'Earth Observation — HTTP 429 on scan.',
        limitations: baseLim,
        providerLanes: [readinessLane, { id: 'eo-scan', label: 'POST /api/earth-observation/scan', state: 'rate_limited', detail: err }],
        evidenceRefs: [],
        openWorkspaceView: VIEW,
        errorMessage: err,
      };
    }
    return {
      moduleKey: 'earthObservation',
      status: 'error',
      runMode,
      headline: 'Earth Observation — POST /api/earth-observation/scan returned an error.',
      limitations: [...baseLim, aoiNote],
      providerLanes: [readinessLane, { id: 'eo-scan', label: 'POST /api/earth-observation/scan', state: 'error', detail: err }],
      evidenceRefs: [
        { id: 'endpoint-readiness', label: 'GET /api/forest-integrity/provider-status' },
        { id: 'endpoint-scan', label: 'POST /api/earth-observation/scan' },
      ],
      openWorkspaceView: VIEW,
      errorMessage: err,
    };
  }

  const scanBody = (scanOutcome.body ?? {}) as Record<string, unknown>;
  if (scanBody.ok !== true) {
    return {
      moduleKey: 'earthObservation',
      status: 'error',
      runMode,
      headline: 'Earth Observation — scan JSON missing ok:true.',
      limitations: [...baseLim, aoiNote],
      providerLanes: [
        readinessLane,
        { id: 'eo-scan', label: 'POST /api/earth-observation/scan', state: 'error', detail: bodyPreview(scanOutcome.rawText) },
      ],
      evidenceRefs: [{ id: 'endpoint-scan', label: 'POST /api/earth-observation/scan' }],
      openWorkspaceView: VIEW,
      errorMessage: bodyPreview(scanOutcome.rawText),
    };
  }

  const scanLanes = buildScanLanes(scanBody);
  const limitations = Array.isArray(scanBody.limitations)
    ? (scanBody.limitations as unknown[]).filter((x): x is string => typeof x === 'string')
    : [];
  const moduleStatus = moduleStatusFromScan(scanBody);

  const headline =
    moduleStatus === 'success'
      ? 'Earth Observation — live scan returned computed index context (screening only — not verification or certification).'
      : typeof scanBody.sourceMode === 'string' && scanBody.sourceMode === 'UNAVAILABLE'
        ? 'Earth Observation — scan responded with UNAVAILABLE source mode (readiness / configuration or no usable scenes).'
        : 'Earth Observation — live scan returned structured screening payload (evidence lead only).';

  const evidenceRefs: CommandCenterModuleRunResult['evidenceRefs'] = [
    { id: 'endpoint-readiness', label: 'GET /api/forest-integrity/provider-status' },
    { id: 'endpoint-scan', label: 'POST /api/earth-observation/scan' },
    { id: 'analysisType', label: `analysisType: ${analysisType}` },
  ];
  if (typeof statusBody.generatedAt === 'string') {
    evidenceRefs.push({ id: 'readiness-generatedAt', label: `provider-status.generatedAt: ${statusBody.generatedAt}` });
  }
  const before = scanBody.beforeScene as Record<string, unknown> | undefined;
  const after = scanBody.afterScene as Record<string, unknown> | undefined;
  if (before && typeof before.sceneId === 'string') {
    evidenceRefs.push({ id: 'beforeScene', label: `beforeScene.sceneId: ${before.sceneId}` });
  }
  if (after && typeof after.sceneId === 'string') {
    evidenceRefs.push({ id: 'afterScene', label: `afterScene.sceneId: ${after.sceneId}` });
  }

  return {
    moduleKey: 'earthObservation',
    status: moduleStatus,
    runMode,
    headline,
    limitations: [
      ...new Set([
        ...baseLim,
        aoiNote,
        ...limitations,
        'Workspace evidence packet flows are not auto-run from Command Center.',
      ]),
    ],
    providerLanes: [readinessLane, ...scanLanes],
    evidenceRefs,
    openWorkspaceView: VIEW,
  };
}
