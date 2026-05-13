import { getModuleRegistryEntry } from '../registry/commandCenterModuleRegistry';
import type { CommandCenterModuleRunResult, CommandCenterRunContext, CommandCenterRunMode } from '../types';

export function runPollutionAuditAdapter(
  _ctx: CommandCenterRunContext,
  opts: { runMode: CommandCenterRunMode },
): Promise<CommandCenterModuleRunResult> {
  const meta = getModuleRegistryEntry('pollutionAudit');
  const base = meta?.defaultLimitations ?? [];
  if (opts.runMode === 'dry_run') {
    return Promise.resolve({
      moduleKey: 'pollutionAudit',
      status: 'preview_ready',
      runMode: opts.runMode,
      headline: 'Pollution audit — CARB/EPA workspace handoff (no facility query from Command Center).',
      limitations: [...base, 'Open CARB / EPA emissions audit to select facility and run investigation.'],
      providerLanes: [
        { id: 'carb', label: 'CARB facility data', state: 'unknown', detail: 'Not invoked from Command Center dry run.' },
        { id: 'epa', label: 'EPA / GHGRP', state: 'unknown', detail: 'Not invoked from Command Center dry run.' },
      ],
      evidenceRefs: [{ id: 'audit', label: 'Audit packet assembly lives in CARB workspace' }],
      openWorkspaceView: 'carbEmissionsAudit',
    });
  }
  return Promise.resolve({
    moduleKey: 'pollutionAudit',
    status: 'pending_adapter',
    runMode: opts.runMode,
    headline: 'Pollution audit — live from Command Center not wired.',
    limitations: base,
    providerLanes: [{ id: 'live', label: 'Live', state: 'pending', detail: 'Use CARB / EPA workspace for facility live queries.' }],
    evidenceRefs: [],
    openWorkspaceView: 'carbEmissionsAudit',
  });
}
