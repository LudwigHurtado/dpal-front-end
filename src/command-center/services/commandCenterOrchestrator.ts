import { runWaterAdapter } from '../adapters/aquaScanAdapter';
import { runCarbonViuAdapter } from '../adapters/carbonViuAdapter';
import { runEarthObservationAdapter } from '../adapters/earthObservationAdapter';
import { runForestIntegrityAdapter } from '../adapters/forestIntegrityAdapter';
import { runPlasticWatchAdapter } from '../adapters/plasticWatchAdapter';
import { runPollutionAuditAdapter } from '../adapters/pollutionAuditAdapter';
import { runSituationRoomAdapter } from '../adapters/situationRoomAdapter';
import type {
  CommandCenterModuleKey,
  CommandCenterModuleRunResult,
  CommandCenterOrchestrationResult,
  CommandCenterRunContext,
  CommandCenterRunMode,
} from '../types';

function dispatchAdapter(
  key: CommandCenterModuleKey,
  ctx: CommandCenterRunContext,
  runMode: CommandCenterRunMode,
): Promise<CommandCenterModuleRunResult> {
  switch (key) {
    case 'water':
      return runWaterAdapter(ctx, { runMode });
    case 'earthObservation':
      return runEarthObservationAdapter(ctx, { runMode });
    case 'plasticWatch':
      return runPlasticWatchAdapter(ctx, { runMode });
    case 'forestIntegrity':
      return runForestIntegrityAdapter(ctx, { runMode });
    case 'pollutionAudit':
      return runPollutionAuditAdapter(ctx, { runMode });
    case 'carbonViu':
      return runCarbonViuAdapter(ctx, { runMode });
    case 'situationRoom':
      return runSituationRoomAdapter(ctx, { runMode });
    default: {
      const _exhaustive: never = key;
      return Promise.reject(new Error(`Unknown module: ${_exhaustive}`));
    }
  }
}

/**
 * Runs selected modules with Promise.allSettled so one failure does not reject the batch.
 */
export async function runCommandCenterOrchestration(opts: {
  modules: CommandCenterModuleKey[];
  context: CommandCenterRunContext;
  runMode: CommandCenterRunMode;
}): Promise<CommandCenterOrchestrationResult> {
  const { modules, context, runMode } = opts;
  const warnings: string[] = [];
  const settled = await Promise.allSettled(modules.map((k) => dispatchAdapter(k, context, runMode)));
  const results: CommandCenterModuleRunResult[] = [];
  settled.forEach((out, i) => {
    const key = modules[i];
    if (out.status === 'fulfilled') {
      results.push(out.value);
    } else {
      warnings.push(`${key}: ${out.reason instanceof Error ? out.reason.message : String(out.reason)}`);
      results.push({
        moduleKey: key,
        status: 'error',
        runMode,
        headline: `${key} — adapter error`,
        limitations: ['Adapter rejected before returning structured preview.'],
        providerLanes: [{ id: 'error', label: 'Error', state: 'error', detail: warnings[warnings.length - 1] }],
        evidenceRefs: [],
        errorMessage: warnings[warnings.length - 1],
      });
    }
  });
  return {
    context,
    runMode,
    modules,
    settledAtIso: new Date().toISOString(),
    results,
    orchestrationWarnings: warnings,
  };
}
