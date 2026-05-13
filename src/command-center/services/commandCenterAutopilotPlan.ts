import { COMMAND_CENTER_MODULE_REGISTRY } from '../registry/commandCenterModuleRegistry';
import type {
  CommandCenterModuleKey,
  CommandCenterModuleRunResult,
  CommandCenterOrchestrationResult,
} from '../types';

const MODULE_ORDER = COMMAND_CENTER_MODULE_REGISTRY.map((r) => r.key);

/** Module execution order inside autopilot (matches product narrative). */
const AUTOPILOT_MODULE_SEQUENCE: CommandCenterModuleKey[] = [
  'plasticWatch',
  'water',
  'earthObservation',
  'forestIntegrity',
  'pollutionAudit',
  'carbonViu',
  'situationRoom',
];

export type AutopilotMachineState = 'idle' | 'queued' | 'running' | 'paused' | 'completed' | 'stopped' | 'error';

export type AutopilotStepKind = 'validate' | 'module' | 'evidence' | 'nextActions';

export type AutopilotStep = {
  id: string;
  label: string;
  kind: AutopilotStepKind;
  module?: CommandCenterModuleKey;
};

export function buildAutopilotSteps(selected: CommandCenterModuleKey[]): AutopilotStep[] {
  const selectedSet = new Set(selected);
  const steps: AutopilotStep[] = [{ id: 'validate', label: 'Validate location and AOI', kind: 'validate' }];
  for (const m of AUTOPILOT_MODULE_SEQUENCE) {
    if (!selectedSet.has(m)) continue;
    const entry = COMMAND_CENTER_MODULE_REGISTRY.find((r) => r.key === m);
    steps.push({
      id: `module-${m}`,
      label: `Run ${entry?.shortLabel ?? m}`,
      kind: 'module',
      module: m,
    });
  }
  steps.push({ id: 'evidence', label: 'Build evidence packet preview', kind: 'evidence' });
  steps.push({ id: 'next-actions', label: 'Show next actions', kind: 'nextActions' });
  return steps;
}

/** Merge per-module orchestration chunks from sequential autopilot steps (latest result wins per module key). */
export function mergeOrchestrationChunks(
  prev: CommandCenterOrchestrationResult | null,
  chunk: CommandCenterOrchestrationResult,
): CommandCenterOrchestrationResult {
  if (!prev) {
    return {
      ...chunk,
      modules: [...chunk.modules],
      results: [...chunk.results],
      orchestrationWarnings: [...chunk.orchestrationWarnings],
    };
  }
  const byKey = new Map<CommandCenterModuleKey, CommandCenterModuleRunResult>();
  for (const r of prev.results) byKey.set(r.moduleKey, r);
  for (const r of chunk.results) byKey.set(r.moduleKey, r);
  const results = MODULE_ORDER.map((k) => byKey.get(k)).filter((x): x is CommandCenterModuleRunResult => x != null);
  return {
    context: chunk.context,
    runMode: chunk.runMode,
    modules: [...new Set([...prev.modules, ...chunk.modules])],
    settledAtIso: chunk.settledAtIso,
    results,
    orchestrationWarnings: [...prev.orchestrationWarnings, ...chunk.orchestrationWarnings],
  };
}
