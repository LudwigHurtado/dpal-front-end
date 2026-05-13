import { randomBytes } from 'crypto';
import type { CommandCenterModuleKey } from './commandCenterRunTypes';
import {
  ALL_COMMAND_CENTER_MODULE_KEYS,
  isCommandCenterModuleKey,
} from './commandCenterModuleRegistry';
import { buildPendingAdapterResult } from './commandCenterPendingModule';
import { executePlasticWatchForCommandCenter } from './commandCenterPlasticExecutor';
import {
  COMMAND_CENTER_SAFETY_LABELS,
  type CommandCenterRunContext,
  type CommandCenterRunDocument,
  type CommandCenterRunMode,
  type CommandCenterRunStatus,
  type CommandCenterModuleRunResult,
} from './commandCenterRunTypes';

const runs = new Map<string, CommandCenterRunDocument>();

function newRunId(): string {
  return `ccr_${Date.now().toString(36)}_${randomBytes(6).toString('hex')}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function dedupeModules(mods: CommandCenterModuleKey[]): CommandCenterModuleKey[] {
  const seen = new Set<string>();
  const out: CommandCenterModuleKey[] = [];
  for (const m of mods) {
    if (!seen.has(m)) {
      seen.add(m);
      out.push(m);
    }
  }
  return out;
}

function touch(doc: CommandCenterRunDocument): void {
  doc.updatedAtIso = nowIso();
}

function computeFinalStatus(doc: CommandCenterRunDocument): CommandCenterRunStatus {
  if (doc.cancelRequested) return 'canceled';
  const st = doc.results.map((r) => r.status);
  if (!st.length) return 'error';

  const hasGood = st.some((s) => s === 'success' || s === 'partial' || s === 'preview_ready');
  if (st.every((s) => s === 'pending_adapter')) return 'pending_adapter';

  const onlyRateLimited =
    st.every((s) => s === 'rate_limited') || (st.some((s) => s === 'rate_limited') && !hasGood);
  if (onlyRateLimited) return 'rate_limited';

  const hasErr = st.some((s) => s === 'error');
  const hasUnav = st.some((s) => s === 'unavailable');
  if (!hasGood && hasErr) return 'error';
  if (!hasGood && hasUnav && !hasErr) return 'unavailable';

  if (hasGood && st.some((s) => s === 'pending_adapter' || s === 'error' || s === 'unavailable' || s === 'rate_limited')) {
    return 'partial';
  }

  if (st.every((s) => s === 'success')) return 'success';
  if (hasGood) return 'partial';
  return 'partial';
}

export type CreateRunInput = {
  modules: unknown;
  context: unknown;
  runMode: unknown;
};

export type CreateRunParsed =
  | { ok: true; modules: CommandCenterModuleKey[]; context: CommandCenterRunContext; runMode: CommandCenterRunMode }
  | { ok: false; error: string; details?: Record<string, unknown> };

export function parseCreateRunBody(body: CreateRunInput): CreateRunParsed {
  const runMode = body.runMode === 'live' || body.runMode === 'dry_run' ? body.runMode : null;
  if (!runMode) {
    return { ok: false, error: 'invalid_run_mode', details: { expected: ['live', 'dry_run'] } };
  }

  const rawMods = body.modules;
  if (!Array.isArray(rawMods) || rawMods.length === 0) {
    return { ok: false, error: 'invalid_modules', details: { message: 'modules must be a non-empty array of module keys.' } };
  }

  const modules: CommandCenterModuleKey[] = [];
  for (const x of rawMods) {
    if (typeof x !== 'string' || !isCommandCenterModuleKey(x)) {
      return {
        ok: false,
        error: 'invalid_module_key',
        details: { allowed: ALL_COMMAND_CENTER_MODULE_KEYS, received: x },
      };
    }
    modules.push(x);
  }

  const ctx = body.context;
  if (!ctx || typeof ctx !== 'object') {
    return { ok: false, error: 'invalid_context', details: { message: 'context must be an object.' } };
  }
  const c = ctx as Record<string, unknown>;

  const goal = typeof c.goal === 'string' ? c.goal : '';
  const locationDescription = typeof c.locationDescription === 'string' ? c.locationDescription : '';
  const lat = typeof c.latitude === 'number' ? c.latitude : Number(c.latitude);
  const lng = typeof c.longitude === 'number' ? c.longitude : Number(c.longitude);
  const radiusKm = typeof c.radiusKm === 'number' ? c.radiusKm : Number(c.radiusKm);
  const baselineDateIso = typeof c.baselineDateIso === 'string' ? c.baselineDateIso : '';
  const currentDateIso = typeof c.currentDateIso === 'string' ? c.currentDateIso : '';
  const investorDemoFraming = c.investorDemoFraming === true;

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    return { ok: false, error: 'invalid_context', details: { field: 'latitude' } };
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    return { ok: false, error: 'invalid_context', details: { field: 'longitude' } };
  }
  if (!Number.isFinite(radiusKm) || radiusKm <= 0 || radiusKm > 500) {
    return { ok: false, error: 'invalid_context', details: { field: 'radiusKm', max: 500 } };
  }
  if (!baselineDateIso || !currentDateIso) {
    return { ok: false, error: 'invalid_context', details: { fields: ['baselineDateIso', 'currentDateIso'] } };
  }

  const context: CommandCenterRunContext = {
    goal,
    locationDescription,
    latitude: lat,
    longitude: lng,
    radiusKm,
    baselineDateIso,
    currentDateIso,
    investorDemoFraming,
  };

  return { ok: true, modules: dedupeModules(modules), context, runMode };
}

export function getRun(runId: string): CommandCenterRunDocument | undefined {
  return runs.get(runId);
}

export function requestCancel(runId: string): CommandCenterRunDocument | undefined {
  const doc = runs.get(runId);
  if (!doc) return undefined;
  doc.cancelRequested = true;
  if (doc.status === 'queued') {
    doc.status = 'canceled';
    doc.currentStep = 'canceled';
    touch(doc);
  } else if (doc.status === 'running') {
    doc.warnings.push('Cancel requested — engine will stop after the current module step.');
    touch(doc);
  } else {
    touch(doc);
  }
  return doc;
}

async function executeModule(
  moduleKey: CommandCenterModuleKey,
  context: CommandCenterRunContext,
  runMode: CommandCenterRunMode,
): Promise<CommandCenterModuleRunResult> {
  if (moduleKey === 'plasticWatch') {
    return executePlasticWatchForCommandCenter(context, runMode);
  }
  return buildPendingAdapterResult(moduleKey, runMode);
}

async function runExecution(runId: string): Promise<void> {
  const doc = runs.get(runId);
  if (!doc) return;

  if (doc.cancelRequested) {
    doc.status = 'canceled';
    doc.currentStep = 'canceled';
    touch(doc);
    return;
  }

  doc.status = 'running';
  doc.currentStep = 'starting';
  touch(doc);

  const warnings: string[] = [...doc.warnings];
  const results: CommandCenterModuleRunResult[] = [];

  try {
    for (const mod of doc.modules) {
      if (doc.cancelRequested) {
        doc.results = results;
        doc.warnings = warnings;
        doc.status = 'canceled';
        doc.currentStep = 'canceled';
        touch(doc);
        return;
      }
      doc.currentStep = mod;
      touch(doc);

      try {
        const r = await executeModule(mod, doc.context, doc.runMode);
        results.push(r);
      } catch (e) {
        const preview = e instanceof Error ? e.message.slice(0, 280) : String(e).slice(0, 280);
        warnings.push(`${mod}: ${preview}`);
        results.push({
          moduleKey: mod,
          status: 'error',
          runMode: doc.runMode,
          headline: `${mod} — unexpected engine error.`,
          limitations: ['Command Center engine encountered an unexpected failure for this module.'],
          providerLanes: [{ id: 'engine', label: 'Engine', state: 'error', detail: preview }],
          evidenceRefs: [],
          errorMessage: preview,
        });
      }
    }

    doc.results = results;
    doc.warnings = warnings;
    doc.currentStep = 'finalize';
    doc.status = computeFinalStatus(doc);
    touch(doc);
    doc.currentStep = 'done';
    touch(doc);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    warnings.push(`run: ${msg}`);
    doc.warnings = warnings;
    doc.results = results;
    doc.status = 'error';
    doc.currentStep = 'error';
    touch(doc);
  }
}

export function scheduleRunExecution(runId: string): void {
  setImmediate(() => {
    void runExecution(runId);
  });
}

export function createQueuedRun(parsed: {
  modules: CommandCenterModuleKey[];
  context: CommandCenterRunContext;
  runMode: CommandCenterRunMode;
}): CommandCenterRunDocument {
  const runId = newRunId();
  const t = nowIso();
  const doc: CommandCenterRunDocument = {
    runId,
    status: 'queued',
    runMode: parsed.runMode,
    modules: parsed.modules,
    context: parsed.context,
    currentStep: 'queued',
    results: [],
    warnings: [],
    safetyLabels: COMMAND_CENTER_SAFETY_LABELS,
    createdAtIso: t,
    updatedAtIso: t,
    cancelRequested: false,
  };
  runs.set(runId, doc);
  return doc;
}

/** Test hook — clear in-memory runs. */
export function __resetCommandCenterRunsForTests(): void {
  runs.clear();
}
