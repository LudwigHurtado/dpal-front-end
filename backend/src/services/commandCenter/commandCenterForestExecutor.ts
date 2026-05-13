import type {
  CommandCenterModuleRunResult,
  CommandCenterRunContext,
  CommandCenterRunMode,
  ProviderLaneState,
} from './commandCenterRunTypes';
import { COMMAND_CENTER_WORKSPACE_VIEW } from './commandCenterModuleRegistry';

const VIEW = COMMAND_CENTER_WORKSPACE_VIEW.forestIntegrity;

const CC_FOREST_LIMITATIONS = [
  'Command Center Forest Integrity result is an evidence lead only — not a legal finding, certified carbon claim, or sole proof of deforestation.',
  'Full Forest Integrity workspace is required for AOI review, overlays, evidence packet generation, and independent validation.',
  'Satellite and provider signals are not legal or certified carbon outcomes; field context may be required.',
];

const PROVIDER_STATUS_TIMEOUT_MS = 18_000;
const SCAN_TIMEOUT_MS = 120_000;

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

function mapForestProviderStateToLaneState(st: string): ProviderLaneState {
  if (st === 'available' || st === 'cached') return 'ok';
  if (st === 'rate_limited') return 'rate_limited';
  if (st === 'auth_error' || st === 'failed') return 'error';
  if (st === 'unavailable') return 'unavailable';
  if (st === 'not_configured') return 'partial';
  return 'partial';
}

function laneFromForestBlock(
  id: string,
  label: string,
  block: Record<string, unknown> | undefined,
): CommandCenterModuleRunResult['providerLanes'][0] {
  if (!block || typeof block !== 'object') {
    return { id, label, state: 'unknown', detail: 'No provider block.' };
  }
  const st = typeof block.status === 'string' ? block.status : 'unknown';
  const state = mapForestProviderStateToLaneState(st);
  const parts: string[] = [typeof block.message === 'string' ? block.message : st];
  if (typeof block.queriedAt === 'string' && block.queriedAt) parts.push(`queriedAt: ${block.queriedAt}`);
  if (typeof block.sceneDate === 'string' && block.sceneDate) parts.push(`sceneDate: ${block.sceneDate}`);
  if (typeof block.alerts === 'number' && Number.isFinite(block.alerts)) parts.push(`alerts: ${block.alerts}`);
  if (typeof block.activeFires === 'number' && Number.isFinite(block.activeFires)) parts.push(`hotspotRows: ${block.activeFires}`);
  if (typeof block.integratedAlerts === 'number' && Number.isFinite(block.integratedAlerts)) {
    parts.push(`integratedAlerts: ${block.integratedAlerts}`);
  }
  if (typeof block.disturbanceAlerts === 'number' && Number.isFinite(block.disturbanceAlerts)) {
    parts.push(`disturbanceAlerts: ${block.disturbanceAlerts}`);
  }
  return { id, label, state, detail: bodyPreview(parts.join(' · '), 220) };
}

