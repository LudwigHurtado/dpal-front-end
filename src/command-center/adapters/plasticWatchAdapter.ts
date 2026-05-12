import { getModuleRegistryEntry } from '../registry/commandCenterModuleRegistry';
import type { CommandCenterModuleRunResult, CommandCenterRunContext, CommandCenterRunMode } from '../types';

export function runPlasticWatchAdapter(
  _ctx: CommandCenterRunContext,
  opts: { runMode: CommandCenterRunMode },
): Promise<CommandCenterModuleRunResult> {
  const meta = getModuleRegistryEntry('plasticWatch');
  const base = meta?.defaultLimitations ?? [];
  if (opts.runMode === 'dry_run') {
    return Promise.resolve({
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
    });
  }
  return Promise.resolve({
    moduleKey: 'plasticWatch',
    status: 'pending_adapter',
    runMode: opts.runMode,
    headline: 'Plastic Watch — live from Command Center not wired.',
    limitations: base,
    providerLanes: [{ id: 'live', label: 'Live', state: 'unavailable' }],
    evidenceRefs: [],
    openWorkspaceView: 'hyperspectralPlasticWatch',
  });
}
