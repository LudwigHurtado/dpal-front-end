import type {
  CommandCenterModuleRunResult,
  CommandCenterRunContext,
  CommandCenterRunMode,
  ProviderLaneState,
} from './commandCenterRunTypes';
import { COMMAND_CENTER_WORKSPACE_VIEW } from './commandCenterModuleRegistry';

const VIEW = COMMAND_CENTER_WORKSPACE_VIEW.carbonViu;

const CC_CARBON_LIMITATIONS = [
  'Command Center Carbon / VIU result is an evidence lead and readiness screen only.',
  'No automatic VIU issuance.',
  'No automatic carbon credit issuance.',
  'No registry certification claim (Verra, Gold Standard, or other).',
  'Full Carbon DMRV / VIU workspace is required for project boundary, methodology, baseline, additionality, permanence, leakage, buffer, validation, and verification.',
  'Field validation and independent review may be required.',
];

const AIR_QUALITY_TIMEOUT_MS = 95_000;
const MINERALS_TIMEOUT_MS = 55_000;
const ECOLOGY_TIMEOUT_MS = 95_000;

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

function asRecord(x: unknown): Record<string, unknown> {
  return x && typeof x === 'object' ? (x as Record<string, unknown>) : {};
}

function laneFromFetchOutcome(
  id: string,
  label: string,
  out: FetchJsonOutcome,
  onOk: (body: Record<string, unknown>) => Pick<CommandCenterModuleRunResult['providerLanes'][0], 'state' | 'detail'>,
): CommandCenterModuleRunResult['providerLanes'][0] {
  if (out.kind === 'network') {
    const k = classifyNetwork(out.message);
    if (k === 'unavailable') return { id, label, state: 'unavailable', detail: bodyPreview(out.message) };
    if (k === 'rate_limited') return { id, label, state: 'rate_limited', detail: bodyPreview(out.message) };
    return { id, label, state: 'error', detail: bodyPreview(out.message) };
  }
  if (out.kind === 'bad_status' && out.status === 429) {
    return { id, label, state: 'rate_limited', detail: bodyPreview(out.rawText) };
  }
  if (out.kind === 'bad_status') {
    return { id, label, state: 'error', detail: bodyPreview(`HTTP ${out.status}: ${out.rawText}`) };
  }
  const inner = onOk(asRecord(out.body));
  return { id, label, ...inner };
}

