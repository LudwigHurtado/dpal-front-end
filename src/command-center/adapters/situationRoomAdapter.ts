import { getModuleRegistryEntry } from '../registry/commandCenterModuleRegistry';
import type { CommandCenterModuleRunResult, CommandCenterRunContext, CommandCenterRunMode } from '../types';

export function runSituationRoomAdapter(
  _ctx: CommandCenterRunContext,
  opts: { runMode: CommandCenterRunMode },
): Promise<CommandCenterModuleRunResult> {
  const meta = getModuleRegistryEntry('situationRoom');
  const base = meta?.defaultLimitations ?? [];
  if (opts.runMode === 'dry_run') {
    return Promise.resolve({
      moduleKey: 'situationRoom',
      status: 'preview_ready',
      runMode: opts.runMode,
      headline: 'Situation Room — collaboration handoff placeholder.',
      limitations: [...base, 'Attach evidence from module workspaces before publishing any thread.'],
      providerLanes: [{ id: 'room', label: 'Situation Room', state: 'preview', detail: 'Dry run — no room created.' }],
      evidenceRefs: [{ id: 'handoff', label: 'Use Situation Room after module evidence is ready' }],
      openWorkspaceView: 'situationRoom',
    });
  }
  return Promise.resolve({
    moduleKey: 'situationRoom',
    status: 'pending_adapter',
    runMode: opts.runMode,
    headline: 'Situation Room — open workspace to attach live context.',
    limitations: base,
    providerLanes: [{ id: 'live', label: 'Live', state: 'pending', detail: 'Create or open a room from the Situation Room view.' }],
    evidenceRefs: [],
    openWorkspaceView: 'situationRoom',
  });
}
