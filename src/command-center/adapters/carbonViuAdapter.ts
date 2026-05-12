import { getModuleRegistryEntry } from '../registry/commandCenterModuleRegistry';
import type { CommandCenterModuleRunResult, CommandCenterRunContext, CommandCenterRunMode } from '../types';

export function runCarbonViuAdapter(
  _ctx: CommandCenterRunContext,
  opts: { runMode: CommandCenterRunMode },
): Promise<CommandCenterModuleRunResult> {
  const meta = getModuleRegistryEntry('carbonViu');
  const base = meta?.defaultLimitations ?? [];
  if (opts.runMode === 'dry_run') {
    return Promise.resolve({
      moduleKey: 'carbonViu',
      status: 'preview_ready',
      runMode: opts.runMode,
      headline: 'Carbon MRV — context preview (no automatic credits or VIUs).',
      limitations: [...base, 'Open Carbon MRV for project-scoped scans and validator context.'],
      providerLanes: [
        { id: 'mrv', label: 'MRV adapters', state: 'unknown', detail: 'Not invoked from Command Center dry run.' },
      ],
      evidenceRefs: [{ id: 'carbon', label: 'Credit and VIU flows require explicit human steps in Carbon MRV' }],
      openWorkspaceView: 'carbonMRV',
    });
  }
  return Promise.resolve({
    moduleKey: 'carbonViu',
    status: 'pending_adapter',
    runMode: opts.runMode,
    headline: 'Carbon MRV — live batch from Command Center not wired.',
    limitations: base,
    providerLanes: [{ id: 'live', label: 'Live', state: 'unavailable' }],
    evidenceRefs: [],
    openWorkspaceView: 'carbonMRV',
  });
}