function readinessLanesFromStatus(body: Record<string, unknown>): CommandCenterModuleRunResult['providerLanes'] {
  const at = typeof body.generatedAt === 'string' ? body.generatedAt : '';
  const notes = Array.isArray(body.notes) ? (body.notes as unknown[]).filter((n): n is string => typeof n === 'string') : [];
  const detail = [
    `earthObservationLive=${Boolean(body.earthObservationLive)}`,
    `nasaFirmsConfigured=${Boolean(body.nasaFirmsConfigured)}`,
    `gfwConfigured=${Boolean(body.gfwConfigured)}`,
    `copernicusConfigured=${Boolean(body.copernicusConfigured)}`,
    at ? `generatedAt: ${at}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
  return [
    {
      id: 'forest-provider-status',
      label: 'GET /api/forest-integrity/provider-status',
      state: 'ok',
      detail: bodyPreview(detail + (notes.length ? ` · notes: ${notes.join('; ')}` : ''), 280),
    },
  ];
}

function outcomeFromFetch(out: FetchJsonOutcome): { kind: 'ok'; body: unknown; rawText: string } | { kind: 'rate_limited'; preview: string } | { kind: 'unavailable'; preview: string } | { kind: 'error'; preview: string } {
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

export async function executeForestIntegrityForCommandCenter(
  ctx: CommandCenterRunContext,
  runMode: CommandCenterRunMode,
): Promise<CommandCenterModuleRunResult> {
  const baseLim = CC_FOREST_LIMITATIONS;
  const aoiNote =
    'Command Center uses center coordinates and radiusKm; GET /api/forest-integrity/scan uses that AOI. Custom polygon workflows, overlays, and packet validation belong in the full Forest Integrity workspace.';

  if (runMode === 'dry_run') {
    return {
      moduleKey: 'forestIntegrity',
      status: 'preview_ready',
      runMode,
      headline: 'Forest Integrity — workflow preview (no live provider-status or scan from Command Center engine).',
      limitations: [
        ...baseLim,
        aoiNote,
        'Open Forest Integrity for live provider lanes, scan, and evidence steps.',
      ],
      providerLanes: [
        {
          id: 'provider-status',
          label: 'GET /api/forest-integrity/provider-status',
          state: 'preview',
          detail: 'Not invoked from Command Center dry run.',
        },
        {
          id: 'scan',
          label: 'GET /api/forest-integrity/scan',
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
  const statusUrl = `${origin}/api/forest-integrity/provider-status`;
  const statusFetch = await fetchJson(statusUrl, PROVIDER_STATUS_TIMEOUT_MS, 'forest_provider_status');
  const statusOutcome = outcomeFromFetch(statusFetch);

  if (statusOutcome.kind === 'unavailable') {
    return {
      moduleKey: 'forestIntegrity',
      status: 'unavailable',
      runMode,
      headline: 'Forest Integrity — provider-status timed out or network failed.',
      limitations: [...baseLim, 'Retry when the API host is reachable.'],
      providerLanes: [{ id: 'provider-status', label: 'GET /api/forest-integrity/provider-status', state: 'unavailable', detail: statusOutcome.preview }],
      evidenceRefs: [{ id: 'endpoint', label: 'GET /api/forest-integrity/provider-status' }],
      openWorkspaceView: VIEW,
      errorMessage: statusOutcome.preview,
    };
  }
  if (statusOutcome.kind === 'rate_limited') {
    return {
      moduleKey: 'forestIntegrity',
      status: 'rate_limited',
      runMode,
      headline: 'Forest Integrity — HTTP 429 or rate limit on provider-status.',
      limitations: baseLim,
      providerLanes: [{ id: 'provider-status', label: 'GET /api/forest-integrity/provider-status', state: 'rate_limited', detail: statusOutcome.preview }],
      evidenceRefs: [],
      openWorkspaceView: VIEW,
      errorMessage: statusOutcome.preview,
    };
  }
  if (statusOutcome.kind === 'error') {
    return {
      moduleKey: 'forestIntegrity',
      status: 'error',
      runMode,
      headline: 'Forest Integrity — GET /api/forest-integrity/provider-status returned an error.',
      limitations: baseLim,
      providerLanes: [{ id: 'provider-status', label: 'GET /api/forest-integrity/provider-status', state: 'error', detail: statusOutcome.preview }],
      evidenceRefs: [{ id: 'endpoint', label: 'GET /api/forest-integrity/provider-status' }],
      openWorkspaceView: VIEW,
      errorMessage: statusOutcome.preview,
    };
  }

  const statusBody = (statusOutcome.body ?? {}) as Record<string, unknown>;
  if (statusBody.ok !== true) {
    return {
      moduleKey: 'forestIntegrity',
      status: 'error',
      runMode,
      headline: 'Forest Integrity — provider-status JSON missing ok:true.',
      limitations: baseLim,
      providerLanes: [{ id: 'provider-status', label: 'GET /api/forest-integrity/provider-status', state: 'error', detail: bodyPreview(statusOutcome.rawText) }],
      evidenceRefs: [],
      openWorkspaceView: VIEW,
      errorMessage: bodyPreview(statusOutcome.rawText),
    };
  }

  const label = (ctx.locationDescription || 'Command Center forest scan').trim().slice(0, 160);
  const scanParams = new URLSearchParams({
    lat: String(ctx.latitude),
    lng: String(ctx.longitude),
    radiusKm: String(ctx.radiusKm),
    label,
    baselineDate: ctx.baselineDateIso,
    currentDate: ctx.currentDateIso,
  });
  const scanUrl = `${origin}/api/forest-integrity/scan?${scanParams.toString()}`;
  const scanFetch = await fetchJson(scanUrl, SCAN_TIMEOUT_MS, 'forest_scan');
  const scanOutcome = outcomeFromFetch(scanFetch);

  const statusLanes = readinessLanesFromStatus(statusBody);

  if (scanOutcome.kind === 'unavailable') {
    return {
      moduleKey: 'forestIntegrity',
      status: 'unavailable',
      runMode,
      headline: 'Forest Integrity — scan timed out or network failed after provider-status succeeded.',
      limitations: [...baseLim, aoiNote],
      providerLanes: [
        ...statusLanes,
        { id: 'scan', label: 'GET /api/forest-integrity/scan', state: 'unavailable', detail: scanOutcome.preview },
      ],
      evidenceRefs: [
        { id: 'endpoint-status', label: 'GET /api/forest-integrity/provider-status' },
        { id: 'endpoint-scan', label: 'GET /api/forest-integrity/scan' },
      ],
      openWorkspaceView: VIEW,
      errorMessage: scanOutcome.preview,
    };
  }
  if (scanOutcome.kind === 'rate_limited') {
    return {
      moduleKey: 'forestIntegrity',
      status: 'rate_limited',
      runMode,
      headline: 'Forest Integrity — HTTP 429 or rate limit on scan.',
      limitations: baseLim,
      providerLanes: [
        ...statusLanes,
        { id: 'scan', label: 'GET /api/forest-integrity/scan', state: 'rate_limited', detail: scanOutcome.preview },
      ],
      evidenceRefs: [],
      openWorkspaceView: VIEW,
      errorMessage: scanOutcome.preview,
    };
  }
  if (scanOutcome.kind === 'error') {
    return {
      moduleKey: 'forestIntegrity',
      status: 'error',
      runMode,
      headline: `Forest Integrity — GET /api/forest-integrity/scan returned HTTP error.`,
      limitations: [...baseLim, aoiNote],
      providerLanes: [
        ...statusLanes,
        { id: 'scan', label: 'GET /api/forest-integrity/scan', state: 'error', detail: scanOutcome.preview },
      ],
      evidenceRefs: [
        { id: 'endpoint-status', label: 'GET /api/forest-integrity/provider-status' },
        { id: 'endpoint-scan', label: 'GET /api/forest-integrity/scan' },
      ],
      openWorkspaceView: VIEW,
      errorMessage: scanOutcome.preview,
    };
  }

  const scanBody = (scanOutcome.body ?? {}) as Record<string, unknown>;
  if (scanBody.ok !== true) {
    return {
      moduleKey: 'forestIntegrity',
      status: 'error',
      runMode,
      headline: 'Forest Integrity — scan JSON missing ok:true.',
      limitations: [...baseLim, aoiNote],
      providerLanes: [
        ...statusLanes,
        { id: 'scan', label: 'GET /api/forest-integrity/scan', state: 'error', detail: bodyPreview(scanOutcome.rawText) },
      ],
      evidenceRefs: [{ id: 'endpoint-scan', label: 'GET /api/forest-integrity/scan' }],
      openWorkspaceView: VIEW,
      errorMessage: bodyPreview(scanOutcome.rawText),
    };
  }

  const providers = (scanBody.providers ?? {}) as Record<string, Record<string, unknown>>;
  const sentinel = providers.sentinel;
  const gfw = providers.gfw;
  const firms = providers.firms;
  const gedi = providers.gedi;

  const scanLanes: CommandCenterModuleRunResult['providerLanes'] = [
    laneFromForestBlock('sentinel-eo', 'Sentinel / Earth Observation (indices)', sentinel),
    laneFromForestBlock('gfw', 'Global Forest Watch (alerts lane)', gfw),
    laneFromForestBlock('firms', 'NASA FIRMS (thermal anomalies / CSV)', firms),
    laneFromForestBlock('gedi', 'NASA GEDI (biomass — lane status)', gedi),
  ];

  const sSt = typeof sentinel?.status === 'string' ? sentinel.status : '';
  const gSt = typeof gfw?.status === 'string' ? gfw.status : '';
  const fSt = typeof firms?.status === 'string' ? firms.status : '';

  const anyRateLimited = [sSt, gSt, fSt].includes('rate_limited');
  const sentinelOk = sSt === 'available';
  const gfwOk = gSt === 'available';
  const firmsOk = fSt === 'available';

  let moduleStatus: CommandCenterModuleRunResult['status'];
  if (anyRateLimited && !sentinelOk && !gfwOk && !firmsOk) {
    moduleStatus = 'rate_limited';
  } else if (sentinelOk && (gfwOk || firmsOk)) {
    moduleStatus = 'success';
  } else if (sentinelOk || gfwOk || firmsOk) {
    moduleStatus = 'partial';
  } else {
    moduleStatus = 'partial';
  }

  const scanLimitations = Array.isArray(scanBody.limitations)
    ? (scanBody.limitations as unknown[]).filter((x): x is string => typeof x === 'string')
    : [];
  const headline =
    moduleStatus === 'rate_limited'
      ? 'Forest Integrity — upstream rate limited; no fully usable provider lane in this window.'
      : sentinelOk && (gfwOk || firmsOk)
        ? 'Forest Integrity — live scan returned usable Sentinel/EO lane plus FIRMS or GFW lane (screening context only — not verification).'
        : 'Forest Integrity — live scan returned structured provider lanes with partial or configuration-limited coverage (evidence lead only).';

  const evidenceRefs: CommandCenterModuleRunResult['evidenceRefs'] = [
    { id: 'endpoint-status', label: 'GET /api/forest-integrity/provider-status' },
    { id: 'endpoint-scan', label: 'GET /api/forest-integrity/scan' },
  ];
  if (typeof statusBody.generatedAt === 'string') {
    evidenceRefs.push({ id: 'status-generatedAt', label: `provider-status.generatedAt: ${statusBody.generatedAt}` });
  }
  if (typeof scanBody.scanId === 'string') evidenceRefs.push({ id: 'scanId', label: `scanId: ${scanBody.scanId}` });
  if (typeof scanBody.generatedAt === 'string') {
    evidenceRefs.push({ id: 'scan-generatedAt', label: `scan.generatedAt: ${scanBody.generatedAt}` });
  }
  if (typeof scanBody.riskLevel === 'string') {
    evidenceRefs.push({ id: 'riskLevel', label: `riskLevel: ${scanBody.riskLevel} (model label — not a legal classification)` });
  }

  return {
    moduleKey: 'forestIntegrity',
    status: moduleStatus,
    runMode,
    headline,
    limitations: [
      ...new Set([...baseLim, aoiNote, ...scanLimitations, 'POST /api/forest-integrity/evidence-packet is not invoked from Command Center (no auto packet).']),
    ],
    providerLanes: [...statusLanes, ...scanLanes],
    evidenceRefs,
    openWorkspaceView: VIEW,
  };
}
