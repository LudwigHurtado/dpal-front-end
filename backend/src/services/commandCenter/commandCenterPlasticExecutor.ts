import {
  runHyperspectralPlasticScan,
  type HyperspectralPlasticScanResponse,
  type PlasticScanInput,
} from '../hyperspectralPlasticService';
import { normalizePlasticEnvironmentType } from '../hyperspectral/plasticEnvironment';
import type {
  CommandCenterModuleRunResult,
  CommandCenterRunContext,
  CommandCenterRunMode,
} from './commandCenterRunTypes';
import { COMMAND_CENTER_WORKSPACE_VIEW } from './commandCenterModuleRegistry';

const PLASTIC_REGISTRY_LIMITATIONS = [
  'Evidence-support only — satellite anomalies are not proof of plastic without field validation.',
];

const MANDATED_LIMITATIONS = [
  'CMR metadata does not prove plastic presence.',
  'Plastic interpretation requires calibrated spectral processing and field/drone validation.',
];

const PLASTIC_SCAN_TIMEOUT_MS = 95_000;

function inferEnvironmentType(ctx: CommandCenterRunContext): string {
  const blob = `${ctx.goal} ${ctx.locationDescription}`.toLowerCase();
  if (
    /coast|bay|ocean|sea|estuary|gulf|pacific|atlantic|mediterranean|manila|philippines|coastal|beach|harbor|port/i.test(
      blob,
    )
  ) {
    return 'coast';
  }
  return 'river';
}

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

