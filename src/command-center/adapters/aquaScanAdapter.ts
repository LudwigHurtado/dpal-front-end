import { getModuleRegistryEntry } from '../registry/commandCenterModuleRegistry';
import type { CommandCenterModuleRunResult, CommandCenterRunContext, CommandCenterRunMode } from '../types';

export function runWaterAdapter(
  ctx: CommandCenterRunContext,
  opts: { runMode: CommandCenterRunMode },
): Promise<CommandCenterModuleRunResult> {
  const meta = getModuleRegistryEntry('water');
  const base = meta?.defaultLimitations ?? [];
  if (opts.runMode === 'dry_run') {
    return Promise.resolve({
      moduleKey: 'water',
      status: 'preview_ready',
      runMode: opts.runMode,
      headline: 'AquaScan — preview frame only (no live provider batch from Command Center).',
      limitations: [...base, 'Open the AquaScan workspace to execute Copernicus compare and evidence steps for this AOI.'],
      providerLanes: [
        {
          id: 'copernicus',
          label: 'Copernicus / Sentinel-2',
          state: 'unknown',
          detail: 'Not called from Command Center dry run.',
        },
      ],
      evidenceRefs: [{ id: 'aoi', label: `Focus context: ${ctx.latitude.toFixed(5)}, ${ctx.longitude.toFixed(5)} (${ctx.radiusKm} km)` }],
      openWorkspaceView: 'aquaScanWater',
    });
  }
  return Promise.resolve({
    moduleKey: 'water',
    status: 'pending_adapter',
    runMode: opts.runMode,
    headline: 'AquaScan — live batch from Command Center is not wired; use AquaScan workspace.',
    limitations: [...base, 'Cross-module live orchestration stays in each module to avoid hidden provider calls.'],
    providerLanes: [{ id: 'live', label: 'Live path', state: 'unavailable', detail: 'Use module workspace for live runs.' }],
    evidenceRefs: [],
    openWorkspaceView: 'aquaScanWater',
  });
}
