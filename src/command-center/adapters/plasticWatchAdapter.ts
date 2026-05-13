import { API_ROUTES, apiUrl } from '../../../constants';
import type { HyperspectralPlasticScanResponse } from '../../features/hyperspectralPlasticWatch/types';
import { getModuleRegistryEntry } from '../registry/commandCenterModuleRegistry';
import type {
  CommandCenterModuleRunResult,
  CommandCenterModuleStatus,
  CommandCenterRunContext,
  CommandCenterRunMode,
  ProviderLaneStatus,
} from '../types';

function inferEnvironmentType(ctx: CommandCenterRunContext): string {
  const blob = `${ctx.goal} ${ctx.locationDescription}`.toLowerCase();
  if (/coast|bay|ocean|sea|estuary|gulf|pacific|atlantic|mediterranean|manila|philippines|coastal|beach|harbor|port/i.test(blob)) {
    return 'coast';
  }
  return 'river';
}

/** Match Command Center date window to Plastic Watch quick presets (GET query). */
function deriveQuickPreset(ctx: CommandCenterRunContext): string {
  const a = Date.parse(`${ctx.baselineDateIso}T00:00:00Z`);
  const b = Date.parse(`${ctx.currentDateIso}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return '6mo';
  const days = Math.ceil((b - a) / 86400000);
  if (days <= 10) return '7d';
  if (days <= 35) return '30d';
  if (days <= 100) return '3mo';
  return '6mo';
}

function buildPlasticWatchScanGetUrl(ctx: CommandCenterRunContext): string {
  const q = new URLSearchParams();
  q.set('lat', String(ctx.latitude));
  q.set('lng', String(ctx.longitude));
  q.set('radiusKm', String(ctx.radiusKm));
  q.set('baselineDate', ctx.baselineDateIso);
  q.set('currentDate', ctx.currentDateIso);
  q.set('environmentType', inferEnvironmentType(ctx));
  q.set('quickPreset', deriveQuickPreset(ctx));
  return `${apiUrl(API_ROUTES.HYPERSPECTRAL_PLASTIC_SCAN)}?${q.toString()}`;
}

function bodyPreview(text: string, max = 280): string {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

function mapPlasticProviderToLane(
  id: string,
  label: string,
  block: HyperspectralPlasticScanResponse['providers']['pace'] | undefined,
): ProviderLaneStatus {
  if (!block) {
    return { id, label, state: 'unknown', detail: 'No provider block in response.' };
  }
  const st = block.status;
  const sceneCount = block.scenes?.length ?? 0;
  const parts: string[] = [st];
  if (sceneCount) parts.push(`${sceneCount} scene(s)`);
  if (block.sceneDate) parts.push(`sceneDate: ${block.sceneDate}`);
  const firstCloud = block.scenes?.[0]?.cloudCover;
  if (firstCloud != null && Number.isFinite(firstCloud)) parts.push(`first cloud ~${firstCloud}%`);
  if (st === 'rate_limited') return { id, label, state: 'rate_limited', detail: block.message };
  if (st === 'available' && sceneCount > 0) return { id, label, state: 'ok', detail: parts.join(' · ') };
  if (st === 'available' && sceneCount === 0) return { id, label, state: 'partial', detail: block.message || 'No scenes in window.' };
  if (st === 'no_scene' || st === 'not_enabled' || st === 'needs_credentials') {
    return { id, label, state: 'partial', detail: block.message };
  }
  if (st === 'failed' || st === 'auth_error') return { id, label, state: 'error', detail: block.message };
  return { id, label, state: 'partial', detail: block.message || st };
}

function buildEvidenceRefsFromScan(scan: HyperspectralPlasticScanResponse): { id: string; label: string; href?: string }[] {
  const refs: { id: string; label: string; href?: string }[] = [{ id: 'scanId', label: `scanId: ${scan.scanId}` }];
  const pace = scan.providers.pace;
  const emit = scan.providers.emit;
  const paceFirst = pace.scenes?.[0];
  if (paceFirst && 'conceptId' in paceFirst) {
    refs.push({ id: 'pace-scene-0', label: `PACE CMR: ${paceFirst.conceptId} (${paceFirst.startTime})` });
    if ('links' in paceFirst && Array.isArray(paceFirst.links)) {
      const browse = paceFirst.links.find((l: { href: string; rel?: string }) => (l.rel ?? '').includes('browse'));
      if (browse?.href) refs.push({ id: 'pace-browse', label: 'PACE browse image', href: browse.href });
    }
  }
  const emitFirst = emit.scenes?.[0];
  if (emitFirst && 'conceptId' in emitFirst) {
    refs.push({ id: 'emit-scene-0', label: `EMIT CMR: ${emitFirst.conceptId} (${emitFirst.startTime})` });
  }
  return refs;
}

export async function runPlasticWatchAdapter(
  ctx: CommandCenterRunContext,
  opts: { runMode: CommandCenterRunMode },
): Promise<CommandCenterModuleRunResult> {
  const meta = getModuleRegistryEntry('plasticWatch');
  const base = meta?.defaultLimitations ?? [];
  if (opts.runMode === 'dry_run') {
    return {
      moduleKey: 'plasticWatch',
      status: 'preview_ready',
      runMode: opts.runMode,
      headline: 'Plastic Watch — workflow preview (no PACE/EMIT pull from Command Center).',
      limitations: [...base, 'Open Hyperspectral Plastic Watch to run lane checks with honest preview states.'],
      providerLanes: [
        { id: 'pace', label: 'NASA PACE', state: 'preview', detail: 'Not invoked from Command Center dry run.' },
        { id: 'emit', label: 'NASA EMIT', state: 'preview', detail: 'Not invoked from Command Center dry run.' },
      ],
      evidenceRefs: [{ id: 'module', label: 'Spectral screening context only in full workspace' }],
      openWorkspaceView: 'hyperspectralPlasticWatch',
    };
  }

  const mandated = [
    'CMR metadata does not prove plastic presence.',
    'Plastic interpretation requires calibrated spectral processing and field/drone validation.',
  ];

  const url = buildPlasticWatchScanGetUrl(ctx);
  let res: Response;
  try {
    res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      moduleKey: 'plasticWatch',
      status: 'unavailable',
      runMode: opts.runMode,
      headline: 'Plastic Watch — network error calling NASA CMR scan (GET).',
      limitations: [...base, ...mandated, 'Check connectivity and API base (VITE_API_BASE).'],
      providerLanes: [{ id: 'network', label: 'Request', state: 'error', detail: msg }],
      evidenceRefs: [],
      openWorkspaceView: 'hyperspectralPlasticWatch',
      errorMessage: msg,
    };
  }

  if (res.status === 429) {
    await res.text().catch(() => '');
    return {
      moduleKey: 'plasticWatch',
      status: 'rate_limited',
      runMode: opts.runMode,
      headline: 'Plastic Watch — provider rate limited (NASA CMR).',
      limitations: [...base, ...mandated, 'Retry after a short wait or run from full Hyperspectral Plastic Watch workspace.'],
      providerLanes: [{ id: 'cmr', label: 'NASA CMR', state: 'rate_limited', detail: 'HTTP 429' }],
      evidenceRefs: [],
      openWorkspaceView: 'hyperspectralPlasticWatch',
    };
  }

  const rawText = await res.text();
  let parsed: unknown;
  try {
    parsed = rawText ? JSON.parse(rawText) : null;
  } catch {
    return {
      moduleKey: 'plasticWatch',
      status: 'error',
      runMode: opts.runMode,
      headline: `Plastic Watch — invalid JSON (HTTP ${res.status}).`,
      limitations: [...base, ...mandated],
      providerLanes: [{ id: 'parse', label: 'Response', state: 'error', detail: bodyPreview(rawText) }],
      evidenceRefs: [],
      openWorkspaceView: 'hyperspectralPlasticWatch',
      errorMessage: bodyPreview(rawText),
    };
  }

  if (!res.ok) {
    const preview =
      parsed && typeof parsed === 'object' && parsed !== null && 'error' in parsed
        ? String((parsed as Record<string, unknown>).error)
        : bodyPreview(rawText);
    return {
      moduleKey: 'plasticWatch',
      status: 'error',
      runMode: opts.runMode,
      headline: `Plastic Watch — scan failed (HTTP ${res.status}).`,
      limitations: [...base, ...mandated],
      providerLanes: [{ id: 'http', label: 'HTTP', state: 'error', detail: preview }],
      evidenceRefs: [],
      openWorkspaceView: 'hyperspectralPlasticWatch',
      errorMessage: preview,
    };
  }

  const scan = parsed as Partial<HyperspectralPlasticScanResponse> & { ok?: boolean };
  if (scan.ok !== true || !scan.scanId || !scan.providers) {
    return {
      moduleKey: 'plasticWatch',
      status: 'error',
      runMode: opts.runMode,
      headline: 'Plastic Watch — unexpected scan response shape.',
      limitations: [...base, ...mandated],
      providerLanes: [{ id: 'contract', label: 'Response', state: 'error', detail: bodyPreview(rawText) }],
      evidenceRefs: [],
      openWorkspaceView: 'hyperspectralPlasticWatch',
      errorMessage: bodyPreview(rawText),
    };
  }

  const full = scan as HyperspectralPlasticScanResponse;
  const pace = full.providers.pace;
  const emit = full.providers.emit;
  const paceScenes = pace.scenes?.length ?? 0;
  const emitScenes = emit.scenes?.length ?? 0;
  const paceOk = pace.status === 'available' && paceScenes > 0;
  const emitOk = emit.status === 'available' && emitScenes > 0;
  const anyMetadata = paceOk || emitOk;
  const moduleStatus: CommandCenterModuleStatus = paceOk && emitOk ? 'success' : anyMetadata ? 'partial' : 'partial';

  const paceLane = mapPlasticProviderToLane('pace', 'NASA PACE (CMR)', pace);
  const emitLane = mapPlasticProviderToLane('emit', 'NASA EMIT (CMR)', emit);

  const headline = anyMetadata
    ? `Live PACE/NASA CMR metadata returned (${paceScenes} PACE / ${emitScenes} EMIT scene rows). Evidence leads only — not plastic detection.`
    : 'Live scan returned OK but narrow-band CMR scene lists are empty or disabled — check provider status in workspace.';

  return {
    moduleKey: 'plasticWatch',
    status: moduleStatus,
    runMode: opts.runMode,
    headline,
    limitations: [...new Set([...mandated, ...(full.limitations ?? []), ...base])],
    providerLanes: [paceLane, emitLane],
    evidenceRefs: buildEvidenceRefsFromScan(full),
    openWorkspaceView: 'hyperspectralPlasticWatch',
  };
}
