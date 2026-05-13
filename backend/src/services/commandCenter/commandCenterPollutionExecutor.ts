import type {
  CommandCenterModuleRunResult,
  CommandCenterRunContext,
  CommandCenterRunMode,
  ProviderLaneState,
} from './commandCenterRunTypes';
import { COMMAND_CENTER_WORKSPACE_VIEW } from './commandCenterModuleRegistry';

const VIEW = COMMAND_CENTER_WORKSPACE_VIEW.pollutionAudit;

const CC_POLLUTION_LIMITATIONS = [
  'Command Center pollution result is an evidence lead only.',
  'Facility matching by location/name is not a legal determination.',
  'Full CARB/EPA/Hazardous Waste workspace is required for boundary matching, record reconciliation, and evidence packet generation.',
  'No enforcement, violation, or legal conclusion is made automatically.',
];

const STATUS_TIMEOUT_MS = 18_000;
const HEALTH_TIMEOUT_MS = 12_000;
const SEARCH_TIMEOUT_MS = 22_000;

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

function outcomeFromFetch(
  out: FetchJsonOutcome,
): { kind: 'ok'; body: unknown; rawText: string } | { kind: 'rate_limited'; preview: string } | { kind: 'unavailable'; preview: string } | { kind: 'error'; preview: string } {
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

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function searchQueryFromContext(ctx: CommandCenterRunContext): string {
  const loc = (ctx.locationDescription ?? '').trim();
  const goal = (ctx.goal ?? '').trim();
  const q = loc || goal;
  return q.slice(0, 160);
}

function proximityRadiusKm(ctx: CommandCenterRunContext): number {
  const r = Number.isFinite(ctx.radiusKm) ? ctx.radiusKm : 25;
  return Math.min(Math.max(r, 1), 250);
}

function asRecord(x: unknown): Record<string, unknown> {
  return x && typeof x === 'object' ? (x as Record<string, unknown>) : {};
}

function laneStateFromOk(ok: unknown): ProviderLaneState {
  return ok === true ? 'ok' : 'partial';
}

export async function executePollutionForCommandCenter(
  ctx: CommandCenterRunContext,
  runMode: CommandCenterRunMode,
): Promise<CommandCenterModuleRunResult> {
  const baseLim = CC_POLLUTION_LIMITATIONS;
  const aoiNote =
    'Command Center uses latitude, longitude, and radiusKm for optional distance filtering of catalog rows that include coordinates; CARB/RCRA text search has no lat/lng query parameter — proximity is computed only when coordinates exist on returned records.';

  if (runMode === 'dry_run') {
    return {
      moduleKey: 'pollutionAudit',
      status: 'preview_ready',
      runMode,
      headline: 'Pollution / CARB / EPA — workflow preview (no live carb-data or rcra-data calls from Command Center engine).',
      limitations: [
        ...baseLim,
        aoiNote,
        'Open the CARB / EPA investigation workspace for full reconciliation, satellite context, and evidence packet steps.',
      ],
      providerLanes: [
        {
          id: 'carb-status',
          label: 'GET /api/carb-data/status',
          state: 'preview',
          detail: 'Not invoked from Command Center dry run.',
        },
        {
          id: 'carb-search',
          label: 'GET /api/carb-data/search',
          state: 'preview',
          detail: 'Not invoked from Command Center dry run.',
        },
        {
          id: 'rcra-health',
          label: 'GET /api/rcra-data/health',
          state: 'preview',
          detail: 'Not invoked from Command Center dry run.',
        },
        {
          id: 'rcra-search',
          label: 'GET /api/rcra-data/search',
          state: 'preview',
          detail: 'Not invoked from Command Center dry run.',
        },
        {
          id: 'emissions-audit',
          label: 'GET /api/emissions-audit/* (EIAS)',
          state: 'preview',
          detail: 'Requires authenticated DpalUser — not invoked from Command Center dry run.',
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
  const searchQ = searchQueryFromContext(ctx);
  const radiusKm = proximityRadiusKm(ctx);
  const center = { lat: ctx.latitude, lng: ctx.longitude };

  const statusUrl = `${origin}/api/carb-data/status`;
  const statusFetch = await fetchJson(statusUrl, STATUS_TIMEOUT_MS, 'carb_data_status');
  const statusOutcome = outcomeFromFetch(statusFetch);

  if (statusOutcome.kind === 'unavailable') {
    return {
      moduleKey: 'pollutionAudit',
      status: 'unavailable',
      runMode,
      headline: 'Pollution — GET /api/carb-data/status timed out or network failed.',
      limitations: [...baseLim, aoiNote],
      providerLanes: [{ id: 'carb-status', label: 'GET /api/carb-data/status', state: 'unavailable', detail: statusOutcome.preview }],
      evidenceRefs: [{ id: 'endpoint', label: 'GET /api/carb-data/status' }],
      openWorkspaceView: VIEW,
      errorMessage: statusOutcome.preview,
    };
  }
  if (statusOutcome.kind === 'rate_limited') {
    return {
      moduleKey: 'pollutionAudit',
      status: 'rate_limited',
      runMode,
      headline: 'Pollution — HTTP 429 on CARB data status.',
      limitations: baseLim,
      providerLanes: [{ id: 'carb-status', label: 'GET /api/carb-data/status', state: 'rate_limited', detail: statusOutcome.preview }],
      evidenceRefs: [],
      openWorkspaceView: VIEW,
      errorMessage: statusOutcome.preview,
    };
  }
  if (statusOutcome.kind === 'error') {
    return {
      moduleKey: 'pollutionAudit',
      status: 'error',
      runMode,
      headline: 'Pollution — GET /api/carb-data/status returned an error.',
      limitations: baseLim,
      providerLanes: [{ id: 'carb-status', label: 'GET /api/carb-data/status', state: 'error', detail: statusOutcome.preview }],
      evidenceRefs: [{ id: 'endpoint', label: 'GET /api/carb-data/status' }],
      openWorkspaceView: VIEW,
      errorMessage: statusOutcome.preview,
    };
  }

  const statusBody = asRecord(statusOutcome.body);
  if (statusBody.ok !== true) {
    return {
      moduleKey: 'pollutionAudit',
      status: 'error',
      runMode,
      headline: 'Pollution — GET /api/carb-data/status returned JSON without ok:true.',
      limitations: [...baseLim, aoiNote],
      providerLanes: [{ id: 'carb-status', label: 'GET /api/carb-data/status', state: 'error', detail: bodyPreview(statusOutcome.rawText) }],
      evidenceRefs: [{ id: 'endpoint', label: 'GET /api/carb-data/status' }],
      openWorkspaceView: VIEW,
      errorMessage: bodyPreview(statusOutcome.rawText),
    };
  }

  const carbStatusLane: CommandCenterModuleRunResult['providerLanes'][0] = {
    id: 'carb-status',
    label: 'GET /api/carb-data/status',
    state: laneStateFromOk(statusBody.ok),
    detail: bodyPreview(
      [
        `sourceMode=${String(statusBody.sourceMode ?? '—')}`,
        `datasetLoaded=${Boolean(statusBody.datasetLoaded)}`,
        `recordCount=${typeof statusBody.recordCount === 'number' ? statusBody.recordCount : '—'}`,
        `searchReadiness=${String(statusBody.searchReadiness ?? '—')}`,
        `datasetVersion=${String(statusBody.datasetVersion ?? '—')}`,
        typeof statusBody.retrievalDate === 'string' ? `retrievalDate=${statusBody.retrievalDate}` : '',
      ]
        .filter(Boolean)
        .join(' · '),
      260,
    ),
  };

  const healthUrl = `${origin}/api/rcra-data/health`;
  const healthFetch = await fetchJson(healthUrl, HEALTH_TIMEOUT_MS, 'rcra_data_health');
  const healthOutcome = outcomeFromFetch(healthFetch);

  let rcraHealthLane: CommandCenterModuleRunResult['providerLanes'][0] = {
    id: 'rcra-health',
    label: 'GET /api/rcra-data/health',
    state: 'unknown',
    detail: 'Not fetched.',
  };
  if (healthOutcome.kind === 'ok') {
    const hb = asRecord(healthOutcome.body);
    rcraHealthLane = {
      id: 'rcra-health',
      label: 'GET /api/rcra-data/health',
      state: laneStateFromOk(hb.ok),
      detail: bodyPreview(`ok=${String(hb.ok)} · module=${String(hb.module ?? '')}`, 200),
    };
  } else if (healthOutcome.kind === 'unavailable') {
    rcraHealthLane = { id: 'rcra-health', label: 'GET /api/rcra-data/health', state: 'unavailable', detail: healthOutcome.preview };
  } else if (healthOutcome.kind === 'rate_limited') {
    rcraHealthLane = { id: 'rcra-health', label: 'GET /api/rcra-data/health', state: 'rate_limited', detail: healthOutcome.preview };
  } else {
    rcraHealthLane = { id: 'rcra-health', label: 'GET /api/rcra-data/health', state: 'error', detail: healthOutcome.preview };
  }

  const emissionsLane: CommandCenterModuleRunResult['providerLanes'][0] = {
    id: 'emissions-audit',
    label: 'Emissions Integrity Audit (EIAS)',
    state: 'partial',
    detail: 'GET /api/emissions-audit/* requires DpalUser JWT — not invoked from Command Center engine.',
  };

  let carbSearchLane: CommandCenterModuleRunResult['providerLanes'][0] = {
    id: 'carb-search',
    label: 'GET /api/carb-data/search',
    state: 'pending',
    detail: 'Skipped — add locationDescription or goal (min 2 chars) for text search.',
  };
  let rcraSearchLane: CommandCenterModuleRunResult['providerLanes'][0] = {
    id: 'rcra-search',
    label: 'GET /api/rcra-data/search',
    state: 'pending',
    detail: 'Skipped — add locationDescription or goal (min 2 chars) for text search.',
  };

  type CarbRow = { lat: number | null; lng: number | null; facilityId?: string; arbId?: string; facilityName?: string; reportingYear?: number };
  type RcraRow = { lat: number | null; lng: number | null; epaId?: string; facilityName?: string; reportingYear?: number };

  let carbTextHits = 0;
  let rcraTextHits = 0;
  let carbNear: CarbRow[] = [];
  let rcraNear: RcraRow[] = [];
  let carbSearchMeta = { sourceMode: '', datasetVersion: '', retrievalDate: '', sourceUrl: '' };
  let rcraSearchMeta = { sourceMode: '', datasetVersion: '', retrievalDate: '' };

  if (searchQ.length >= 2) {
    const enc = encodeURIComponent(searchQ);
    const carbSearchUrl = `${origin}/api/carb-data/search?q=${enc}&limit=25`;
    const carbSearchFetch = await fetchJson(carbSearchUrl, SEARCH_TIMEOUT_MS, 'carb_data_search');
    const carbSearchOutcome = outcomeFromFetch(carbSearchFetch);

    if (carbSearchOutcome.kind === 'rate_limited') {
      return {
        moduleKey: 'pollutionAudit',
        status: 'rate_limited',
        runMode,
        headline: 'Pollution — HTTP 429 on CARB data search.',
        limitations: baseLim,
        providerLanes: [carbStatusLane, rcraHealthLane, { id: 'carb-search', label: 'GET /api/carb-data/search', state: 'rate_limited', detail: carbSearchOutcome.preview }, emissionsLane],
        evidenceRefs: [{ id: 'endpoint', label: 'GET /api/carb-data/search' }],
        openWorkspaceView: VIEW,
        errorMessage: carbSearchOutcome.preview,
      };
    }
    if (carbSearchOutcome.kind === 'unavailable') {
      carbSearchLane = {
        id: 'carb-search',
        label: 'GET /api/carb-data/search',
        state: 'unavailable',
        detail: carbSearchOutcome.preview,
      };
    } else if (carbSearchOutcome.kind === 'error') {
      carbSearchLane = {
        id: 'carb-search',
        label: 'GET /api/carb-data/search',
        state: 'error',
        detail: carbSearchOutcome.preview,
      };
    } else {
      const sb = asRecord(carbSearchOutcome.body);
      if (sb.ok !== true) {
        carbSearchLane = {
          id: 'carb-search',
          label: 'GET /api/carb-data/search',
          state: 'error',
          detail: bodyPreview(carbSearchOutcome.rawText),
        };
      } else {
      carbSearchMeta = {
        sourceMode: String(sb.sourceMode ?? ''),
        datasetVersion: String(sb.datasetVersion ?? ''),
        retrievalDate: String(sb.retrievalDate ?? ''),
        sourceUrl: String(sb.sourceUrl ?? ''),
      };
      const results = Array.isArray(sb.results) ? sb.results : [];
      carbTextHits = results.length;
      const withCoords: CarbRow[] = [];
      for (const r of results) {
        const o = asRecord(r);
        const lat = typeof o.latitude === 'number' ? o.latitude : Number(o.latitude);
        const lng = typeof o.longitude === 'number' ? o.longitude : Number(o.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
        if (haversineKm(center, { lat, lng }) <= radiusKm) {
          withCoords.push({
            lat,
            lng,
            facilityId: typeof o.facilityId === 'string' ? o.facilityId : undefined,
            arbId: typeof o.arbId === 'string' ? o.arbId : undefined,
            facilityName: typeof o.facilityName === 'string' ? o.facilityName : undefined,
            reportingYear: typeof o.reportingYear === 'number' ? o.reportingYear : undefined,
          });
        }
      }
      carbNear = withCoords.slice(0, 8);
      carbSearchLane = {
        id: 'carb-search',
        label: 'GET /api/carb-data/search',
        state: 'ok',
        detail: bodyPreview(
          `textHits=${carbTextHits} · withinRadius=${carbNear.length} (coords present & ≤ ${radiusKm} km) · sourceMode=${carbSearchMeta.sourceMode || '—'}`,
          260,
        ),
      };
      }
    }

    const rcraSearchUrl = `${origin}/api/rcra-data/search?q=${enc}&limit=25`;
    const rcraSearchFetch = await fetchJson(rcraSearchUrl, SEARCH_TIMEOUT_MS, 'rcra_data_search');
    const rcraSearchOutcome = outcomeFromFetch(rcraSearchFetch);

    if (rcraSearchOutcome.kind === 'rate_limited') {
      return {
        moduleKey: 'pollutionAudit',
        status: 'rate_limited',
        runMode,
        headline: 'Pollution — HTTP 429 on RCRA data search.',
        limitations: baseLim,
        providerLanes: [
          carbStatusLane,
          rcraHealthLane,
          carbSearchLane,
          { id: 'rcra-search', label: 'GET /api/rcra-data/search', state: 'rate_limited', detail: rcraSearchOutcome.preview },
          emissionsLane,
        ],
        evidenceRefs: [{ id: 'endpoint', label: 'GET /api/rcra-data/search' }],
        openWorkspaceView: VIEW,
        errorMessage: rcraSearchOutcome.preview,
      };
    }
    if (rcraSearchOutcome.kind === 'unavailable') {
      rcraSearchLane = {
        id: 'rcra-search',
        label: 'GET /api/rcra-data/search',
        state: 'unavailable',
        detail: rcraSearchOutcome.preview,
      };
    } else if (rcraSearchOutcome.kind === 'error') {
      rcraSearchLane = {
        id: 'rcra-search',
        label: 'GET /api/rcra-data/search',
        state: 'error',
        detail: rcraSearchOutcome.preview,
      };
    } else {
      const rb = asRecord(rcraSearchOutcome.body);
      if (rb.ok !== true) {
        rcraSearchLane = {
          id: 'rcra-search',
          label: 'GET /api/rcra-data/search',
          state: 'error',
          detail: bodyPreview(rcraSearchOutcome.rawText),
        };
      } else {
      rcraSearchMeta = {
        sourceMode: String(rb.sourceMode ?? ''),
        datasetVersion: String(rb.datasetVersion ?? ''),
        retrievalDate: String(rb.retrievalDate ?? ''),
      };
      const results = Array.isArray(rb.results) ? rb.results : [];
      rcraTextHits = results.length;
      const withCoords: RcraRow[] = [];
      for (const r of results) {
        const o = asRecord(r);
        const lat = typeof o.latitude === 'number' ? o.latitude : Number(o.latitude);
        const lng = typeof o.longitude === 'number' ? o.longitude : Number(o.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
        if (haversineKm(center, { lat, lng }) <= radiusKm) {
          withCoords.push({
            lat,
            lng,
            epaId: typeof o.epaId === 'string' ? o.epaId : undefined,
            facilityName: typeof o.facilityName === 'string' ? o.facilityName : undefined,
            reportingYear: typeof o.reportingYear === 'number' ? o.reportingYear : undefined,
          });
        }
      }
      rcraNear = withCoords.slice(0, 8);
      rcraSearchLane = {
        id: 'rcra-search',
        label: 'GET /api/rcra-data/search',
        state: 'ok',
        detail: bodyPreview(
          `textHits=${rcraTextHits} · withinRadius=${rcraNear.length} (coords present & ≤ ${radiusKm} km) · sourceMode=${rcraSearchMeta.sourceMode || '—'}`,
          260,
        ),
      };
      }
    }
  }

  const datasetLoaded = statusBody.datasetLoaded === true;
  const recordCount = typeof statusBody.recordCount === 'number' ? statusBody.recordCount : 0;
  const needsSource = String(statusBody.sourceMode ?? '') === 'NEEDS_SOURCE' || !datasetLoaded || recordCount === 0;

  const proximityHits = carbNear.length + rcraNear.length;
  const anySearchUnav = carbSearchLane.state === 'unavailable' || rcraSearchLane.state === 'unavailable';
  const rcraHealthBad = rcraHealthLane.state === 'error' || rcraHealthLane.state === 'unavailable';

  let moduleStatus: CommandCenterModuleRunResult['status'] = 'partial';
  if (proximityHits > 0 && datasetLoaded) {
    moduleStatus = 'success';
  }

  const headline =
    moduleStatus === 'success'
      ? 'Pollution — CARB and/or RCRA catalog rows with coordinates fall within the Command Center AOI radius (evidence lead only).'
      : needsSource
        ? 'Pollution — CARB dataset not loaded or needs source; RCRA/CARB catalog lanes are readiness or limited context only.'
        : searchQ.length < 2
          ? 'Pollution — CARB data readiness retrieved; add locationDescription or goal (2+ chars) for CARB/RCRA text search from Command Center.'
          : proximityHits === 0 && (carbTextHits > 0 || rcraTextHits > 0)
            ? 'Pollution — text search returned catalog rows, but none with coordinates inside the AOI radius (or coordinates missing on hits).'
            : anySearchUnav || rcraHealthBad
              ? 'Pollution — readiness and catalog lanes with partial or unavailable network/context (see provider lanes).'
              : 'Pollution — structured CARB readiness and RCRA health/search context (partial evidence lead).';

  const extraLims: string[] = [aoiNote];
  if (searchQ.length < 2) {
    extraLims.push('No CARB/RCRA text search was run — Command Center context did not include a usable locationDescription or goal string.');
  }
  if (needsSource) {
    extraLims.push('CARB sourceMode indicates missing or empty dataset — import or sync official data in the full workspace or admin tools.');
  }
  if (Array.isArray(statusBody.warnings) && statusBody.warnings.length) {
    extraLims.push(`CARB status warnings: ${(statusBody.warnings as unknown[]).filter((w): w is string => typeof w === 'string').join(' · ')}`.slice(0, 400));
  }

  const evidenceRefs: CommandCenterModuleRunResult['evidenceRefs'] = [
    { id: 'endpoint-carb-status', label: 'GET /api/carb-data/status' },
    { id: 'endpoint-rcra-health', label: 'GET /api/rcra-data/health' },
  ];
  if (searchQ.length >= 2) {
    evidenceRefs.push({ id: 'endpoint-carb-search', label: `GET /api/carb-data/search · q length ${searchQ.length}` });
    evidenceRefs.push({ id: 'endpoint-rcra-search', label: `GET /api/rcra-data/search · q length ${searchQ.length}` });
  }
  if (typeof statusBody.retrievalDate === 'string' && statusBody.retrievalDate) {
    evidenceRefs.push({ id: 'carb-status-retrievalDate', label: `CARB status retrievalDate: ${statusBody.retrievalDate}` });
  }
  if (carbSearchMeta.retrievalDate) {
    evidenceRefs.push({ id: 'carb-search-retrievalDate', label: `CARB search retrievalDate: ${carbSearchMeta.retrievalDate}` });
  }
  if (carbSearchMeta.datasetVersion) {
    evidenceRefs.push({ id: 'carb-search-datasetVersion', label: `CARB search datasetVersion: ${carbSearchMeta.datasetVersion}` });
  }
  if (carbSearchMeta.sourceUrl) {
    evidenceRefs.push({ id: 'carb-search-sourceUrl', label: bodyPreview(`CARB sourceUrl: ${carbSearchMeta.sourceUrl}`, 200) });
  }
  if (rcraSearchMeta.datasetVersion) {
    evidenceRefs.push({ id: 'rcra-search-datasetVersion', label: `RCRA search datasetVersion: ${rcraSearchMeta.datasetVersion}` });
  }

  carbNear.slice(0, 3).forEach((row, i) => {
    const id = row.facilityId || row.arbId || 'unknown';
    const name = (row.facilityName ?? 'facility').slice(0, 80);
    evidenceRefs.push({
      id: `carb-near-${i}-${String(id).replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 40)}`,
      label: bodyPreview(`CARB near AOI: ${id} · ${name}${row.reportingYear != null ? ` · year ${row.reportingYear}` : ''}`, 220),
    });
  });
  rcraNear.slice(0, 3).forEach((row, i) => {
    const id = row.epaId || 'unknown';
    const name = (row.facilityName ?? 'facility').slice(0, 80);
    evidenceRefs.push({
      id: `rcra-near-${i}-${String(id).replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 40)}`,
      label: bodyPreview(`RCRA near AOI: ${id} · ${name}${row.reportingYear != null ? ` · year ${row.reportingYear}` : ''}`, 220),
    });
  });

  return {
    moduleKey: 'pollutionAudit',
    status: moduleStatus,
    runMode,
    headline,
    limitations: [...baseLim, ...extraLims],
    providerLanes: [carbStatusLane, rcraHealthLane, carbSearchLane, rcraSearchLane, emissionsLane],
    evidenceRefs,
    openWorkspaceView: VIEW,
  };
}
