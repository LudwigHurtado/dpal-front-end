import { getModuleRegistryEntry } from '../registry/commandCenterModuleRegistry';
import type { CommandCenterModuleRunResult, CommandCenterRunContext, CommandCenterRunMode } from '../types';

export function runForestIntegrityAdapter(
  _ctx: CommandCenterRunContext,
  opts: { runMode: CommandCenterRunMode },
): Promise<CommandCenterModuleRunResult> {
  const meta = getModuleRegistryEntry('forestIntegrity');
  const base = meta?.defaultLimitations ?? [];
  if (opts.runMode === 'dry_run') {
    return Promise.resolve({
      moduleKey: 'forestIntegrity',
      status: 'preview_ready',
      runMode: opts.runMode,
      headline: 'Forest Integrity — preview frame (no GFW/FIRMS batch from Command Center).',
      limitations: [...base, 'Open Forest Integrity for map-driven alert and FIRMS context.'],
      providerLanes: [
        { id: 'gfw', label: 'Global Forest Watch', state: 'unknown', detail: 'Not invoked from Command Center dry run.' },
        { id: 'firms', label: 'NASA FIRMS', state: 'unknown', detail: 'Not invoked from Command Center dry run.' },
      ],
      evidenceRefs: [{ id: 'fi', label: 'Forest integrity packet steps available in workspace' }],
      openWorkspaceView: 'forestIntegrity',
    });
  }
  return Promise.resolve({
    moduleKey: 'forestIntegrity',
    status: 'pending_adapter',
    runMode: opts.runMode,
    headline: 'Forest Integrity — use workspace for live lanes.',
    limitations: base,
    providerLanes: [{ id: 'live', label: 'Live', state: 'pending', detail: 'Use Forest Integrity workspace for GFW/FIRMS lanes.' }],
    evidenceRefs: [],
    openWorkspaceView: 'forestIntegrity',
  });
}