export async function executeCarbonViuForCommandCenter(
  ctx: CommandCenterRunContext,
  runMode: CommandCenterRunMode,
): Promise<CommandCenterModuleRunResult> {
  const baseLim = CC_CARBON_LIMITATIONS;
  const aoiNote =
    'Command Center uses point coordinates and radiusKm only; project polygon, methodology selection, and DMRV boundary workflows require the full Carbon DMRV workspace.';

  if (runMode === 'dry_run') {
    return {
      moduleKey: 'carbonViu',
      status: 'preview_ready',
      runMode,
      headline: 'Carbon / VIU — workflow preview (no live carbon or ecology calls from Command Center engine).',
      limitations: [
        ...baseLim,
        aoiNote,
        'Open Carbon DMRV for issuance-adjacent flows, boundary definition, and reviewer gates.',
      ],
      providerLanes: [
        { id: 'air-quality', label: 'GET /api/carbon/air-quality', state: 'preview', detail: 'Not invoked from Command Center dry run.' },
        { id: 'minerals', label: 'GET /api/carbon/minerals', state: 'preview', detail: 'Not invoked from Command Center dry run.' },
        { id: 'ecology-landsat', label: 'GET /api/ecology/landsat-scan', state: 'preview', detail: 'Not invoked from Command Center dry run.' },
        {
          id: 'viu-credit-safety',
          label: 'VIU / carbon credit issuance',
          state: 'preview',
          detail: 'Not invoked — no automatic VIU or credit issuance.',
        },
        {
          id: 'registry-claim-safety',
          label: 'Registry / certified status',
          state: 'preview',
          detail: 'No Verra, Gold Standard, or certified registry claims from Command Center.',
        },
        {
          id: 'validation-readiness',
          label: 'Validation / verification readiness',
          state: 'preview',
          detail: 'Independent validation and verification are workspace steps — not auto-marked human_verified.',
        },
      ],
      evidenceRefs: [
        {
          id: 'focus',
          label: `Focus: ${ctx.latitude.toFixed(5)}, ${ctx.longitude.toFixed(5)} · radius ${ctx.radiusKm} km · period ${ctx.baselineDateIso} → ${ctx.currentDateIso}`,
        },
      ],
      openWorkspaceView: VIEW,
    };
  }

  const origin = internalApiOrigin();
  const lat = ctx.latitude;
  const lng = ctx.longitude;
  const radiusKm = Math.min(Math.max(ctx.radiusKm, 1), 50);

  const fromQ = encodeURIComponent(ctx.baselineDateIso);
  const toQ = encodeURIComponent(ctx.currentDateIso);
  const airUrl = `${origin}/api/carbon/air-quality?lat=${lat}&lng=${lng}&from=${fromQ}&to=${toQ}`;
  const minUrl = `${origin}/api/carbon/minerals?lat=${lat}&lng=${lng}`;
  const ecoUrl = `${origin}/api/ecology/landsat-scan?lat=${lat}&lng=${lng}&radiusKm=${radiusKm}`;

  const [airOut, minOut, ecoOut] = await Promise.all([
    fetchJson(airUrl, AIR_QUALITY_TIMEOUT_MS, 'carbon_air_quality'),
    fetchJson(minUrl, MINERALS_TIMEOUT_MS, 'carbon_minerals'),
    fetchJson(ecoUrl, ECOLOGY_TIMEOUT_MS, 'ecology_landsat'),
  ]);

  if (airOut.kind === 'bad_status' && airOut.status === 429) {
    return {
      moduleKey: 'carbonViu',
      status: 'rate_limited',
      runMode,
      headline: 'Carbon / VIU — HTTP 429 on trace-gas (air-quality) lane.',
      limitations: baseLim,
      providerLanes: [{ id: 'air-quality', label: 'GET /api/carbon/air-quality', state: 'rate_limited', detail: bodyPreview(airOut.rawText) }],
      evidenceRefs: [{ id: 'endpoint', label: 'GET /api/carbon/air-quality' }],
      openWorkspaceView: VIEW,
      errorMessage: bodyPreview(airOut.rawText),
    };
  }
  if (minOut.kind === 'bad_status' && minOut.status === 429) {
    return {
      moduleKey: 'carbonViu',
      status: 'rate_limited',
      runMode,
      headline: 'Carbon / VIU — HTTP 429 on minerals lane.',
      limitations: baseLim,
      providerLanes: [{ id: 'minerals', label: 'GET /api/carbon/minerals', state: 'rate_limited', detail: bodyPreview(minOut.rawText) }],
      evidenceRefs: [{ id: 'endpoint', label: 'GET /api/carbon/minerals' }],
      openWorkspaceView: VIEW,
      errorMessage: bodyPreview(minOut.rawText),
    };
  }
  if (ecoOut.kind === 'bad_status' && ecoOut.status === 429) {
    return {
      moduleKey: 'carbonViu',
      status: 'rate_limited',
      runMode,
      headline: 'Carbon / VIU — HTTP 429 on ecology Landsat lane.',
      limitations: baseLim,
      providerLanes: [{ id: 'ecology-landsat', label: 'GET /api/ecology/landsat-scan', state: 'rate_limited', detail: bodyPreview(ecoOut.rawText) }],
      evidenceRefs: [{ id: 'endpoint', label: 'GET /api/ecology/landsat-scan' }],
      openWorkspaceView: VIEW,
      errorMessage: bodyPreview(ecoOut.rawText),
    };
  }

  const airLane = laneFromFetchOutcome('air-quality', 'GET /api/carbon/air-quality', airOut, (b) => {
    const dataAvailable = b.dataAvailable === true;
    const msg = typeof b.message === 'string' ? b.message : '';
    const cap = typeof b.captureDate === 'string' ? b.captureDate : '';
    const st = typeof b.measurementStatus === 'string' ? b.measurementStatus : '';
    const state: ProviderLaneState = dataAvailable ? 'ok' : 'partial';
    return {
      state,
      detail: bodyPreview(
        [dataAvailable ? 'trace-gas statistics returned' : 'no usable trace-gas after QA', st && `status:${st}`, cap && `captureDate:${cap}`, msg].filter(Boolean).join(' · '),
        260,
      ),
    };
  });

  const minLane = laneFromFetchOutcome('minerals', 'GET /api/carbon/minerals', minOut, (b) => {
    const dataAvailable = b.dataAvailable === true;
    const msg = typeof b.message === 'string' ? b.message : '';
    const cap = typeof b.captureDate === 'string' ? b.captureDate : '';
    const state: ProviderLaneState = dataAvailable ? 'ok' : 'partial';
    return {
      state,
      detail: bodyPreview([dataAvailable ? 'geology/mineral context returned' : 'no verified mineral read', cap && `captureDate:${cap}`, msg].filter(Boolean).join(' · '), 260),
    };
  });

  const ecoLane = laneFromFetchOutcome('ecology-landsat', 'GET /api/ecology/landsat-scan', ecoOut, (b) => {
    const dataAvailable = b.dataAvailable === true;
    const ndvi = typeof b.ndvi === 'number' ? b.ndvi : null;
    const risk = typeof b.habitatRisk === 'string' ? b.habitatRisk : '';
    const cap = typeof b.captureDate === 'string' ? b.captureDate : '';
    const msg = typeof b.message === 'string' ? b.message : '';
    const state: ProviderLaneState = dataAvailable && ndvi !== null ? 'ok' : dataAvailable ? 'partial' : 'partial';
    return {
      state,
      detail: bodyPreview(
        [
          dataAvailable ? 'Landsat foliage context' : 'no Landsat scene statistics',
          ndvi !== null && `NDVI:${ndvi}`,
          risk && `habitatRisk:${risk}`,
          cap && `captureDate:${cap}`,
          msg,
        ]
          .filter(Boolean)
          .join(' · '),
        260,
      ),
    };
  });

  const staticLanes: CommandCenterModuleRunResult['providerLanes'] = [
    {
      id: 'viu-credit-safety',
      label: 'VIU / carbon credit issuance',
      state: 'partial',
      detail: 'Not invoked — Command Center does not issue VIUs or carbon credits.',
    },
    {
      id: 'registry-claim-safety',
      label: 'Registry / certified status',
      state: 'partial',
      detail: 'No Verra, Gold Standard, or certified registry claims from Command Center engine.',
    },
    {
      id: 'validation-readiness',
      label: 'Validation / verification readiness',
      state: 'partial',
      detail: 'human_verified not set; blockchain anchoring not performed; use full workspace for validator workflow.',
    },
    {
      id: 'evidence-sufficiency',
      label: 'Evidence sufficiency (screening)',
      state: 'partial',
      detail: 'Point/radius screening only — insufficient alone for credit or VIU eligibility; boundary + methodology + field review required.',
    },
  ];

  const allNetwork =
    airOut.kind === 'network' && minOut.kind === 'network' && ecoOut.kind === 'network';

  if (allNetwork) {
    return {
      moduleKey: 'carbonViu',
      status: 'unavailable',
      runMode,
      headline: 'Carbon / VIU — all carbon/ecology lanes timed out or network failed.',
      limitations: [...baseLim, aoiNote],
      providerLanes: [airLane, minLane, ecoLane, ...staticLanes],
      evidenceRefs: [
        { id: 'endpoint-air', label: 'GET /api/carbon/air-quality' },
        { id: 'endpoint-min', label: 'GET /api/carbon/minerals' },
        { id: 'endpoint-eco', label: 'GET /api/ecology/landsat-scan' },
      ],
      openWorkspaceView: VIEW,
      errorMessage: bodyPreview('All lanes unavailable (network or timeout).'),
    };
  }

  const airBody = airOut.kind === 'ok' ? asRecord(airOut.body) : null;
  const minBody = minOut.kind === 'ok' ? asRecord(minOut.body) : null;
  const ecoBody = ecoOut.kind === 'ok' ? asRecord(ecoOut.body) : null;

  const airUsable = airBody?.dataAvailable === true;
  const minUsable = minBody?.dataAvailable === true;
  const ecoUsable = ecoBody?.dataAvailable === true && typeof ecoBody?.ndvi === 'number';

  const anyOkLane = airLane.state === 'ok' || minLane.state === 'ok' || ecoLane.state === 'ok';
  const anyHttp200 = airOut.kind === 'ok' || minOut.kind === 'ok' || ecoOut.kind === 'ok';

  const allHttpError =
    (airOut.kind === 'bad_status' || airOut.kind === 'network') &&
    (minOut.kind === 'bad_status' || minOut.kind === 'network') &&
    (ecoOut.kind === 'bad_status' || ecoOut.kind === 'network');

  let moduleStatus: CommandCenterModuleRunResult['status'];
  if (airUsable || minUsable || ecoUsable) {
    moduleStatus = 'success';
  } else if (anyHttp200 || anyOkLane) {
    moduleStatus = 'partial';
  } else if (allHttpError) {
    moduleStatus = 'error';
  } else {
    moduleStatus = 'partial';
  }

  const headline =
    moduleStatus === 'success'
      ? 'Carbon / VIU — live screening returned usable trace-gas, mineral/geology, and/or Landsat NDVI context (not credit or VIU eligibility).'
      : moduleStatus === 'error'
        ? 'Carbon / VIU — carbon/ecology HTTP endpoints failed; see provider lanes.'
        : 'Carbon / VIU — partial readiness or limited data (Copernicus/PC configuration, clouds, or missing observations).';

  const evidenceRefs: CommandCenterModuleRunResult['evidenceRefs'] = [
    { id: 'endpoint-air', label: 'GET /api/carbon/air-quality' },
    { id: 'endpoint-min', label: 'GET /api/carbon/minerals' },
    { id: 'endpoint-eco', label: 'GET /api/ecology/landsat-scan' },
  ];
  if (typeof airBody?.captureDate === 'string') evidenceRefs.push({ id: 'air-captureDate', label: `air-quality.captureDate: ${airBody.captureDate}` });
  if (typeof airBody?.periodStart === 'string' && typeof airBody?.periodEnd === 'string') {
    evidenceRefs.push({ id: 'air-period', label: `air-quality period: ${airBody.periodStart} → ${airBody.periodEnd}` });
  }
  if (typeof minBody?.captureDate === 'string') evidenceRefs.push({ id: 'minerals-captureDate', label: `minerals.captureDate: ${minBody.captureDate}` });
  if (typeof ecoBody?.captureDate === 'string') evidenceRefs.push({ id: 'ecology-captureDate', label: `landsat-scan.captureDate: ${ecoBody.captureDate}` });
  if (typeof ecoBody?.source === 'string') evidenceRefs.push({ id: 'ecology-source', label: bodyPreview(`landsat-scan.source: ${ecoBody.source}`, 200) });

  return {
    moduleKey: 'carbonViu',
    status: moduleStatus,
    runMode,
    headline,
    limitations: [
      ...baseLim,
      aoiNote,
      'POST /api/carbon/projects/registry and any credit/VIU issuance routes are not invoked from Command Center.',
    ],
    providerLanes: [airLane, minLane, ecoLane, ...staticLanes],
    evidenceRefs,
    openWorkspaceView: VIEW,
    ...(moduleStatus === 'error' ? { errorMessage: bodyPreview('See provider lanes for HTTP or adapter errors.') } : {}),
  };
}
