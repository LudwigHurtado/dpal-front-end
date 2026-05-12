import { getModuleRegistryEntry } from '../registry/commandCenterModuleRegistry';
import type { CommandCenterModuleRunResult, CommandCenterRunContext, CommandCenterRunMode } from '../types';

export function runEarthObservationAdapter(
  ctx: CommandCenterRunContext,
  opts: { runMode: CommandCenterRunMode },
): Promise<CommandCenterModuleRunResult> {
  const meta = getModuleRegistryEntry('earthObservation');
  const base = meta?.defaultLimitations ?? [];
  if (opts.runMode === 'dry_run') {
    return Promise.resolve({
      moduleKey: 'earthObservation',
      status: 'preview_ready',
      runMode: opts.runMode,
      headline: 'Earth Observation — preview checklist (no POST /api/earth-observation/scan from here).',
      limitations: [
        ...base,
        'Open Earth Observation to run Landsat screening for the selected date window.',
      ],
      providerLanes: [
        { id: 'pc', label: 'Planetary Computer / Landsat', state: 'unknown', detail: 'Not invoked from Command Center dry run.' },
      ],
      evidenceRefs: [
        {
          id: 'window',
          label: `Date window: ${ctx.baselineDateIso} → ${ctx.currentDateIso}`,
        },
      ],
      openWorkspaceView: 'earthObservation',
    });
  }
  return Promise.resolve({
    moduleKey: 'earthObservation',
    status: 'pending_adapter',
    runMode: opts.runMode,
    headline: 'Earth Observation — use workspace for live scan.',
    limitations: base,
    providerLanes: [{ id: 'live', label: 'Live scan', state: 'unavailable', detail: 'Run inside Earth Observation view.' }],
    evidenceRefs: [],
    openWorkspaceView: 'earthObservation',
  });
}