function bodyPreview(text: string, max = 280): string {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

function mapPlasticProviderToLane(
  id: string,
  label: string,
  block: HyperspectralPlasticScanResponse['providers']['pace'] | undefined,
): CommandCenterModuleRunResult['providerLanes'][0] {
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

function buildEvidenceRefsFromScan(scan: HyperspectralPlasticScanResponse): CommandCenterModuleRunResult['evidenceRefs'] {
  const refs: CommandCenterModuleRunResult['evidenceRefs'] = [{ id: 'scanId', label: `scanId: ${scan.scanId}` }];
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

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout:${label}`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

function classifyPlasticFailure(err: unknown): { kind: 'unavailable' | 'rate_limited' | 'error'; preview: string } {
  const msg = err instanceof Error ? err.message : String(err);
  const low = msg.toLowerCase();
  if (low.includes('timeout:') || low.includes('etimedout') || low.includes('econnreset') || low.includes('socket')) {
    return { kind: 'unavailable', preview: bodyPreview(msg) };
  }
  if (low.includes('429') || low.includes('rate_limited') || low.includes('rate limit')) {
    return { kind: 'rate_limited', preview: bodyPreview(msg) };
  }
  return { kind: 'error', preview: bodyPreview(msg) };
}

export async function executePlasticWatchForCommandCenter(
  ctx: CommandCenterRunContext,
  runMode: CommandCenterRunMode,
): Promise<CommandCenterModuleRunResult> {
  const base = PLASTIC_REGISTRY_LIMITATIONS;
  const view = COMMAND_CENTER_WORKSPACE_VIEW.plasticWatch;

  if (runMode === 'dry_run') {
    return {
      moduleKey: 'plasticWatch',
      status: 'preview_ready',
      runMode,
      headline: 'Plastic Watch — workflow preview (no PACE/EMIT pull from Command Center engine).',
      limitations: [...base, 'Open Hyperspectral Plastic Watch to run lane checks with honest preview states.'],
      providerLanes: [
        { id: 'pace', label: 'NASA PACE', state: 'preview', detail: 'Not invoked from Command Center dry run.' },
        { id: 'emit', label: 'NASA EMIT', state: 'preview', detail: 'Not invoked from Command Center dry run.' },
      ],
      evidenceRefs: [{ id: 'module', label: 'Spectral screening context only in full workspace' }],
      openWorkspaceView: view,
    };
  }

  const input: PlasticScanInput = {
    lat: ctx.latitude,
    lng: ctx.longitude,
    radiusKm: ctx.radiusKm,
    baselineDate: ctx.baselineDateIso,
    currentDate: ctx.currentDateIso,
    environmentType: normalizePlasticEnvironmentType(inferEnvironmentType(ctx)),
    quickPreset: deriveQuickPreset(ctx),
    label: ctx.locationDescription?.trim().slice(0, 160) || undefined,
    compactScenes: true,
    includeFullSceneLinks: true,
  };

  let full: HyperspectralPlasticScanResponse;
  try {
    full = await withTimeout(runHyperspectralPlasticScan(input), PLASTIC_SCAN_TIMEOUT_MS, 'plastic_scan');
  } catch (e) {
    const { kind, preview } = classifyPlasticFailure(e);
    if (kind === 'unavailable') {
      return {
        moduleKey: 'plasticWatch',
        status: 'unavailable',
        runMode,
        headline: 'Plastic Watch — scan timed out or network failed before NASA CMR pipeline completed.',
        limitations: [...base, ...MANDATED_LIMITATIONS, 'Retry with a narrower date window or verify API host connectivity.'],
        providerLanes: [{ id: 'pipeline', label: 'Scan pipeline', state: 'unavailable', detail: preview }],
        evidenceRefs: [],
        openWorkspaceView: view,
        errorMessage: preview,
      };
    }
    if (kind === 'rate_limited') {
      return {
        moduleKey: 'plasticWatch',
        status: 'rate_limited',
        runMode,
        headline: 'Plastic Watch — provider rate limited (NASA CMR or upstream).',
        limitations: [...base, ...MANDATED_LIMITATIONS, 'Retry after a short wait or run from full Hyperspectral Plastic Watch workspace.'],
        providerLanes: [{ id: 'cmr', label: 'NASA CMR / upstream', state: 'rate_limited', detail: preview }],
        evidenceRefs: [],
        openWorkspaceView: view,
        errorMessage: preview,
      };
    }
    return {
      moduleKey: 'plasticWatch',
      status: 'error',
      runMode,
      headline: 'Plastic Watch — scan failed in Command Center engine.',
      limitations: [...base, ...MANDATED_LIMITATIONS],
      providerLanes: [{ id: 'pipeline', label: 'Scan pipeline', state: 'error', detail: preview }],
      evidenceRefs: [],
      openWorkspaceView: view,
      errorMessage: preview,
    };
  }

  const pace = full.providers.pace;
  const emit = full.providers.emit;
  const paceScenes = pace.scenes?.length ?? 0;
  const emitScenes = emit.scenes?.length ?? 0;
  const paceOk = pace.status === 'available' && paceScenes > 0;
  const emitOk = emit.status === 'available' && emitScenes > 0;
  const anyMetadata = paceOk || emitOk;

  if (pace.status === 'rate_limited' || emit.status === 'rate_limited') {
    if (!anyMetadata) {
      return {
        moduleKey: 'plasticWatch',
        status: 'rate_limited',
        runMode,
        headline: 'Plastic Watch — NASA CMR rate limited; no usable scene rows in this window.',
        limitations: [...new Set([...MANDATED_LIMITATIONS, ...base, ...(full.limitations ?? [])])],
        providerLanes: [mapPlasticProviderToLane('pace', 'NASA PACE (CMR)', pace), mapPlasticProviderToLane('emit', 'NASA EMIT (CMR)', emit)],
        evidenceRefs: buildEvidenceRefsFromScan(full),
        openWorkspaceView: view,
      };
    }
  }

  const paceLane = mapPlasticProviderToLane('pace', 'NASA PACE (CMR)', pace);
  const emitLane = mapPlasticProviderToLane('emit', 'NASA EMIT (CMR)', emit);

  const moduleStatus: CommandCenterModuleRunResult['status'] =
    paceOk && emitOk ? 'success' : anyMetadata ? 'partial' : 'partial';

  const headline = anyMetadata
    ? `Live PACE/NASA CMR metadata returned (${paceScenes} PACE / ${emitScenes} EMIT scene rows). Evidence leads only — not plastic detection.`
    : 'Live scan returned OK but narrow-band CMR scene lists are empty or disabled — check provider status in workspace.';

  return {
    moduleKey: 'plasticWatch',
    status: moduleStatus,
    runMode,
    headline,
    limitations: [...new Set([...MANDATED_LIMITATIONS, ...(full.limitations ?? []), ...base])],
    providerLanes: [paceLane, emitLane],
    evidenceRefs: buildEvidenceRefsFromScan(full),
    openWorkspaceView: view,
  };
}
